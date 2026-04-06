import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { setupApp, teardownApp } from './setup.js';

describe('Multi-Schema Support', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  // ---- dbo schema (default, accessible without prefix) ----
  it('dbo tables accessible without schema prefix', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/Products' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(15);
  });

  it('dbo tables accessible with schema prefix', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/dbo.Products' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(15);
  });

  // ---- sales schema ----
  it('GET /api/sales.Customers', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/sales.Customers' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(7);
    expect(body.value[0]).toHaveProperty('FirstName');
    expect(body.value[0]).toHaveProperty('Email');
  });

  it('GET /api/sales.Orders', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/sales.Orders' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(8);
  });

  it('GET /api/sales.OrderItems', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/sales.OrderItems' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(15);
  });

  // ---- hr schema ----
  it('GET /api/hr.Departments', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/hr.Departments' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(5);
  });

  it('GET /api/hr.Employees', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/hr.Employees' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(10);
  });

  it('GET /api/hr.PerformanceReviews', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/hr.PerformanceReviews' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(8);
  });

  // ---- inventory schema ----
  it('GET /api/inventory.Warehouses', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/inventory.Warehouses' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(4);
  });

  it('GET /api/inventory.StockLevels (composite PK)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/inventory.StockLevels' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(14);
    expect(body.value[0]).toHaveProperty('WarehouseId');
    expect(body.value[0]).toHaveProperty('ProductId');
    expect(body.value[0]).toHaveProperty('Quantity');
  });

  it('GET /api/inventory.Transfers (nullable FK)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/inventory.Transfers' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(6);
    // One transfer has NULL ToWarehouseId
    const nullTransfer = body.value.find((t: Record<string, unknown>) => t.ToWarehouseId === null);
    expect(nullTransfer).toBeDefined();
  });

  // ---- finance schema ----
  it('GET /api/finance.Accounts', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/finance.Accounts' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(5);
    expect(body.value[0]).toHaveProperty('Balance');
    expect(body.value[0]).toHaveProperty('Currency');
  });

  it('GET /api/finance.Transactions (bigint PK)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/finance.Transactions' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(10);
    expect(body.value[0]).toHaveProperty('ReferenceId'); // GUID
    expect(body.value[0]).toHaveProperty('TransactionDate'); // DATETIMEOFFSET
  });

  // ---- content schema (GUID-based PKs) ----
  it('GET /api/content.Authors (GUID PK)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/content.Authors' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(3);
    // GUID format check
    expect(body.value[0].Id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('GET /api/content.Articles (GUID FK + XML column)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/content.Articles' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(4);

    const published = body.value.find(
      (a: Record<string, unknown>) => a.Title === 'Getting Started with SQL Server',
    );
    expect(published.ViewCount).toBe(1523);
    expect(published.IsPublished).toBe(true);
    expect(published.Metadata).toContain('<meta>');
  });

  it('GET /api/content.Comments (self-referencing)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/content.Comments' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(7);

    // Some comments have ParentCommentId, some don't
    const topLevel = body.value.filter((c: Record<string, unknown>) => c.ParentCommentId === null);
    const replies = body.value.filter((c: Record<string, unknown>) => c.ParentCommentId !== null);
    expect(topLevel.length).toBeGreaterThan(0);
    expect(replies.length).toBeGreaterThan(0);
  });

  // ---- Views across schemas ----
  it('GET /api/dbo.ProductSummary (view)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/ProductSummary' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(15);
    expect(body.value[0]).toHaveProperty('CategoryName');
  });

  it('GET /api/sales.OrderSummary (cross-table view)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/sales.OrderSummary' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(8);
    expect(body.value[0]).toHaveProperty('CustomerName');
    expect(body.value[0]).toHaveProperty('ItemCount');
  });

  it('GET /api/hr.EmployeeDirectory (self-join view)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/hr.EmployeeDirectory' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(10);
    expect(body.value[0]).toHaveProperty('FullName');
    expect(body.value[0]).toHaveProperty('Department');
  });

  it('GET /api/inventory.WarehouseStock (multi-join view)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/inventory.WarehouseStock' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(14);
    expect(body.value[0]).toHaveProperty('WarehouseName');
    expect(body.value[0]).toHaveProperty('ProductName');
  });

  // ---- Filtering across schemas ----
  it('$filter on sales schema', async () => {
    const response = await app.inject({
      method: 'GET',
      url: "/api/sales.Orders?$filter=Status eq 'pending'",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(2);
  });

  it('$filter on hr schema with boolean', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/hr.Employees?$filter=IsActive eq false',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(1);
    expect(body.value[0].FirstName).toBe('Bob');
  });

  it('$filter on finance with money type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/finance.Accounts?$filter=Balance gt 500000',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(2); // Operating + Savings
  });

  it('$filter on finance transactions with string filter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: "/api/finance.Transactions?$filter=TransactionType eq 'credit'",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    for (const t of body.value) {
      expect(t.TransactionType).toBe('credit');
    }
  });

  it('$orderby + $top on inventory', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/inventory.StockLevels?$orderby=Quantity desc&$top=3',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(3);
    expect(body.value[0].Quantity).toBeGreaterThanOrEqual(body.value[1].Quantity);
    expect(body.value[1].Quantity).toBeGreaterThanOrEqual(body.value[2].Quantity);
  });

  it('$count on content.Articles', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/content.Articles?$count=true&$filter=IsPublished eq true',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body['@odata.count']).toBe(3);
  });

  // ---- Service document lists all schemas ----
  it('/api service document includes all schemas', async () => {
    const response = await app.inject({ method: 'GET', url: '/api' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    const names = body.value.map((v: { name: string }) => v.name);

    // dbo tables (no prefix)
    expect(names).toContain('Products');
    expect(names).toContain('Categories');
    expect(names).toContain('Tags');
    expect(names).toContain('AllDataTypes');

    // Other schemas
    expect(names).toContain('sales.Customers');
    expect(names).toContain('sales.Orders');
    expect(names).toContain('hr.Employees');
    expect(names).toContain('hr.Departments');
    expect(names).toContain('inventory.Warehouses');
    expect(names).toContain('inventory.StockLevels');
    expect(names).toContain('finance.Accounts');
    expect(names).toContain('finance.Transactions');
    expect(names).toContain('content.Authors');
    expect(names).toContain('content.Articles');
    expect(names).toContain('content.Comments');

    // Views
    expect(names).toContain('ProductSummary');
    expect(names).toContain('sales.OrderSummary');
    expect(names).toContain('hr.EmployeeDirectory');
    expect(names).toContain('inventory.WarehouseStock');
  });

  // ---- $metadata includes all entity types ----
  it('$metadata includes entity types from all schemas', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/$metadata' });
    expect(response.statusCode).toBe(200);
    const xml = response.payload;

    expect(xml).toContain('Products');
    expect(xml).toContain('AllDataTypes');
    expect(xml).toContain('Customers');
    expect(xml).toContain('Employees');
    expect(xml).toContain('Warehouses');
    expect(xml).toContain('Accounts');
    expect(xml).toContain('Authors');
    expect(xml).toContain('Articles');
  });
});
