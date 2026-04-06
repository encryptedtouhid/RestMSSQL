#!/usr/bin/env node

import { parseCliArgs } from './cli.js';
import { loadConfig } from './config.js';
import { createServer } from './server.js';
import { closePool } from './db/pool.js';

async function main() {
  const cliArgs = parseCliArgs();
  const config = loadConfig(cliArgs);

  if (!config.database) {
    console.error('Error: --database is required');
    process.exit(1);
  }

  const server = await createServer(config);

  // Graceful shutdown
  const shutdown = async () => {
    server.log.info('Shutting down...');
    await server.close();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await server.listen({ port: config.serverPort, host: '0.0.0.0' });
  server.log.info(`mssql-rest-api listening on http://0.0.0.0:${config.serverPort}`);
  server.log.info(`Mode: ${config.readonly ? 'read-only' : 'read-write'}`);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
