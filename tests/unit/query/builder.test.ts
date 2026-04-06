import { describe, it, expect } from 'vitest';
import {
  buildSelectQuery,
  buildCountQuery,
  buildSingleRowQuery,
} from '../../../src/query/builder.js';
import type { TableInfo } from '../../../src/introspection/types.js';
import type { ODataQuery } from '../../../src/odata/types.js';

const mockTable: TableInfo = {
  schema: 'dbo',
  name: 'Products',
  type: 'TABLE',
  columns: [
    {
      name: 'Id',
      sqlType: 'int',
      jsType: 'number',
      odataType: 'Edm.Int32',
      nullable: false,
      hasDefault: false,
      isIdentity: true,
      maxLength: null,
      precision: 10,
      scale: 0,
    },
    {
      name: 'Name',
      sqlType: 'nvarchar',
      jsType: 'string',
      odataType: 'Edm.String',
      nullable: false,
      hasDefault: false,
      isIdentity: false,
      maxLength: 200,
      precision: null,
      scale: null,
    },
    {
      name: 'Price',
      sqlType: 'decimal',
      jsType: 'number',
      odataType: 'Edm.Decimal',
      nullable: false,
      hasDefault: false,
      isIdentity: false,
      maxLength: null,
      precision: 10,
      scale: 2,
    },
    {
      name: 'CategoryId',
      sqlType: 'int',
      jsType: 'number',
      odataType: 'Edm.Int32',
      nullable: false,
      hasDefault: false,
      isIdentity: false,
      maxLength: null,
      precision: 10,
      scale: 0,
    },
    {
      name: 'InStock',
      sqlType: 'bit',
      jsType: 'boolean',
      odataType: 'Edm.Boolean',
      nullable: true,
      hasDefault: true,
      isIdentity: false,
      maxLength: null,
      precision: null,
      scale: null,
    },
  ],
  primaryKey: ['Id'],
};

describe('buildSelectQuery', () => {
  it('builds basic SELECT *', () => {
    const query: ODataQuery = {};
    const result = buildSelectQuery(mockTable, query, 100);
    expect(result.sql).toBe('SELECT TOP 100 * FROM [dbo].[Products]');
    expect(result.parameters.size).toBe(0);
  });

  it('builds SELECT with $select', () => {
    const query: ODataQuery = { select: { columns: ['Name', 'Price'] } };
    const result = buildSelectQuery(mockTable, query, 100);
    expect(result.sql).toBe('SELECT TOP 100 [Name], [Price] FROM [dbo].[Products]');
  });

  it('builds SELECT with $filter', () => {
    const query: ODataQuery = {
      filter: {
        type: 'comparison',
        operator: 'gt',
        left: { type: 'property', name: 'Price' },
        right: { type: 'literal', value: 10 },
      },
    };
    const result = buildSelectQuery(mockTable, query, 100);
    expect(result.sql).toContain('WHERE [Price] > @p0');
    expect(result.parameters.get('p0')).toBe(10);
  });

  it('builds SELECT with $orderby and pagination', () => {
    const query: ODataQuery = {
      orderBy: { items: [{ column: 'Price', direction: 'desc' }] },
      pagination: { top: 10, skip: 20 },
    };
    const result = buildSelectQuery(mockTable, query, 100);
    expect(result.sql).toContain('ORDER BY [Price] DESC');
    expect(result.sql).toContain('OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY');
  });

  it('builds WHERE with AND', () => {
    const query: ODataQuery = {
      filter: {
        type: 'logical',
        operator: 'and',
        left: {
          type: 'comparison',
          operator: 'gt',
          left: { type: 'property', name: 'Price' },
          right: { type: 'literal', value: 10 },
        },
        right: {
          type: 'comparison',
          operator: 'eq',
          left: { type: 'property', name: 'InStock' },
          right: { type: 'literal', value: true },
        },
      },
    };
    const result = buildSelectQuery(mockTable, query, 100);
    expect(result.sql).toContain('WHERE ([Price] > @p0 AND [InStock] = @p1)');
    expect(result.parameters.get('p0')).toBe(10);
    expect(result.parameters.get('p1')).toBe(true);
  });

  it('handles NULL comparison', () => {
    const query: ODataQuery = {
      filter: {
        type: 'comparison',
        operator: 'eq',
        left: { type: 'property', name: 'InStock' },
        right: { type: 'literal', value: null },
      },
    };
    const result = buildSelectQuery(mockTable, query, 100);
    expect(result.sql).toContain('WHERE [InStock] IS NULL');
  });

  it('handles contains function', () => {
    const query: ODataQuery = {
      filter: {
        type: 'function',
        name: 'contains',
        args: [
          { type: 'property', name: 'Name' },
          { type: 'literal', value: 'widget' },
        ],
      },
    };
    const result = buildSelectQuery(mockTable, query, 100);
    expect(result.sql).toContain(
      "WHERE [Name] LIKE '%' + REPLACE(REPLACE(REPLACE(@p0, '[', '[[]'), '%', '[%]'), '_', '[_]') + '%'",
    );
    expect(result.parameters.get('p0')).toBe('widget');
  });

  it('throws on non-existent column in $select', () => {
    const query: ODataQuery = { select: { columns: ['NonExistent'] } };
    expect(() => buildSelectQuery(mockTable, query, 100)).toThrow(
      "Column 'NonExistent' does not exist",
    );
  });
});

describe('buildCountQuery', () => {
  it('builds COUNT query', () => {
    const query: ODataQuery = {};
    const result = buildCountQuery(mockTable, query);
    expect(result.sql).toBe('SELECT COUNT(*) AS [count] FROM [dbo].[Products]');
  });

  it('builds COUNT with filter', () => {
    const query: ODataQuery = {
      filter: {
        type: 'comparison',
        operator: 'eq',
        left: { type: 'property', name: 'InStock' },
        right: { type: 'literal', value: true },
      },
    };
    const result = buildCountQuery(mockTable, query);
    expect(result.sql).toContain('WHERE [InStock] = @p0');
  });
});

describe('buildSingleRowQuery', () => {
  it('builds single row query by PK', () => {
    const pkValues = new Map([['Id', '5']]);
    const result = buildSingleRowQuery(mockTable, pkValues);
    expect(result.sql).toContain('WHERE [Id] = @p0');
    expect(result.parameters.get('p0')).toBe('5');
  });
});
