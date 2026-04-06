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
import { NotFoundError, MethodNotAllowedError, AppError } from '../utils/errors.js';

export function registerTableRoutes(
  app: FastifyInstance,
  table: TableInfo,
  schema: DatabaseSchema,
  config: AppConfig,
): void {
  const basePath =
    table.schema === 'dbo' ? `/api/${table.name}` : `/api/${table.schema}.${table.name}`;

  // Also register without schema prefix for non-dbo if using full path
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

      // Handle $expand
      if (odataQuery.expand) {
        data = await resolveExpand(data, table, odataQuery.expand.items, schema, config);
      }

      // Handle $count
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
      app.get(`${path}/:id`, async (request, reply) => {
        const pool = getPool();
        const { id } = request.params as { id: string };
        const pkValues = new Map<string, string>();
        pkValues.set(table.primaryKey[0]!, id);

        const { sql, parameters } = buildSingleRowQuery(table, pkValues);
        const sqlRequest = pool.request();
        for (const [key, value] of parameters) {
          sqlRequest.input(key, value);
        }

        const result = await sqlRequest.query(sql);
        const row = result.recordset[0] as Record<string, unknown> | undefined;

        if (!row) {
          throw new NotFoundError(`${table.name} with id '${id}' not found`);
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
      app.patch(`${path}/:id`, async (request, reply) => {
        const pool = getPool();
        const { id } = request.params as { id: string };
        const body = request.body as Record<string, unknown>;
        const pkValues = new Map<string, string>();
        pkValues.set(table.primaryKey[0]!, id);

        const { sql, parameters } = buildUpdateQuery(table, pkValues, body);
        const sqlRequest = pool.request();
        for (const [key, value] of parameters) {
          sqlRequest.input(key, value);
        }

        const result = await sqlRequest.query(sql);
        const updated = result.recordset[0] as Record<string, unknown> | undefined;

        if (!updated) {
          throw new NotFoundError(`${table.name} with id '${id}' not found`);
        }

        setResponseHeaders(reply, request.responseFormat);

        if (request.responseFormat === 'xml') {
          return reply.send(formatSingleXmlResponse(updated, table.name));
        }

        return reply.send(updated);
      });

      // PUT - Full update (same as PATCH for now)
      app.put(`${path}/:id`, async (request, reply) => {
        const pool = getPool();
        const { id } = request.params as { id: string };
        const body = request.body as Record<string, unknown>;
        const pkValues = new Map<string, string>();
        pkValues.set(table.primaryKey[0]!, id);

        const { sql, parameters } = buildUpdateQuery(table, pkValues, body);
        const sqlRequest = pool.request();
        for (const [key, value] of parameters) {
          sqlRequest.input(key, value);
        }

        const result = await sqlRequest.query(sql);
        const updated = result.recordset[0] as Record<string, unknown> | undefined;

        if (!updated) {
          throw new NotFoundError(`${table.name} with id '${id}' not found`);
        }

        setResponseHeaders(reply, request.responseFormat);

        if (request.responseFormat === 'xml') {
          return reply.send(formatSingleXmlResponse(updated, table.name));
        }

        return reply.send(updated);
      });

      // DELETE
      app.delete(`${path}/:id`, async (request, reply) => {
        const pool = getPool();
        const { id } = request.params as { id: string };
        const pkValues = new Map<string, string>();
        pkValues.set(table.primaryKey[0]!, id);

        const { sql, parameters } = buildDeleteQuery(table, pkValues);
        const sqlRequest = pool.request();
        for (const [key, value] of parameters) {
          sqlRequest.input(key, value);
        }

        const result = await sqlRequest.query(sql);
        const deleted = result.recordset[0] as Record<string, unknown> | undefined;

        if (!deleted) {
          throw new NotFoundError(`${table.name} with id '${id}' not found`);
        }

        setResponseHeaders(reply, request.responseFormat);
        void reply.status(200);

        if (request.responseFormat === 'xml') {
          return reply.send(formatSingleXmlResponse(deleted, table.name));
        }

        return reply.send(deleted);
      });
    } else {
      // Read-only mode: return 405 for write operations
      const readonlyHandler = async () => {
        throw new MethodNotAllowedError();
      };

      app.post(path, readonlyHandler);
      if (table.primaryKey.length > 0) {
        app.patch(`${path}/:id`, readonlyHandler);
        app.put(`${path}/:id`, readonlyHandler);
        app.delete(`${path}/:id`, readonlyHandler);
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
    // Find relationship
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

    // Determine direction
    const isParent = rel.fromTable === table.name && rel.fromSchema === table.schema;
    const relatedTableName = isParent ? rel.toTable : rel.fromTable;
    const relatedSchema = isParent ? rel.toSchema : rel.fromSchema;
    const localColumn = isParent ? rel.fromColumn : rel.toColumn;
    const foreignColumn = isParent ? rel.toColumn : rel.fromColumn;

    // Collect unique FK values
    const fkValues = [
      ...new Set(data.map((row) => row[localColumn]).filter((v) => v !== null && v !== undefined)),
    ];

    if (fkValues.length === 0) continue;

    // Find the related table info
    const relatedTable = [...schema.tables, ...schema.views].find(
      (t) => t.name === relatedTableName && t.schema === relatedSchema,
    );

    if (!relatedTable) continue;

    // Build query for related data
    const placeholders = fkValues.map((_, i) => `@expand${i}`).join(', ');
    const sqlRequest = pool.request();
    fkValues.forEach((v, i) => sqlRequest.input(`expand${i}`, v));

    const selectCols = expandItem.select
      ? expandItem.select.columns.map((c) => `[${c}]`).join(', ')
      : '*';

    let sql = `SELECT ${selectCols} FROM [${relatedSchema}].[${relatedTableName}] WHERE [${foreignColumn}] IN (${placeholders})`;

    if (expandItem.top) {
      sql = `SELECT TOP ${Math.min(expandItem.top, config.maxPageSize)} ${selectCols} FROM [${relatedSchema}].[${relatedTableName}] WHERE [${foreignColumn}] IN (${placeholders})`;
    }

    const result = await sqlRequest.query(sql);
    const relatedData = result.recordset as Record<string, unknown>[];

    // Attach to parent rows
    for (const row of data) {
      const localVal = row[localColumn];
      if (isParent) {
        // Many-to-one: attach single object
        row[expandItem.property] = relatedData.find((r) => r[foreignColumn] === localVal) ?? null;
      } else {
        // One-to-many: attach array
        row[expandItem.property] = relatedData.filter((r) => r[foreignColumn] === localVal);
      }
    }
  }

  return data;
}
