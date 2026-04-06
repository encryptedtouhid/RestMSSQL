import type { FastifyInstance } from 'fastify';
import type { TableInfo, DatabaseSchema } from '../introspection/types.js';
import type { ExpandItem } from '../odata/types.js';
import type { AppConfig } from '../config.js';
import { parseODataQuery } from '../odata/parser.js';
import {
  buildSelectQuery,
  buildCountQuery,
  buildSingleRowQuery,
  buildWhereClause,
} from '../query/builder.js';
import { buildInsertQuery, buildUpdateQuery, buildDeleteQuery } from '../query/write.js';
import { formatJsonResponse, formatSingleJsonResponse } from '../formatters/json.js';
import { formatXmlResponse, formatSingleXmlResponse } from '../formatters/xml.js';
import { setResponseHeaders } from '../formatters/content-negotiation.js';
import { getPool } from '../db/pool.js';
import { quoteIdentifier } from '../query/sanitizer.js';
import {
  BadRequestError,
  NotFoundError,
  MethodNotAllowedError,
  AppError,
} from '../utils/errors.js';

const DEFAULT_EXPAND_LIMIT = 1000;

/**
 * Parse PK values from route param.
 * Single PK:    "5"
 * Composite PK: "WarehouseId=1,ProductId=2"
 */
function parsePkValues(table: TableInfo, raw: string): Map<string, string> {
  const pkValues = new Map<string, string>();

  if (table.primaryKey.length === 1) {
    pkValues.set(table.primaryKey[0]!, raw);
    return pkValues;
  }

  // Composite: "Key1=val1,Key2=val2"
  const pairs = raw.split(',');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) {
      throw new BadRequestError(
        `Invalid composite key format. Expected: ${table.primaryKey.map((k) => `${k}=value`).join(',')}`,
      );
    }
    const key = pair.substring(0, eqIdx).trim();
    const value = pair.substring(eqIdx + 1).trim();

    // Validate key is an actual PK column
    if (!table.primaryKey.some((pk) => pk.toLowerCase() === key.toLowerCase())) {
      throw new BadRequestError(
        `'${key}' is not a primary key column. Valid keys: ${table.primaryKey.join(', ')}`,
      );
    }

    pkValues.set(key, value);
  }

  // Validate all PK columns are present
  for (const pk of table.primaryKey) {
    if (!pkValues.has(pk)) {
      throw new BadRequestError(`Missing primary key column '${pk}' in composite key`);
    }
  }

  return pkValues;
}

function validateExpandColumns(columns: string[], table: TableInfo, context: string): void {
  for (const col of columns) {
    const exists = table.columns.some((c) => c.name.toLowerCase() === col.toLowerCase());
    if (!exists) {
      throw new BadRequestError(
        `Column '${col}' does not exist in ${table.schema}.${table.name} (in $expand ${context})`,
      );
    }
  }
}

