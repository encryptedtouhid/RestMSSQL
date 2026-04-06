import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { setupApp, teardownApp } from './setup.js';

describe('OData Filtering', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('$filter with eq', async () => {
    const response = await app.inject({
      method: 'GET',
      url: "/api/Products?$filter=Name eq 'Laptop'",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(1);
    expect(body.value[0].Name).toBe('Laptop');
  });

  it('$filter with gt', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products?$filter=Price gt 100',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    for (const item of body.value) {
      expect(item.Price).toBeGreaterThan(100);
    }
  });

  it('$filter with and', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products?$filter=Price gt 10 and InStock eq true',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    for (const item of body.value) {
      expect(item.Price).toBeGreaterThan(10);
      expect(item.InStock).toBe(true);
    }
  });

  it('$filter with contains', async () => {
    const response = await app.inject({
      method: 'GET',
      url: "/api/Products?$filter=contains(Name,'phone')",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBeGreaterThan(0);
    for (const item of body.value) {
      expect(item.Name.toLowerCase()).toContain('phone');
    }
  });

  it('$select returns only specified columns', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products?$select=Name,Price',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBeGreaterThan(0);
    const keys = Object.keys(body.value[0]);
    expect(keys).toContain('Name');
    expect(keys).toContain('Price');
    expect(keys).not.toContain('Id');
  });

  it('$orderby sorts results', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products?$orderby=Price desc',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    for (let i = 1; i < body.value.length; i++) {
      expect(body.value[i - 1].Price).toBeGreaterThanOrEqual(body.value[i].Price);
    }
  });

  it('$top limits results', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products?$top=3&$orderby=Id',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(3);
  });

  it('$skip skips results', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products?$skip=2&$top=3&$orderby=Id',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value[0].Id).toBe(3);
  });

  it('$count includes total count', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products?$count=true',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body['@odata.count']).toBeGreaterThan(0);
  });

  it('invalid $filter returns 400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products?$filter=invalid syntax !!!',
    });

    expect(response.statusCode).toBe(400);
  });
});
