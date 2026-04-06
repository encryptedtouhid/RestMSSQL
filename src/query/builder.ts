import type {
  FilterNode,
  ODataQuery,
  OrderByOption,
  PaginationOption,
  SelectOption,
} from '../odata/types.js';
import type { TableInfo } from '../introspection/types.js';
import { quoteIdentifier, quoteTableName } from './sanitizer.js';
import { BadRequestError } from '../utils/errors.js';

export interface SqlQuery {
  sql: string;
  parameters: Map<string, unknown>;
}

export interface QueryContext {
  paramCounter: number;
  parameters: Map<string, unknown>;
}

function newContext(): QueryContext {
  return { paramCounter: 0, parameters: new Map() };
}

function addParam(ctx: QueryContext, value: unknown): string {
  const name = `p${ctx.paramCounter++}`;
  ctx.parameters.set(name, value);
  return `@${name}`;
}

export function buildSelectQuery(
  table: TableInfo,
  query: ODataQuery,
  defaultPageSize: number,
): SqlQuery {
  const ctx = newContext();
  const tableName = quoteTableName(table.schema, table.name);

  const selectClause = buildSelectClause(table, query.select);
  const whereClause = query.filter ? buildWhereClause(query.filter, table, ctx) : '';
  const orderByClause = buildOrderByClause(query.orderBy, table);
  const paginationClause = buildPaginationClause(
    query.pagination,
    defaultPageSize,
    !!orderByClause,
  );

  const topPart = paginationClause.topClause ? `${paginationClause.topClause} ` : '';
  let sql = `SELECT ${topPart}${selectClause} FROM ${tableName}`;
  if (whereClause) sql += ` WHERE ${whereClause}`;
  if (orderByClause) sql += ` ORDER BY ${orderByClause}`;
  if (paginationClause.offsetClause) sql += ` ${paginationClause.offsetClause}`;

  return { sql, parameters: ctx.parameters };
}

export function buildCountQuery(table: TableInfo, query: ODataQuery): SqlQuery {
  const ctx = newContext();
  const tableName = quoteTableName(table.schema, table.name);
  const whereClause = query.filter ? buildWhereClause(query.filter, table, ctx) : '';

  let sql = `SELECT COUNT(*) AS [count] FROM ${tableName}`;
  if (whereClause) sql += ` WHERE ${whereClause}`;

  return { sql, parameters: ctx.parameters };
}

export function buildSingleRowQuery(table: TableInfo, pkValues: Map<string, string>): SqlQuery {
  const ctx = newContext();
  const tableName = quoteTableName(table.schema, table.name);

  const conditions = Array.from(pkValues.entries()).map(([col, val]) => {
    validateColumnExists(col, table);
    const paramName = addParam(ctx, val);
    return `${quoteIdentifier(col)} = ${paramName}`;
  });

  const sql = `SELECT * FROM ${tableName} WHERE ${conditions.join(' AND ')}`;
  return { sql, parameters: ctx.parameters };
}

function buildSelectClause(table: TableInfo, select?: SelectOption): string {
  if (!select) return '*';

  for (const col of select.columns) {
    validateColumnExists(col, table);
  }

  return select.columns.map(quoteIdentifier).join(', ');
}

function buildOrderByClause(orderBy: OrderByOption | undefined, table: TableInfo): string {
  if (!orderBy) return '';

  return orderBy.items
    .map((item) => {
      validateColumnExists(item.column, table);
      return `${quoteIdentifier(item.column)} ${item.direction.toUpperCase()}`;
    })
    .join(', ');
}

interface PaginationResult {
  topClause: string;
  offsetClause: string;
}

function buildPaginationClause(
  pagination: PaginationOption | undefined,
  defaultPageSize: number,
  hasOrderBy: boolean,
): PaginationResult {
  const top = pagination?.top ?? defaultPageSize;
  const skip = pagination?.skip ?? 0;

  if (hasOrderBy) {
    return { topClause: '', offsetClause: `OFFSET ${skip} ROWS FETCH NEXT ${top} ROWS ONLY` };
  }

  // No ORDER BY: use TOP (OFFSET/FETCH requires ORDER BY)
  return { topClause: `TOP ${top}`, offsetClause: '' };
}

