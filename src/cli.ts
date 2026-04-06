import { createRequire } from 'node:module';
import { Command } from 'commander';
import type { AppConfig } from './config.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

export function parseCliArgs(argv?: string[]): Partial<AppConfig> {
  const program = new Command();

  program
    .name('mssql-rest-api')
    .description('Zero-code REST API server for SQL Server with OData support')
    .version(pkg.version)
    .option(
      '--connection <string>',
      'Connection string (Server=...;Database=...;User Id=...;Password=...)',
    )
    .option('--host <host>', 'SQL Server host')
    .option('--port <port>', 'SQL Server port', parseInt)
    .option('--database <database>', 'Database name')
    .option('--user <user>', 'Database user')
    .option('--password <password>', 'Database password')
    .option('--encrypt', 'Encrypt connection')
    .option('--no-encrypt', 'Disable connection encryption')
    .option('--trust-server-certificate', 'Trust server certificate')
    .option('--server-port <port>', 'HTTP server port', parseInt)
    .option('--listen-host <host>', 'Listen host (default: 127.0.0.1)')
    .option('--readonly', 'Read-only mode (default)')
    .option('--no-readonly', 'Enable write operations')
    .option('--cors', 'Enable CORS (default)')
    .option('--no-cors', 'Disable CORS')
    .option('--cors-origin <origin>', 'CORS allowed origin (default: *)')
    .option('--schemas <schemas>', 'Comma-separated list of schemas to expose')
    .option('--exclude-tables <tables>', 'Comma-separated list of tables to exclude')
    .option('--default-page-size <size>', 'Default page size', parseInt)
    .option('--max-page-size <size>', 'Maximum page size', parseInt)
    .option('--log-level <level>', 'Log level (fatal, error, warn, info, debug, trace)');

  program.parse(argv ?? process.argv);
  const opts = program.opts();

  const config: Partial<AppConfig> = {};

  if (opts['connection']) {
    const parsed = parseConnectionString(opts['connection']);
    Object.assign(config, parsed);
  }

  if (opts['host'] !== undefined) config.host = opts['host'];
  if (opts['port'] !== undefined) config.port = opts['port'];
  if (opts['database'] !== undefined) config.database = opts['database'];
  if (opts['user'] !== undefined) config.user = opts['user'];
  if (opts['password'] !== undefined) config.password = opts['password'];
  if (opts['encrypt'] !== undefined) config.encrypt = opts['encrypt'];
  if (opts['trustServerCertificate']) config.trustServerCertificate = true;
  if (opts['serverPort'] !== undefined) config.serverPort = opts['serverPort'];
  if (opts['listenHost'] !== undefined) config.listenHost = opts['listenHost'];
  if (opts['readonly'] !== undefined) config.readonly = opts['readonly'];
  if (opts['cors'] !== undefined) config.cors = opts['cors'];
  if (opts['corsOrigin'] !== undefined) config.corsOrigin = opts['corsOrigin'];
  if (opts['schemas']) config.schemas = opts['schemas'].split(',').map((s: string) => s.trim());
  if (opts['excludeTables'])
    config.excludeTables = opts['excludeTables'].split(',').map((s: string) => s.trim());
  if (opts['defaultPageSize'] !== undefined) config.defaultPageSize = opts['defaultPageSize'];
  if (opts['maxPageSize'] !== undefined) config.maxPageSize = opts['maxPageSize'];
  if (opts['logLevel'] !== undefined) config.logLevel = opts['logLevel'];

  return config;
}

function parseConnectionString(connStr: string): Partial<AppConfig> {
  const config: Partial<AppConfig> = {};
  const pairs = connStr.split(';').filter(Boolean);

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.substring(0, eqIdx).trim().toLowerCase();
    const value = pair.substring(eqIdx + 1).trim();

    switch (key) {
      case 'server':
      case 'data source':
        if (value.includes(',')) {
          const [host, port] = value.split(',');
          config.host = host!.trim();
          config.port = parseInt(port!.trim(), 10);
        } else {
          config.host = value;
        }
        break;
      case 'database':
      case 'initial catalog':
        config.database = value;
        break;
      case 'user id':
      case 'uid':
        config.user = value;
        break;
      case 'password':
      case 'pwd':
        config.password = value;
        break;
      case 'encrypt':
        config.encrypt = value.toLowerCase() === 'true';
        break;
      case 'trustservercertificate':
        config.trustServerCertificate = value.toLowerCase() === 'true';
        break;
    }
  }

  return config;
}
