import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { setupApp, teardownApp } from './setup.js';

describe('Content Negotiation', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('returns JSON by default', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    const body = JSON.parse(response.payload);
    expect(body.value).toBeDefined();
  });

  it('returns XML when Accept: application/xml', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products',
      headers: { accept: 'application/xml' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.payload).toContain('<?xml');
    expect(response.payload).toContain('<feed');
  });

  it('returns XML for text/xml', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products',
      headers: { accept: 'text/xml' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
  });

  it('returns XML for single entity', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products/1',
      headers: { accept: 'application/xml' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toContain('<entry');
  });
});