export function buildWhereClause(node: FilterNode, table: TableInfo, ctx: QueryContext): string {
  switch (node.type) {
    case 'comparison': {
      const left = buildFilterExpression(node.left, table, ctx);
      const right = buildFilterExpression(node.right, table, ctx);

      if (node.right.type === 'literal' && node.right.value === null) {
        return node.operator === 'eq' ? `${left} IS NULL` : `${left} IS NOT NULL`;
      }

      const opMap: Record<string, string> = {
        eq: '=',
        ne: '!=',
        gt: '>',
        ge: '>=',
        lt: '<',
        le: '<=',
      };
      return `${left} ${opMap[node.operator]} ${right}`;
    }

    case 'logical':
      return `(${buildWhereClause(node.left, table, ctx)} ${node.operator.toUpperCase()} ${buildWhereClause(node.right, table, ctx)})`;

    case 'not':
      return `NOT (${buildWhereClause(node.operand, table, ctx)})`;

    case 'function':
      return buildFunctionCall(node.name, node.args, table, ctx);

    case 'property':
      validateColumnExists(node.name, table);
      return quoteIdentifier(node.name);

    case 'literal':
      return addParam(ctx, node.value);
  }
}

function buildFilterExpression(node: FilterNode, table: TableInfo, ctx: QueryContext): string {
  switch (node.type) {
    case 'property':
      validateColumnExists(node.name, table);
      return quoteIdentifier(node.name);

    case 'literal':
      if (node.value === null) return 'NULL';
      return addParam(ctx, node.value);

    case 'function':
      return buildFunctionCall(node.name, node.args, table, ctx);

    default:
      return buildWhereClause(node, table, ctx);
  }
}

function buildFunctionCall(
  name: string,
  args: FilterNode[],
  table: TableInfo,
  ctx: QueryContext,
): string {
  const builtArgs = args.map((arg) => buildFilterExpression(arg, table, ctx));

  switch (name) {
    case 'contains':
      return `${builtArgs[0]} LIKE '%' + REPLACE(REPLACE(REPLACE(${builtArgs[1]}, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%'`;
    case 'startswith':
      return `${builtArgs[0]} LIKE REPLACE(REPLACE(REPLACE(${builtArgs[1]}, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%'`;
    case 'endswith':
      return `${builtArgs[0]} LIKE '%' + REPLACE(REPLACE(REPLACE(${builtArgs[1]}, '[', '[[]'), '%', '[%]'), '_', '[_]')`;
    case 'tolower':
      return `LOWER(${builtArgs[0]})`;
    case 'toupper':
      return `UPPER(${builtArgs[0]})`;
    case 'trim':
      return `LTRIM(RTRIM(${builtArgs[0]}))`;
    case 'length':
      return `LEN(${builtArgs[0]})`;
    case 'indexof':
      return `(CHARINDEX(${builtArgs[1]}, ${builtArgs[0]}) - 1)`;
    case 'substring':
      if (builtArgs.length === 3) {
        return `SUBSTRING(${builtArgs[0]}, ${builtArgs[1]} + 1, ${builtArgs[2]})`;
      }
      return `SUBSTRING(${builtArgs[0]}, ${builtArgs[1]} + 1, LEN(${builtArgs[0]}))`;
    case 'concat':
      return `CONCAT(${builtArgs.join(', ')})`;
    case 'year':
      return `YEAR(${builtArgs[0]})`;
    case 'month':
      return `MONTH(${builtArgs[0]})`;
    case 'day':
      return `DAY(${builtArgs[0]})`;
    case 'hour':
      return `DATEPART(HOUR, ${builtArgs[0]})`;
    case 'minute':
      return `DATEPART(MINUTE, ${builtArgs[0]})`;
    case 'second':
      return `DATEPART(SECOND, ${builtArgs[0]})`;
    default:
      throw new BadRequestError(`Unsupported function: ${name}`);
  }
}

function validateColumnExists(column: string, table: TableInfo): void {
  const exists = table.columns.some((c) => c.name.toLowerCase() === column.toLowerCase());
  if (!exists) {
    throw new BadRequestError(`Column '${column}' does not exist in ${table.schema}.${table.name}`);
  }
}
