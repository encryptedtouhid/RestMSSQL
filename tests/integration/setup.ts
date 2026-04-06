import { createServer } from '../../src/server.js';
import { closePool } from '../../src/db/pool.js';
import type { AppConfig } from '../../src/config.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance | null = null;

export function getTestConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    host: process.env['MSSQLREST_HOST'] ?? 'localhost',
    port: parseInt(process.env['MSSQLREST_PORT'] ?? '1433', 10),
    database: process.env['MSSQLREST_DATABASE'] ?? 'mssqlrest_test',
    user: process.env['MSSQLREST_USER'] ?? 'sa',
    password: process.env['MSSQLREST_PASSWORD'] ?? 'YourStr0ngP@ssword!',
    encrypt: false,
    trustServerCertificate: true,
    serverPort: 0, // random port
    readonly: true,
    cors: true,
    schemas: ['dbo', 'sales', 'hr', 'inventory', 'finance', 'content'],
    excludeTables: [],
    defaultPageSize: 100,
    maxPageSize: 1000,
    logLevel: 'error',
    ...overrides,
  };
}

export async function setupApp(overrides: Partial<AppConfig> = {}): Promise<FastifyInstance> {
  const config = getTestConfig(overrides);
  app = await createServer(config);
  return app;
}

export async function teardownApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }
  await closePool();
}
