import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { setupApp, teardownApp } from './setup.js';

describe('CRUD Operations', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupApp({ readonly: false });
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('GET /api/Products returns product list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value).toBeInstanceOf(Array);
    expect(body.value.length).toBeGreaterThan(0);
  });

  it('GET /api/Products/1 returns single product', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products/1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.Id).toBe(1);
  });

  it('GET /api/Products/99999 returns 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products/99999',
    });

    expect(response.statusCode).toBe(404);
  });

  it('POST /api/Categories creates a new category', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/Categories',
      payload: { Name: 'Test Category', Description: 'Integration test' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.Name).toBe('Test Category');
    expect(body.Id).toBeDefined();
  });

  it('PATCH /api/Categories/:id updates a category', async () => {
    // First create
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/Categories',
      payload: { Name: 'ToUpdate' },
    });
    const created = JSON.parse(createResponse.payload);

    // Then update
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/Categories/${created.Id}`,
      payload: { Name: 'Updated' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.Name).toBe('Updated');
  });

  it('DELETE /api/Categories/:id deletes a category', async () => {
    // First create
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/Categories',
      payload: { Name: 'ToDelete' },
    });
    const created = JSON.parse(createResponse.payload);

    // Then delete
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/Categories/${created.Id}`,
    });

    expect(response.statusCode).toBe(200);

    // Verify deleted
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/Categories/${created.Id}`,
    });
    expect(getResponse.statusCode).toBe(404);
  });

  it('GET /api/dbo.Products also works for dbo schema', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/dbo.Products',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value).toBeInstanceOf(Array);
  });

  it('GET /api/sales.Orders works for non-dbo schema', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/sales.Orders',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value).toBeInstanceOf(Array);
  });
});