export function registerTableRoutes(
  app: FastifyInstance,
  table: TableInfo,
  schema: DatabaseSchema,
  config: AppConfig,
): void {
  const basePath =
    table.schema === 'dbo' ? `/api/${table.name}` : `/api/${table.schema}.${table.name}`;

  const paths = table.schema === 'dbo' ? [basePath, `/api/dbo.${table.name}`] : [basePath];

  for (const path of paths) {
    // GET collection
    app.get(path, async (request, reply) => {
      const pool = getPool();
      const queryParams = request.query as Record<string, string>;
      const odataQuery = parseODataQuery(
        {
          $filter: queryParams['$filter'],
          $select: queryParams['$select'],
          $orderby: queryParams['$orderby'],
          $top: queryParams['$top'],
          $skip: queryParams['$skip'],
          $expand: queryParams['$expand'],
          $count: queryParams['$count'],
        },
        config.maxPageSize,
      );

      // Run data query and count query in parallel when $count requested
      const dataQueryInfo = buildSelectQuery(table, odataQuery, config.defaultPageSize);
      const dataRequest = pool.request();
      for (const [key, value] of dataQueryInfo.parameters) {
        dataRequest.input(key, value);
      }
      const dataPromise = dataRequest.query(dataQueryInfo.sql);

      let countPromise: Promise<number | undefined> = Promise.resolve(undefined);
      if (odataQuery.count) {
        const countQuery = buildCountQuery(table, odataQuery);
        const countRequest = pool.request();
        for (const [key, value] of countQuery.parameters) {
          countRequest.input(key, value);
        }
        countPromise = countRequest
          .query(countQuery.sql)
          .then((r) => (r.recordset[0] as { count: number } | undefined)?.count);
      }

      const [dataResult, count] = await Promise.all([dataPromise, countPromise]);
      let data = dataResult.recordset as Record<string, unknown>[];

      if (odataQuery.expand) {
        data = await resolveExpand(data, table, odataQuery.expand.items, schema, config);
      }

      const context = `${request.protocol}://${request.hostname}/api/$metadata#${table.name}`;
      setResponseHeaders(reply, request.responseFormat);

      if (request.responseFormat === 'xml') {
        return reply.send(formatXmlResponse(data, { entityName: table.name, count }));
      }

      return reply.send(formatJsonResponse(data, { context, count }));
    });

    // GET single row by primary key
    if (table.primaryKey.length > 0) {
      app.get(`${path}/:keys`, async (request, reply) => {
        const pool = getPool();
        const { keys } = request.params as { keys: string };
        const pkValues = parsePkValues(table, keys);

        const { sql, parameters } = buildSingleRowQuery(table, pkValues);
        const sqlRequest = pool.request();
        for (const [key, value] of parameters) {
          sqlRequest.input(key, value);
        }

        const result = await sqlRequest.query(sql);
        const row = result.recordset[0] as Record<string, unknown> | undefined;

        if (!row) {
          throw new NotFoundError(`${table.name} not found`);
        }

        const context = `${request.protocol}://${request.hostname}/api/$metadata#${table.name}/$entity`;
        setResponseHeaders(reply, request.responseFormat);

        if (request.responseFormat === 'xml') {
          return reply.send(formatSingleXmlResponse(row, table.name));
        }

        return reply.send(formatSingleJsonResponse(row, context));
      });
    }

    // Write operations
    if (!config.readonly) {
      // POST - Create
      app.post(path, async (request, reply) => {
        const pool = getPool();
        const body = (request.body ?? {}) as Record<string, unknown>;
        const { sql, parameters } = buildInsertQuery(table, body);

        const sqlRequest = pool.request();
        for (const [key, value] of parameters) {
          sqlRequest.input(key, value);
        }

        const result = await sqlRequest.query(sql);
        const created = result.recordset[0] as Record<string, unknown> | undefined;

        if (!created) {
          throw new AppError('Insert did not return a result', 500, 'INTERNAL_ERROR');
        }

        setResponseHeaders(reply, request.responseFormat);
        void reply.status(201);

        if (request.responseFormat === 'xml') {
          return reply.send(formatSingleXmlResponse(created, table.name));
        }

        return reply.send(created);
      });

      // PATCH - Partial update
      app.patch(`${path}/:keys`, async (request, reply) => {
        const pool = getPool();
        const { keys } = request.params as { keys: string };
        const body = (request.body ?? {}) as Record<string, unknown>;
        const pkValues = parsePkValues(table, keys);

        const { sql, parameters } = buildUpdateQuery(table, pkValues, body);
        const sqlRequest = pool.request();
        for (const [key, value] of parameters) {
          sqlRequest.input(key, value);
        }

        const result = await sqlRequest.query(sql);
        const updated = result.recordset[0] as Record<string, unknown> | undefined;

        if (!updated) {
          throw new NotFoundError(`${table.name} not found`);
        }

        setResponseHeaders(reply, request.responseFormat);

        if (request.responseFormat === 'xml') {
          return reply.send(formatSingleXmlResponse(updated, table.name));
        }

        return reply.send(updated);
      });

      // PUT - Full update
      app.put(`${path}/:keys`, async (request, reply) => {
        const pool = getPool();
        const { keys } = request.params as { keys: string };
        const body = (request.body ?? {}) as Record<string, unknown>;
        const pkValues = parsePkValues(table, keys);

        const { sql, parameters } = buildUpdateQuery(table, pkValues, body);
        const sqlRequest = pool.request();
        for (const [key, value] of parameters) {
          sqlRequest.input(key, value);
        }

        const result = await sqlRequest.query(sql);
        const updated = result.recordset[0] as Record<string, unknown> | undefined;

        if (!updated) {
          throw new NotFoundError(`${table.name} not found`);
        }

        setResponseHeaders(reply, request.responseFormat);

        if (request.responseFormat === 'xml') {
          return reply.send(formatSingleXmlResponse(updated, table.name));
        }

        return reply.send(updated);
      });

      // DELETE
      app.delete(`${path}/:keys`, async (request, reply) => {
        const pool = getPool();
        const { keys } = request.params as { keys: string };
        const pkValues = parsePkValues(table, keys);

        const { sql, parameters } = buildDeleteQuery(table, pkValues);
        const sqlRequest = pool.request();
        for (const [key, value] of parameters) {
          sqlRequest.input(key, value);
        }

        const result = await sqlRequest.query(sql);
        const deleted = result.recordset[0] as Record<string, unknown> | undefined;

        if (!deleted) {
          throw new NotFoundError(`${table.name} not found`);
        }

        setResponseHeaders(reply, request.responseFormat);
        void reply.status(200);

        if (request.responseFormat === 'xml') {
          return reply.send(formatSingleXmlResponse(deleted, table.name));
        }

        return reply.send(deleted);
      });
    } else {
      const readonlyHandler = async () => {
        throw new MethodNotAllowedError();
      };

      app.post(path, readonlyHandler);
      if (table.primaryKey.length > 0) {
        app.patch(`${path}/:keys`, readonlyHandler);
        app.put(`${path}/:keys`, readonlyHandler);
        app.delete(`${path}/:keys`, readonlyHandler);
      }
    }
  }
}

