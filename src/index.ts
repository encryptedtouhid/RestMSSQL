#!/usr/bin/env node

import net from 'node:net';
import { parseCliArgs } from './cli.js';
import { loadConfig } from './config.js';
import { createServer } from './server.js';
import { closePool } from './db/pool.js';

const SHUTDOWN_TIMEOUT_MS = 10000;
const MAX_PORT_ATTEMPTS = 20;

function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, host);
  });
}

async function findAvailablePort(startPort: number, host: string): Promise<number> {
  for (let port = startPort; port < startPort + MAX_PORT_ATTEMPTS; port++) {
    if (await isPortAvailable(port, host)) return port;
  }
  throw new Error(
    `No available port found in range ${startPort}-${startPort + MAX_PORT_ATTEMPTS - 1}`,
  );
}

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

  // Find an available port, starting from the configured one
  const port = await findAvailablePort(config.serverPort, config.listenHost);
  if (port !== config.serverPort) {
    server.log.warn(`Port ${config.serverPort} is in use, using port ${port} instead`);
  }

  await server.listen({ port, host: config.listenHost });

  const displayHost = config.listenHost === '0.0.0.0' ? 'localhost' : config.listenHost;
  const baseUrl = `http://${displayHost}:${port}`;

  // ANSI color helpers
  const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
  const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
  const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
  const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
  const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

  const modeColor = config.readonly ? yellow : green;

  console.log('');
  console.log(`  ${bold(green('RestMSSQL is running!'))}`);
  console.log('');
  console.log(`  ${dim('API:')}       ${cyan(`${baseUrl}/api`)}`);
  console.log(`  ${dim('Swagger:')}   ${cyan(`${baseUrl}/swagger`)}`);
  console.log(`  ${dim('Metadata:')}  ${cyan(`${baseUrl}/api/$metadata`)}`);
  console.log(`  ${dim('OpenAPI:')}   ${cyan(`${baseUrl}/api/openapi.json`)}`);
  console.log('');
  console.log(`  ${dim('Mode:')}      ${modeColor(config.readonly ? 'read-only' : 'read-write')}`);
  console.log(`  ${dim('Database:')}  ${config.host}:${config.port}/${config.database}`);
  console.log('');
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
