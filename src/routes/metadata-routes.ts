import type { FastifyInstance } from 'fastify';
import type { DatabaseSchema } from '../introspection/types.js';
import { generateODataMetadata } from '../metadata/odata-metadata.js';
import { generateOpenApiSpec } from '../metadata/openapi.js';
import type { AppConfig } from '../config.js';

export function registerMetadataRoutes(
  app: FastifyInstance,
  schema: DatabaseSchema,
  config: AppConfig,
): void {
  // OData $metadata endpoint (always XML)
  app.get('/api/\\$metadata', async (_request, reply) => {
    const metadata = generateODataMetadata(schema);
    void reply.header('Content-Type', 'application/xml; charset=utf-8');
    return reply.send(metadata);
  });

  // OpenAPI/Swagger JSON
  app.get('/api/openapi.json', async (_request, reply) => {
    const spec = generateOpenApiSpec(schema, config);
    void reply.header('Content-Type', 'application/json; charset=utf-8');
    return reply.send(spec);
  });
}
