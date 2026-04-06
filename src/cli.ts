import { Command } from 'commander';
import type { AppConfig } from './config.js';

export function parseCliArgs(argv?: string[]): Partial<AppConfig> {
  const program = new Command();

  program
    .name('mssql-rest-api')
    .description('Zero-code REST API server for SQL Server with OData support')
    .version('0.1.0')
    .option('--host <host>', 'SQL Server host')
    .option('--port <port>', 'SQL Server port', parseInt)
    .option('--database <database>', 'Database name')
    .option('--user <user>', 'Database user')
    .option('--password <password>', 'Database password')
    .option('--encrypt', 'Encrypt connection')
    .option('--no-encrypt', 'Disable connection encryption')
    .option('--trust-server-certificate', 'Trust server certificate')
    .option('--server-port <port>', 'HTTP server port', parseInt)
    .option('--readonly', 'Read-only mode (default)')
    .option('--no-readonly', 'Enable write operations')
    .option('--cors', 'Enable CORS (default)')
    .option('--no-cors', 'Disable CORS')
    .option('--schemas <schemas>', 'Comma-separated list of schemas to expose')
    .option('--exclude-tables <tables>', 'Comma-separated list of tables to exclude')
    .option('--default-page-size <size>', 'Default page size', parseInt)
    .option('--max-page-size <size>', 'Maximum page size', parseInt)
    .option('--log-level <level>', 'Log level (fatal, error, warn, info, debug, trace)');

  program.parse(argv ?? process.argv);
  const opts = program.opts();

  const config: Partial<AppConfig> = {};

  if (opts['host'] !== undefined) config.host = opts['host'];
  if (opts['port'] !== undefined) config.port = opts['port'];
  if (opts['database'] !== undefined) config.database = opts['database'];
  if (opts['user'] !== undefined) config.user = opts['user'];
  if (opts['password'] !== undefined) config.password = opts['password'];
  if (opts['encrypt'] !== undefined) config.encrypt = opts['encrypt'];
  if (opts['trustServerCertificate']) config.trustServerCertificate = true;
  if (opts['serverPort'] !== undefined) config.serverPort = opts['serverPort'];
  if (opts['readonly'] !== undefined) config.readonly = opts['readonly'];
  if (opts['cors'] !== undefined) config.cors = opts['cors'];
  if (opts['schemas']) config.schemas = opts['schemas'].split(',').map((s: string) => s.trim());
  if (opts['excludeTables'])
    config.excludeTables = opts['excludeTables'].split(',').map((s: string) => s.trim());
  if (opts['defaultPageSize'] !== undefined) config.defaultPageSize = opts['defaultPageSize'];
  if (opts['maxPageSize'] !== undefined) config.maxPageSize = opts['maxPageSize'];
  if (opts['logLevel'] !== undefined) config.logLevel = opts['logLevel'];

  return config;
}
