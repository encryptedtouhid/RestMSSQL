import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { setupApp, teardownApp } from './setup.js';

describe('Stored Procedures', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('POST /rpc/GetProductsByCategory executes procedure', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/rpc/GetProductsByCategory',
      payload: { CategoryId: 1 },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value).toBeInstanceOf(Array);
    expect(body.value.length).toBeGreaterThan(0);
    for (const item of body.value) {
      expect(item.CategoryId).toBe(1);
    }
  });

  it('POST /rpc/GetProductsByCategory with XML response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/rpc/GetProductsByCategory',
      payload: { CategoryId: 1 },
      headers: { accept: 'application/xml' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toContain('<?xml');
  });
});
