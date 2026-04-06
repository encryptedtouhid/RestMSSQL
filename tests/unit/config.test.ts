import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear relevant env vars
    Object.keys(process.env)
      .filter((key) => key.startsWith('MSSQLREST_'))
      .forEach((key) => delete process.env[key]);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns defaults when no overrides', () => {
    const config = loadConfig();
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(1433);
    expect(config.serverPort).toBe(3000);
    expect(config.readonly).toBe(true);
    expect(config.cors).toBe(true);
    expect(config.schemas).toEqual(['dbo']);
    expect(config.defaultPageSize).toBe(100);
    expect(config.maxPageSize).toBe(1000);
    expect(config.logLevel).toBe('info');
  });

  it('applies CLI overrides', () => {
    const config = loadConfig({ host: 'myserver', port: 5433, readonly: false });
    expect(config.host).toBe('myserver');
    expect(config.port).toBe(5433);
    expect(config.readonly).toBe(false);
  });

  it('applies env overrides', () => {
    process.env['MSSQLREST_HOST'] = 'envhost';
    process.env['MSSQLREST_PORT'] = '2433';
    const config = loadConfig();
    expect(config.host).toBe('envhost');
    expect(config.port).toBe(2433);
  });

  it('CLI overrides take precedence over env', () => {
    process.env['MSSQLREST_HOST'] = 'envhost';
    const config = loadConfig({ host: 'clihost' });
    expect(config.host).toBe('clihost');
  });

  it('parses schemas from env', () => {
    process.env['MSSQLREST_SCHEMAS'] = 'dbo,sales,hr';
    const config = loadConfig();
    expect(config.schemas).toEqual(['dbo', 'sales', 'hr']);
  });
});
