import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { setupApp, teardownApp } from './setup.js';

describe('Relationships and $expand', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  // ---- One-to-Many: Category -> Products ----
  it('$expand Products from Category (one-to-many, same schema)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/Products?$expand=Categories&$filter=Id eq 1',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value[0].Categories).toBeDefined();
  });

  // ---- Cross-schema FK: sales.OrderItems -> dbo.Products ----
  it('cross-schema relationship: OrderItems references Products', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/sales.OrderItems?$expand=Products&$top=3&$orderby=Id',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(3);
    // Each OrderItem should have a Products expand
    for (const item of body.value) {
      expect(item.Products).toBeDefined();
      if (item.Products) {
        expect(item.Products).toHaveProperty('Name');
        expect(item.Products).toHaveProperty('Price');
      }
    }
  });

  // ---- Self-referencing: hr.Employees.ManagerId -> hr.Employees.Id ----
  it('self-referencing FK: Employee -> Manager', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/hr.Employees?$filter=ManagerId ne null&$top=3&$orderby=Id',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    // All returned employees should have a non-null ManagerId
    for (const emp of body.value) {
      expect(emp.ManagerId).not.toBeNull();
    }
  });

  // ---- Many-to-Many junction: ProductTags ----
  it('many-to-many junction table: ProductTags', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/ProductTags',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBeGreaterThan(0);
    expect(body.value[0]).toHaveProperty('ProductId');
    expect(body.value[0]).toHaveProperty('TagId');
  });

  it('$expand Tags from ProductTags', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/ProductTags?$expand=Tags&$top=3&$orderby=ProductId',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    for (const pt of body.value) {
      expect(pt.Tags).toBeDefined();
      if (pt.Tags) {
        expect(pt.Tags).toHaveProperty('Name');
      }
    }
  });

  it('$expand Products from ProductTags', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/ProductTags?$expand=Products&$top=3&$orderby=ProductId',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    for (const pt of body.value) {
      expect(pt.Products).toBeDefined();
      if (pt.Products) {
        expect(pt.Products).toHaveProperty('Name');
        expect(pt.Products).toHaveProperty('Price');
      }
    }
  });

  // ---- Multiple FKs to same table: PerformanceReviews -> Employees (twice) ----
  it('multiple FKs to same table: PerformanceReviews', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/hr.PerformanceReviews?$top=5&$orderby=Id',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(5);
    // Each review has both EmployeeId and ReviewerId
    for (const review of body.value) {
      expect(review.EmployeeId).toBeDefined();
      expect(review.ReviewerId).toBeDefined();
      expect(review.Rating).toBeGreaterThanOrEqual(1);
      expect(review.Rating).toBeLessThanOrEqual(5);
    }
  });

  // ---- Nullable FK: inventory.Transfers.ToWarehouseId ----
  it('nullable FK: Transfers with NULL ToWarehouseId', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/inventory.Transfers?$filter=ToWarehouseId eq null',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(1);
    expect(body.value[0].ToWarehouseId).toBeNull();
    expect(body.value[0].FromWarehouseId).not.toBeNull();
  });

  it('nullable FK: Transfers with non-NULL ToWarehouseId', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/inventory.Transfers?$filter=ToWarehouseId ne null',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(5);
  });

  // ---- Multiple FKs from same table to different tables ----
  it('inventory.Transfers has FKs to both Warehouses and Products', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/inventory.Transfers?$expand=Products&$top=3&$orderby=Id',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    for (const t of body.value) {
      expect(t.Products).toBeDefined();
    }
  });

  // ---- sales.Orders -> sales.Customers FK ----
  it('$expand Customers from Orders', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/sales.Orders?$expand=Customers&$top=3&$orderby=Id',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    for (const order of body.value) {
      expect(order.Customers).toBeDefined();
      if (order.Customers) {
        expect(order.Customers).toHaveProperty('FirstName');
        expect(order.Customers).toHaveProperty('LastName');
      }
    }
  });

  // ---- content.Articles -> content.Authors (GUID FK) ----
  it('$expand Authors from Articles (GUID FK)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/content.Articles?$expand=Authors&$top=2&$orderby=Title',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    for (const article of body.value) {
      expect(article.Authors).toBeDefined();
      if (article.Authors) {
        expect(article.Authors).toHaveProperty('Name');
      }
    }
  });

  // ---- hr.Employees -> hr.Departments FK ----
  it('$expand Departments from Employees', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/hr.Employees?$expand=Departments&$filter=DepartmentId ne null&$top=3&$orderby=Id',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    for (const emp of body.value) {
      expect(emp.Departments).toBeDefined();
      if (emp.Departments) {
        expect(emp.Departments).toHaveProperty('Name');
      }
    }
  });

  // ---- Stored procedures across schemas ----
  it('POST /rpc/sales.GetOrdersByStatus', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/rpc/sales.GetOrdersByStatus',
      payload: { Status: 'shipped' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBeGreaterThan(0);
    for (const order of body.value) {
      expect(order.Status).toBe('shipped');
    }
  });

  it('POST /rpc/hr.GetEmployeesByDepartment', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/rpc/hr.GetEmployeesByDepartment',
      payload: { DepartmentId: 1 },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBeGreaterThan(0);
    for (const emp of body.value) {
      expect(emp.DepartmentId).toBe(1);
      expect(emp.IsActive).toBe(true);
    }
  });

  it('POST /rpc/finance.GetAccountBalance', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/rpc/finance.GetAccountBalance',
      payload: { AccountNumber: 'ACC-001' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.value.length).toBe(1);
    expect(body.value[0].AccountName).toBe('Operating Account');
  });
});
