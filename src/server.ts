import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { AppConfig } from './config.js';
import { initPool } from './db/pool.js';
import { introspectDatabase } from './introspection/introspector.js';
import { registerAllRoutes } from './routes/generator.js';
import { contentNegotiationHook } from './formatters/content-negotiation.js';
import { formatXmlError } from './formatters/xml.js';
import { AppError } from './utils/errors.js';

export async function createServer(config: AppConfig) {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
    bodyLimit: 1048576, // 1MB
  });

  // Security headers
  app.addHook('onSend', (_request, reply, _payload, done) => {
    void reply.header('X-Content-Type-Options', 'nosniff');
    void reply.header('X-Frame-Options', 'DENY');
    void reply.header('X-XSS-Protection', '1; mode=block');
    done();
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // CORS
  if (config.cors) {
    await app.register(cors, { origin: config.corsOrigin === '*' ? true : config.corsOrigin });
  }

  // Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: `${config.database} API`,
        version: '1.0.0',
        description: `Auto-generated REST API for ${config.database} database`,
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: '/swagger',
  });

  // Content negotiation
  app.addHook('onRequest', contentNegotiationHook);

  // Error handler
  app.setErrorHandler(
    (
      error: Error & { validation?: unknown; statusCode?: number; code?: string },
      request,
      reply,
    ) => {
      const statusCode =
        error instanceof AppError ? error.statusCode : error.validation ? 400 : 500;
      const code =
        error instanceof AppError
          ? error.code
          : error.validation
            ? 'VALIDATION_ERROR'
            : 'INTERNAL_ERROR';
      const message =
        error instanceof AppError || error.validation
          ? error.message
          : 'An internal error occurred';

      if (statusCode === 500) {
        app.log.error(error);
      }

      void reply.status(statusCode);

      if (request.responseFormat === 'xml') {
        void reply.header('Content-Type', 'application/xml; charset=utf-8');
        return reply.send(formatXmlError(code, message));
      }

      return reply.send({ error: { code, message } });
    },
  );

  // Initialize database
  let pool;
  try {
    pool = await initPool(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('ECONNREFUSED') || message.includes('Could not connect')) {
      throw new Error(
        `Cannot connect to SQL Server at ${config.host}:${config.port}. Is the server running?`,
      );
    }
    if (message.includes('Login failed')) {
      throw new Error(
        `Authentication failed for user '${config.user}' on ${config.host}:${config.port}. Check credentials.`,
      );
    }
    if (message.includes('database') && message.includes('not exist')) {
      throw new Error(
        `Database '${config.database}' does not exist on ${config.host}:${config.port}.`,
      );
    }
    throw err;
  }
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
