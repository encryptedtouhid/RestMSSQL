import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { setupApp, teardownApp } from './setup.js';

describe('Read-only Mode', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupApp({ readonly: true });
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('GET /api/Products works in readonly mode', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products',
    });

    expect(response.statusCode).toBe(200);
  });

  it('POST /api/Products returns 405 in readonly mode', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/Products',
      payload: { Name: 'Test', Price: 10, CategoryId: 1 },
    });

    expect(response.statusCode).toBe(405);
  });

  it('PATCH /api/Products/1 returns 405 in readonly mode', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/Products/1',
      payload: { Name: 'Updated' },
    });

    expect(response.statusCode).toBe(405);
  });

  it('DELETE /api/Products/1 returns 405 in readonly mode', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/Products/1',
    });

    expect(response.statusCode).toBe(405);
  });
});
