import { cosmiconfigSync } from 'cosmiconfig';
import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;

  serverPort: number;
  listenHost: string;
  readonly: boolean;
  cors: boolean;
  corsOrigin: string;

  schemas: string[];
  excludeTables: string[];

  defaultPageSize: number;
  maxPageSize: number;

  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

const defaults: AppConfig = {
  host: 'localhost',
  port: 1433,
  database: '',
  user: '',
  password: '',
  encrypt: true,
  trustServerCertificate: false,

  serverPort: 3000,
  listenHost: '127.0.0.1',
  readonly: true,
  cors: true,
  corsOrigin: '*',

  schemas: ['dbo'],
  excludeTables: [],

  defaultPageSize: 100,
  maxPageSize: 1000,

  logLevel: 'info',
};

function loadConfigFile(): Partial<AppConfig> {
  const explorer = cosmiconfigSync('mssqlrest');
  const result = explorer.search();
  if (result && result.config) {
    return result.config as Partial<AppConfig>;
  }
  return {};
}

function loadEnvConfig(): Partial<AppConfig> {
  const env: Partial<AppConfig> = {};

  if (process.env['MSSQLREST_HOST']) env.host = process.env['MSSQLREST_HOST'];
  if (process.env['MSSQLREST_PORT']) env.port = parseInt(process.env['MSSQLREST_PORT'], 10);
  if (process.env['MSSQLREST_DATABASE']) env.database = process.env['MSSQLREST_DATABASE'];
  if (process.env['MSSQLREST_USER']) env.user = process.env['MSSQLREST_USER'];
  if (process.env['MSSQLREST_PASSWORD']) env.password = process.env['MSSQLREST_PASSWORD'];
  if (process.env['MSSQLREST_ENCRYPT']) env.encrypt = process.env['MSSQLREST_ENCRYPT'] === 'true';
  if (process.env['MSSQLREST_TRUST_SERVER_CERTIFICATE'])
    env.trustServerCertificate = process.env['MSSQLREST_TRUST_SERVER_CERTIFICATE'] === 'true';
  if (process.env['MSSQLREST_SERVER_PORT'])
    env.serverPort = parseInt(process.env['MSSQLREST_SERVER_PORT'], 10);
  if (process.env['MSSQLREST_READONLY'])
    env.readonly = process.env['MSSQLREST_READONLY'] !== 'false';
  if (process.env['MSSQLREST_LISTEN_HOST']) env.listenHost = process.env['MSSQLREST_LISTEN_HOST'];
  if (process.env['MSSQLREST_CORS']) env.cors = process.env['MSSQLREST_CORS'] !== 'false';
  if (process.env['MSSQLREST_CORS_ORIGIN']) env.corsOrigin = process.env['MSSQLREST_CORS_ORIGIN'];
  if (process.env['MSSQLREST_SCHEMAS'])
    env.schemas = process.env['MSSQLREST_SCHEMAS'].split(',').map((s) => s.trim());
  if (process.env['MSSQLREST_EXCLUDE_TABLES'])
    env.excludeTables = process.env['MSSQLREST_EXCLUDE_TABLES'].split(',').map((s) => s.trim());
  if (process.env['MSSQLREST_DEFAULT_PAGE_SIZE'])
    env.defaultPageSize = parseInt(process.env['MSSQLREST_DEFAULT_PAGE_SIZE'], 10);
  if (process.env['MSSQLREST_MAX_PAGE_SIZE'])
    env.maxPageSize = parseInt(process.env['MSSQLREST_MAX_PAGE_SIZE'], 10);
  if (process.env['MSSQLREST_LOG_LEVEL'])
    env.logLevel = process.env['MSSQLREST_LOG_LEVEL'] as AppConfig['logLevel'];

  return env;
}

export function loadConfig(cliOverrides: Partial<AppConfig> = {}): AppConfig {
  const fileConfig = loadConfigFile();
  const envConfig = loadEnvConfig();

  // Precedence: CLI > env > config file > defaults
  const config: AppConfig = {
    ...defaults,
    ...fileConfig,
    ...envConfig,
    ...cliOverrides,
  };

  return config;
}
