import type { FastifyInstance } from 'fastify';
import type { DatabaseSchema } from '../introspection/types.js';
import type { AppConfig } from '../config.js';
import { registerTableRoutes } from './table-routes.js';
import { registerViewRoutes } from './view-routes.js';
import { registerProcedureRoutes } from './procedure-routes.js';
import { registerMetadataRoutes } from './metadata-routes.js';

export function registerAllRoutes(
  app: FastifyInstance,
  schema: DatabaseSchema,
  config: AppConfig,
): void {
  // Register table routes
  for (const table of schema.tables) {
    registerTableRoutes(app, table, schema, config);
  }

  // Register view routes
  for (const view of schema.views) {
    registerViewRoutes(app, view, config);
  }

  // Register stored procedure routes
  for (const procedure of schema.procedures) {
    registerProcedureRoutes(app, procedure);
  }

  // Register metadata routes
  registerMetadataRoutes(app, schema, config);

  // Root endpoint listing all available resources
  app.get('/api', async (request, reply) => {
    const baseUrl = `${request.protocol}://${request.hostname}`;

    const resources = {
      '@odata.context': `${baseUrl}/api/$metadata`,
      value: [
        ...schema.tables.map((t) => ({
          name: t.schema === 'dbo' ? t.name : `${t.schema}.${t.name}`,
          kind: 'EntitySet',
          url: `${baseUrl}/api/${t.schema === 'dbo' ? t.name : `${t.schema}.${t.name}`}`,
        })),
        ...schema.views.map((v) => ({
          name: v.schema === 'dbo' ? v.name : `${v.schema}.${v.name}`,
          kind: 'EntitySet',
          url: `${baseUrl}/api/${v.schema === 'dbo' ? v.name : `${v.schema}.${v.name}`}`,
        })),
        ...schema.procedures.map((p) => ({
          name: p.schema === 'dbo' ? p.name : `${p.schema}.${p.name}`,
          kind: 'FunctionImport',
          url: `${baseUrl}/rpc/${p.schema === 'dbo' ? p.name : `${p.schema}.${p.name}`}`,
        })),
      ],
    };

    void reply.header('Content-Type', 'application/json; charset=utf-8');
    return reply.send(resources);
  });
}
