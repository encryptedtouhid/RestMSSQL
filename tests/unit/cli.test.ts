import { describe, it, expect } from 'vitest';
import { parseCliArgs } from '../../src/cli.js';

describe('parseCliArgs', () => {
  it('parses --connection string with standard keys', () => {
    const config = parseCliArgs([
      'node',
      'test',
      '--connection',
      'Server=myhost;Database=mydb;User Id=sa;Password=secret',
    ]);
    expect(config.host).toBe('myhost');
    expect(config.database).toBe('mydb');
    expect(config.user).toBe('sa');
    expect(config.password).toBe('secret');
  });

  it('parses --connection with server,port syntax', () => {
    const config = parseCliArgs([
      'node',
      'test',
      '--connection',
      'Server=myhost,2433;Database=mydb;User Id=sa;Password=secret',
    ]);
    expect(config.host).toBe('myhost');
    expect(config.port).toBe(2433);
  });

  it('parses --connection with alternate key names', () => {
    const config = parseCliArgs([
      'node',
      'test',
      '--connection',
      'Data Source=myhost;Initial Catalog=mydb;UID=sa;PWD=secret',
    ]);
    expect(config.host).toBe('myhost');
    expect(config.database).toBe('mydb');
    expect(config.user).toBe('sa');
    expect(config.password).toBe('secret');
  });

  it('parses --connection with encrypt and trust', () => {
    const config = parseCliArgs([
      'node',
      'test',
      '--connection',
      'Server=host;Database=db;User Id=sa;Password=p;Encrypt=true;TrustServerCertificate=true',
    ]);
    expect(config.encrypt).toBe(true);
    expect(config.trustServerCertificate).toBe(true);
  });

  it('explicit flags override --connection values', () => {
    const config = parseCliArgs([
      'node',
      'test',
      '--connection',
      'Server=connhost;Database=conndb;User Id=sa;Password=secret',
      '--host',
      'overridehost',
    ]);
    expect(config.host).toBe('overridehost');
    expect(config.database).toBe('conndb');
  });
});
