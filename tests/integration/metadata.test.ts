import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { setupApp, teardownApp } from './setup.js';

describe('Metadata Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('GET /api/$metadata returns OData CSDL XML', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/$metadata',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.payload).toContain('edmx:Edmx');
    expect(response.payload).toContain('EntityType');
    expect(response.payload).toContain('EntitySet');
  });

  it('GET /api/openapi.json returns OpenAPI spec', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/openapi.json',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.openapi).toBe('3.0.3');
    expect(body.paths['/api/Products']).toBeDefined();
    expect(body.components.schemas['Products']).toBeDefined();
  });

  it('GET /api returns service document', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value).toBeInstanceOf(Array);
    expect(body.value.length).toBeGreaterThan(0);

    const productSet = body.value.find((v: { name: string }) => v.name === 'Products');
    expect(productSet).toBeDefined();
    expect(productSet.kind).toBe('EntitySet');
  });
});