async function resolveExpand(
  data: Record<string, unknown>[],
  table: TableInfo,
  expandItems: ExpandItem[],
  schema: DatabaseSchema,
  config: AppConfig,
): Promise<Record<string, unknown>[]> {
  const pool = getPool();

  // Run expand queries in parallel
  const expandTasks = expandItems.map(async (expandItem) => {
    const rel = schema.relationships.find(
      (r) =>
        (r.fromTable === table.name &&
          r.fromSchema === table.schema &&
          r.toTable.toLowerCase() === expandItem.property.toLowerCase()) ||
        (r.toTable === table.name &&
          r.toSchema === table.schema &&
          r.fromTable.toLowerCase() === expandItem.property.toLowerCase()),
    );

    if (!rel) {
      throw new AppError(
        `No relationship found for $expand property: ${expandItem.property}`,
        400,
        'BAD_REQUEST',
      );
    }

    const isParent = rel.fromTable === table.name && rel.fromSchema === table.schema;
    const relatedTableName = isParent ? rel.toTable : rel.fromTable;
    const relatedSchema = isParent ? rel.toSchema : rel.fromSchema;
    const localColumn = isParent ? rel.fromColumn : rel.toColumn;
    const foreignColumn = isParent ? rel.toColumn : rel.fromColumn;

    const fkValues = [
      ...new Set(data.map((row) => row[localColumn]).filter((v) => v !== null && v !== undefined)),
    ];

    if (fkValues.length === 0)
      return { expandItem, relatedData: [], localColumn, foreignColumn, isParent };

    const relatedTable = [...schema.tables, ...schema.views].find(
      (t) => t.name === relatedTableName && t.schema === relatedSchema,
    );

    if (!relatedTable) return { expandItem, relatedData: [], localColumn, foreignColumn, isParent };

    // Validate nested $select and $orderby columns against related table schema
    if (expandItem.select) {
      validateExpandColumns(expandItem.select.columns, relatedTable, '$select');
    }
    if (expandItem.orderBy) {
      validateExpandColumns(
        expandItem.orderBy.items.map((i) => i.column),
        relatedTable,
        '$orderby',
      );
    }

    const sqlRequest = pool.request();
    let paramCounter = 0;

    // FK IN clause
    const placeholders = fkValues.map((v, i) => {
      sqlRequest.input(`ex${i}`, v);
      return `@ex${i}`;
    });
    paramCounter = fkValues.length;

    const selectCols = expandItem.select
      ? expandItem.select.columns.map((c) => quoteIdentifier(c)).join(', ')
      : '*';

    // Apply expand limit: use $top if provided, otherwise DEFAULT_EXPAND_LIMIT
    const expandLimit = expandItem.top
      ? Math.min(expandItem.top, config.maxPageSize)
      : DEFAULT_EXPAND_LIMIT;

    let sql = `SELECT ${selectCols} FROM ${quoteIdentifier(relatedSchema)}.${quoteIdentifier(relatedTableName)} WHERE ${quoteIdentifier(foreignColumn)} IN (${placeholders.join(', ')})`;

    // Nested $filter — use dedicated param prefix to avoid collisions
    if (expandItem.filter) {
      const ctx = { paramCounter: 0, parameters: new Map<string, unknown>() };
      const whereClause = buildWhereClause(expandItem.filter, relatedTable, ctx);
      // Re-map param names to avoid collision with expand params
      let mappedWhere = whereClause;
      for (const [key, value] of ctx.parameters) {
        const newKey = `exf${paramCounter++}`;
        mappedWhere = mappedWhere.replace(`@${key}`, `@${newKey}`);
        sqlRequest.input(newKey, value);
      }
      sql += ` AND (${mappedWhere})`;
    }

    // Nested $orderby
    if (expandItem.orderBy) {
      const orderClauses = expandItem.orderBy.items
        .map((item) => `${quoteIdentifier(item.column)} ${item.direction.toUpperCase()}`)
        .join(', ');
      sql += ` ORDER BY ${orderClauses}`;

      // With ORDER BY, use OFFSET-FETCH for limit
      const skip = expandItem.skip ?? 0;
      sql += ` OFFSET ${skip} ROWS FETCH NEXT ${expandLimit} ROWS ONLY`;
    } else {
      // Without ORDER BY, use TOP
      sql = sql.replace('SELECT ', `SELECT TOP ${expandLimit} `);
    }

    const result = await sqlRequest.query(sql);
    return {
      expandItem,
      relatedData: result.recordset as Record<string, unknown>[],
      localColumn,
      foreignColumn,
      isParent,
    };
  });

  const results = await Promise.all(expandTasks);

  // Attach results to parent rows
  for (const { expandItem, relatedData, localColumn, foreignColumn, isParent } of results) {
    for (const row of data) {
      const localVal = row[localColumn];
      if (isParent) {
        row[expandItem.property] = relatedData.find((r) => r[foreignColumn] === localVal) ?? null;
      } else {
        row[expandItem.property] = relatedData.filter((r) => r[foreignColumn] === localVal);
      }
    }
  }

  return data;
}
