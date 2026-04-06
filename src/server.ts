import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { AppConfig } from './config.js';
import { initPool } from './db/pool.js';
import { introspectDatabase } from './introspection/introspector.js';
import { registerAllRoutes } from './routes/generator.js';
import { contentNegotiationHook } from './formatters/content-negotiation.js';
import { AppError } from './utils/errors.js';

export async function createServer(config: AppConfig) {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // CORS
  if (config.cors) {
    await app.register(cors, { origin: true });
  }

  // Content negotiation
  app.addHook('onRequest', contentNegotiationHook);

  // Error handler
  app.setErrorHandler(
    (
      error: Error & { validation?: unknown; statusCode?: number; code?: string },
      _request,
      reply,
    ) => {
      if (error instanceof AppError) {
        void reply.status(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }

      // Fastify validation errors
      if (error.validation) {
        void reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }

      app.log.error(error);
      void reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
        },
      });
    },
  );

  // Initialize database
  const pool = await initPool(config);
  app.log.info(`Connected to SQL Server at ${config.host}:${config.port}/${config.database}`);

  // Introspect schema
  const schema = await introspectDatabase(pool, config);
  app.log.info(
    `Discovered ${schema.tables.length} tables, ${schema.views.length} views, ${schema.procedures.length} procedures`,
  );

  // Register routes
  registerAllRoutes(app, schema, config);

  return app;
}
