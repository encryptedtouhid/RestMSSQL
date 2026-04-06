import type { FastifyInstance } from 'fastify';
import type { TableInfo } from '../introspection/types.js';
import type { AppConfig } from '../config.js';
import { parseODataQuery } from '../odata/parser.js';
import { buildSelectQuery, buildCountQuery } from '../query/builder.js';
import { formatJsonResponse } from '../formatters/json.js';
import { formatXmlResponse } from '../formatters/xml.js';
import { setResponseHeaders } from '../formatters/content-negotiation.js';
import { getPool } from '../db/pool.js';

export function registerViewRoutes(app: FastifyInstance, view: TableInfo, config: AppConfig): void {
  const basePath = view.schema === 'dbo' ? `/api/${view.name}` : `/api/${view.schema}.${view.name}`;
  const paths = view.schema === 'dbo' ? [basePath, `/api/dbo.${view.name}`] : [basePath];

  for (const path of paths) {
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
          $count: queryParams['$count'],
        },
        config.maxPageSize,
      );

      const { sql, parameters } = buildSelectQuery(view, odataQuery, config.defaultPageSize);
      const sqlRequest = pool.request();
      for (const [key, value] of parameters) {
        sqlRequest.input(key, value);
      }

      const result = await sqlRequest.query(sql);
      const data = result.recordset as Record<string, unknown>[];

      let count: number | undefined;
      if (odataQuery.count) {
        const countQuery = buildCountQuery(view, odataQuery);
        const countRequest = pool.request();
        for (const [key, value] of countQuery.parameters) {
          countRequest.input(key, value);
        }
        const countResult = await countRequest.query(countQuery.sql);
        count = (countResult.recordset[0] as { count: number } | undefined)?.count;
      }

      const context = `${request.protocol}://${request.hostname}/api/$metadata#${view.name}`;
      setResponseHeaders(reply, request.responseFormat);

      if (request.responseFormat === 'xml') {
        return reply.send(formatXmlResponse(data, { entityName: view.name, count }));
      }

      return reply.send(formatJsonResponse(data, { context, count }));
    });
  }
}
