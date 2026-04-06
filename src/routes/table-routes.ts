import type { FastifyInstance } from 'fastify';
import type { TableInfo, DatabaseSchema } from '../introspection/types.js';
import type { ExpandItem } from '../odata/types.js';
import type { AppConfig } from '../config.js';
import { parseODataQuery } from '../odata/parser.js';
import { buildSelectQuery, buildCountQuery, buildSingleRowQuery } from '../query/builder.js';
import { buildInsertQuery, buildUpdateQuery, buildDeleteQuery } from '../query/write.js';
import { formatJsonResponse, formatSingleJsonResponse } from '../formatters/json.js';
import { formatXmlResponse, formatSingleXmlResponse } from '../formatters/xml.js';
import { setResponseHeaders } from '../formatters/content-negotiation.js';
import { getPool } from '../db/pool.js';
import {
  BadRequestError,
  NotFoundError,
  MethodNotAllowedError,
  AppError,
} from '../utils/errors.js';

/**
 * Parse PK values from route param.
 * Single PK:    /:id        → "5"
 * Composite PK: /:keys      → "WarehouseId=1,ProductId=2"
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

      const { sql, parameters } = buildSelectQuery(table, odataQuery, config.defaultPageSize);
      const sqlRequest = pool.request();
      for (const [key, value] of parameters) {
        sqlRequest.input(key, value);
      }

      const result = await sqlRequest.query(sql);
      let data = result.recordset as Record<string, unknown>[];

      if (odataQuery.expand) {
        data = await resolveExpand(data, table, odataQuery.expand.items, schema, config);
      }

      let count: number | undefined;
      if (odataQuery.count) {
        const countQuery = buildCountQuery(table, odataQuery);
        const countRequest = pool.request();
        for (const [key, value] of countQuery.parameters) {
          countRequest.input(key, value);
        }
        const countResult = await countRequest.query(countQuery.sql);
        count = (countResult.recordset[0] as { count: number } | undefined)?.count;
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
        const body = request.body as Record<string, unknown>;
        const { sql, parameters } = buildInsertQuery(table, body);

        const sqlRequest = pool.request();
        for (const [key, value] of parameters) {
          sqlRequest.input(key, value);
        }

        const result = await sqlRequest.query(sql);
        const created = result.recordset[0] as Record<string, unknown>;

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
        const body = request.body as Record<string, unknown>;
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
        const body = request.body as Record<string, unknown>;
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

  for (const expandItem of expandItems) {
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

    if (fkValues.length === 0) continue;

    const relatedTable = [...schema.tables, ...schema.views].find(
      (t) => t.name === relatedTableName && t.schema === relatedSchema,
    );

    if (!relatedTable) continue;

    // Build query with nested options support
    const placeholders = fkValues.map((_, i) => `@expand${i}`).join(', ');
    const sqlRequest = pool.request();
    fkValues.forEach((v, i) => sqlRequest.input(`expand${i}`, v));

    const selectCols = expandItem.select
      ? expandItem.select.columns.map((c) => `[${c}]`).join(', ')
      : '*';

    let sql = `SELECT ${selectCols} FROM [${relatedSchema}].[${relatedTableName}] WHERE [${foreignColumn}] IN (${placeholders})`;

    // Nested $filter
    if (expandItem.filter) {
      const { buildWhereClause } = await import('../query/builder.js');
      const ctx = { paramCounter: 0, parameters: new Map<string, unknown>() };
      const whereClause = buildWhereClause(expandItem.filter, relatedTable, ctx);
      sql += ` AND (${whereClause})`;
      for (const [key, value] of ctx.parameters) {
        sqlRequest.input(`ef_${key}`, value);
      }
      sql = sql.replace(/@p(\d+)/g, '@ef_p$1');
    }

    // Nested $orderby
    if (expandItem.orderBy) {
      const orderClauses = expandItem.orderBy.items
        .map((item) => `[${item.column}] ${item.direction.toUpperCase()}`)
        .join(', ');
      sql += ` ORDER BY ${orderClauses}`;
    }

    // Nested $top / $skip via OFFSET-FETCH (requires ORDER BY)
    if (expandItem.top && expandItem.orderBy) {
      const skip = expandItem.skip ?? 0;
      sql += ` OFFSET ${skip} ROWS FETCH NEXT ${Math.min(expandItem.top, config.maxPageSize)} ROWS ONLY`;
    } else if (expandItem.top) {
      sql = sql.replace('SELECT ', `SELECT TOP ${Math.min(expandItem.top, config.maxPageSize)} `);
    }

    const result = await sqlRequest.query(sql);
    const relatedData = result.recordset as Record<string, unknown>[];

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
