import type { FastifyInstance } from 'fastify';
import type { ProcedureInfo } from '../introspection/types.js';
import { getPool } from '../db/pool.js';
import { setResponseHeaders } from '../formatters/content-negotiation.js';
import { formatJsonResponse } from '../formatters/json.js';
import { formatXmlResponse } from '../formatters/xml.js';

export function registerProcedureRoutes(app: FastifyInstance, procedure: ProcedureInfo): void {
  const path =
    procedure.schema === 'dbo'
      ? `/rpc/${procedure.name}`
      : `/rpc/${procedure.schema}.${procedure.name}`;

  app.post(path, async (request, reply) => {
    const pool = getPool();
    const body = (request.body ?? {}) as Record<string, unknown>;

    const sqlRequest = pool.request();

    for (const param of procedure.parameters) {
      if (param.mode === 'IN' || param.mode === 'INOUT') {
        const value = body[param.name];
        if (value !== undefined) {
          sqlRequest.input(param.name, value);
        }
      }
    }

    const qualifiedName = `[${procedure.schema}].[${procedure.name}]`;
    const result = await sqlRequest.execute(qualifiedName);

    const data = (result.recordset ?? []) as Record<string, unknown>[];

    setResponseHeaders(reply, request.responseFormat);

    if (request.responseFormat === 'xml') {
      return reply.send(formatXmlResponse(data, { entityName: procedure.name }));
    }

    return reply.send(formatJsonResponse(data));
  });
}
