import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { setupApp, teardownApp } from './setup.js';

describe('All SQL Server Data Types', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('GET /api/AllDataTypes returns all rows including all types', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/AllDataTypes' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(4);
  });

  it('row with typical values has correct types', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/AllDataTypes?$filter=Id eq 1',
    });
    const body = JSON.parse(response.payload);
    const row = body.value[0];

    // Integer types
    expect(row.ColTinyInt).toBe(255);
    expect(row.ColSmallInt).toBe(32767);
    expect(row.ColInt).toBe(2147483647);
    // BigInt values exceeding JS safe integer range are returned as strings by mssql driver
    expect(row.ColBigInt).toBeDefined();

    // Decimal types
    expect(typeof row.ColDecimal).toBe('number');
    expect(typeof row.ColMoney).toBe('number');

    // Float
    expect(typeof row.ColFloat).toBe('number');
    expect(typeof row.ColReal).toBe('number');

    // Boolean
    expect(row.ColBit).toBe(true);

    // Strings
    expect(typeof row.ColVarchar).toBe('string');
    expect(typeof row.ColNVarchar).toBe('string');

    // Date/Time come back as strings
    expect(row.ColDate).toBeDefined();
    expect(row.ColDateTime2).toBeDefined();

    // GUID
    expect(row.ColUniqueIdentifier).toBeDefined();
    expect(typeof row.ColUniqueIdentifier).toBe('string');

    // XML
    expect(typeof row.ColXml).toBe('string');
    expect(row.ColXml).toContain('<root>');
  });

  it('row with all NULLs returns nulls correctly', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/AllDataTypes?$filter=Id eq 3',
    });
    const body = JSON.parse(response.payload);
    const row = body.value[0];

    expect(row.ColTinyInt).toBeNull();
    expect(row.ColSmallInt).toBeNull();
    expect(row.ColInt).toBeNull();
    expect(row.ColBigInt).toBeNull();
    expect(row.ColDecimal).toBeNull();
    expect(row.ColFloat).toBeNull();
    expect(row.ColBit).toBeNull();
    expect(row.ColVarchar).toBeNull();
    expect(row.ColNVarchar).toBeNull();
    expect(row.ColDate).toBeNull();
    expect(row.ColDateTime2).toBeNull();
    expect(row.ColXml).toBeNull();
    expect(row.ColUniqueIdentifier).toBeDefined(); // has DEFAULT NEWID()
  });

  it('$filter works on integer types', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/AllDataTypes?$filter=ColTinyInt eq 255',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(1);
  });

  it('$filter works on string types', async () => {
    const response = await app.inject({
      method: 'GET',
      url: "/api/AllDataTypes?$filter=contains(ColVarchar,'Hello')",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(1);
  });

  it('$filter with null check', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/AllDataTypes?$filter=ColXml eq null',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(1);
    expect(body.value[0].Id).toBe(3);
  });

  it('$select works on mixed types', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/AllDataTypes?$select=Id,ColBit,ColMoney,ColDate,ColUniqueIdentifier',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    const keys = Object.keys(body.value[0]);
    expect(keys).toEqual(
      expect.arrayContaining(['Id', 'ColBit', 'ColMoney', 'ColDate', 'ColUniqueIdentifier']),
    );
    expect(keys).not.toContain('ColVarchar');
  });

  it('XML response for data types', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/AllDataTypes?$top=1&$orderby=Id',
      headers: { accept: 'application/xml' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.payload).toContain('<?xml');
    expect(response.payload).toContain('d:ColTinyInt');
    expect(response.payload).toContain('d:ColUniqueIdentifier');
  });
});
