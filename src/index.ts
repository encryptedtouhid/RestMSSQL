#!/usr/bin/env node

import { parseCliArgs } from './cli.js';
import { loadConfig } from './config.js';
import { createServer } from './server.js';
import { closePool } from './db/pool.js';

const SHUTDOWN_TIMEOUT_MS = 10000;

async function main() {
  const cliArgs = parseCliArgs();
  const config = loadConfig(cliArgs);

  if (!config.database) {
    console.error('Error: --database is required');
    process.exit(1);
  }

  const server = await createServer(config);

  // Graceful shutdown with timeout
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    server.log.info('Shutting down...');

    // Force exit if graceful shutdown takes too long
    const forceTimer = setTimeout(() => {
      server.log.error('Shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();

    try {
      await server.close();
      await closePool();
    } catch {
      // Ignore shutdown errors
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const listenHost = '127.0.0.1';
  await server.listen({ port: config.serverPort, host: listenHost });
  server.log.info(`mssql-rest-api listening on http://${listenHost}:${config.serverPort}`);
  server.log.info(`Mode: ${config.readonly ? 'read-only' : 'read-write'}`);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
