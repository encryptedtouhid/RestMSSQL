import type { TableInfo } from '../introspection/types.js';
import { quoteIdentifier, quoteTableName } from './sanitizer.js';
import { BadRequestError } from '../utils/errors.js';
import type { SqlQuery, QueryContext } from './builder.js';

function newContext(): QueryContext {
  return { paramCounter: 0, parameters: new Map() };
}

function addParam(ctx: QueryContext, value: unknown): string {
  const name = `p${ctx.paramCounter++}`;
  ctx.parameters.set(name, value);
  return `@${name}`;
}

export function buildInsertQuery(table: TableInfo, body: Record<string, unknown>): SqlQuery {
  const ctx = newContext();
  const tableName = quoteTableName(table.schema, table.name);

  const writableColumns = table.columns.filter((c) => !c.isIdentity);
  const entries = Object.entries(body).filter(([key]) => {
    const col = writableColumns.find((c) => c.name.toLowerCase() === key.toLowerCase());
    if (!col) throw new BadRequestError(`Column '${key}' does not exist or is not writable`);
    return true;
  });

  if (entries.length === 0) {
    throw new BadRequestError('No valid columns provided for insert');
  }

  const columns = entries.map(([key]) => {
    const col = writableColumns.find((c) => c.name.toLowerCase() === key.toLowerCase())!;
    return quoteIdentifier(col.name);
  });

  const values = entries.map(([, val]) => addParam(ctx, val));

  const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) OUTPUT INSERTED.* VALUES (${values.join(', ')})`;
  return { sql, parameters: ctx.parameters };
}

export function buildUpdateQuery(
  table: TableInfo,
  pkValues: Map<string, string>,
  body: Record<string, unknown>,
): SqlQuery {
  const ctx = newContext();
  const tableName = quoteTableName(table.schema, table.name);

  const writableColumns = table.columns.filter((c) => !c.isIdentity);
  const entries = Object.entries(body).filter(([key]) => {
    const col = writableColumns.find((c) => c.name.toLowerCase() === key.toLowerCase());
    if (!col) throw new BadRequestError(`Column '${key}' does not exist or is not writable`);
    return true;
  });

  if (entries.length === 0) {
    throw new BadRequestError('No valid columns provided for update');
  }

  const setClauses = entries.map(([key, val]) => {
    const col = writableColumns.find((c) => c.name.toLowerCase() === key.toLowerCase())!;
    return `${quoteIdentifier(col.name)} = ${addParam(ctx, val)}`;
  });

  const conditions = Array.from(pkValues.entries()).map(([col, val]) => {
    return `${quoteIdentifier(col)} = ${addParam(ctx, val)}`;
  });

  const sql = `UPDATE ${tableName} SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE ${conditions.join(' AND ')}`;
  return { sql, parameters: ctx.parameters };
}

export function buildDeleteQuery(table: TableInfo, pkValues: Map<string, string>): SqlQuery {
  const ctx = newContext();
  const tableName = quoteTableName(table.schema, table.name);

  const conditions = Array.from(pkValues.entries()).map(([col, val]) => {
    return `${quoteIdentifier(col)} = ${addParam(ctx, val)}`;
  });

  const sql = `DELETE FROM ${tableName} OUTPUT DELETED.* WHERE ${conditions.join(' AND ')}`;
  return { sql, parameters: ctx.parameters };
}
