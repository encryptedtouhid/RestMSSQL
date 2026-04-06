import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { setupApp, teardownApp } from './setup.js';

describe('Advanced Features', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupApp({ readonly: false });
  });

  afterAll(async () => {
    await teardownApp();
  });

  // ---- Swagger UI ----
  describe('Swagger UI', () => {
    it('GET /swagger redirects or serves Swagger UI', async () => {
      const response = await app.inject({ method: 'GET', url: '/swagger/' });
      // Swagger UI serves HTML
      expect(response.statusCode).toBe(200);
      expect(response.payload).toContain('html');
    });

    it('GET /swagger/json returns OpenAPI spec', async () => {
      const response = await app.inject({ method: 'GET', url: '/swagger/json' });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.openapi).toBeDefined();
    });
  });

  // ---- Composite Primary Keys ----
  describe('Composite Primary Keys', () => {
    it('GET single row by composite PK: StockLevels', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/inventory.StockLevels/WarehouseId=1,ProductId=1',
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.WarehouseId).toBe(1);
      expect(body.ProductId).toBe(1);
      expect(body.Quantity).toBeDefined();
    });

    it('GET composite PK returns 404 for non-existent combo', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/inventory.StockLevels/WarehouseId=99,ProductId=99',
      });
      expect(response.statusCode).toBe(404);
    });

    it('PATCH by composite PK updates row', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/inventory.StockLevels/WarehouseId=1,ProductId=1',
        payload: { Quantity: 999 },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.Quantity).toBe(999);

      // Restore original value
      await app.inject({
        method: 'PATCH',
        url: '/api/inventory.StockLevels/WarehouseId=1,ProductId=1',
        payload: { Quantity: 50 },
      });
    });

    it('invalid composite PK format returns 400', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/inventory.StockLevels/badformat',
      });
      expect(response.statusCode).toBe(400);
    });

    it('single PK still works with /:id syntax', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/Products/1',
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.Id).toBe(1);
    });
  });

  // ---- XML Error Responses ----
  describe('XML Error Responses', () => {
    it('404 error returns XML when Accept: application/xml', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/Products/99999',
        headers: { accept: 'application/xml' },
      });
      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toContain('application/xml');
      expect(response.payload).toContain('m:error');
      expect(response.payload).toContain('NOT_FOUND');
    });

    it('400 error returns XML when Accept: application/xml', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/Products?$filter=!!!invalid',
        headers: { accept: 'application/xml' },
      });
      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toContain('application/xml');
      expect(response.payload).toContain('m:error');
    });

    it('errors return JSON by default', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/Products/99999',
      });
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  // ---- Nested $expand options ----
  describe('Nested $expand Options', () => {
    it('$expand with nested $select', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/Products?$expand=Categories($select=Name)&$top=2&$orderby=Id',
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      for (const product of body.value) {
        if (product.Categories) {
          const keys = Object.keys(product.Categories);
          expect(keys).toContain('Name');
          expect(keys).not.toContain('Description');
        }
      }
    });

    it('$expand with nested $top', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/sales.Customers?$expand=Orders($top=2)&$top=1&$orderby=Id',
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.value.length).toBe(1);
      if (body.value[0].Orders) {
        expect(body.value[0].Orders.length).toBeLessThanOrEqual(2);
      }
    });
  });

  // ---- Write operations across schemas ----
  describe('Write Operations Across Schemas', () => {
    it('POST to sales.Customers', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sales.Customers',
        payload: { FirstName: 'Test', LastName: 'Customer', Email: 'test@test.com' },
      });
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.FirstName).toBe('Test');
      expect(body.Id).toBeDefined();

      // Cleanup
      await app.inject({
        method: 'DELETE',
        url: `/api/sales.Customers/${body.Id}`,
      });
    });

    it('POST to hr.Departments', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/hr.Departments',
        payload: { Name: 'Test Dept', Budget: 100000 },
      });
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.Name).toBe('Test Dept');

      // Cleanup
      await app.inject({
        method: 'DELETE',
        url: `/api/hr.Departments/${body.Id}`,
      });
    });

    it('POST to finance.Accounts', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/finance.Accounts',
        payload: { AccountNumber: 'ACC-TEST', AccountName: 'Test Account', Currency: 'USD' },
      });
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.AccountNumber).toBe('ACC-TEST');

      // Cleanup
      await app.inject({
        method: 'DELETE',
        url: `/api/finance.Accounts/${body.Id}`,
      });
    });
  });
});
