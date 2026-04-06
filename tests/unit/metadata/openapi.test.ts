import { describe, it, expect } from 'vitest';
import { generateOpenApiSpec } from '../../../src/metadata/openapi.js';
import type { DatabaseSchema } from '../../../src/introspection/types.js';
import type { AppConfig } from '../../../src/config.js';

const mockSchema: DatabaseSchema = {
  tables: [
    {
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
      ],
      primaryKey: ['Id'],
    },
  ],
  views: [
    {
      schema: 'dbo',
      name: 'ProductSummary',
      type: 'VIEW',
      columns: [
        {
          name: 'Id',
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
      ],
      primaryKey: [],
    },
  ],
  relationships: [],
  procedures: [
    {
      schema: 'dbo',
      name: 'GetProducts',
      parameters: [
        { name: 'CategoryId', sqlType: 'int', jsType: 'number', mode: 'IN', hasDefault: false },
      ],
    },
  ],
};

const mockConfig: AppConfig = {
  host: 'localhost',
  port: 1433,
  database: 'testdb',
  user: 'sa',
  password: 'test',
  encrypt: true,
  trustServerCertificate: false,
  serverPort: 3000,
  readonly: true,
  cors: true,
  schemas: ['dbo'],
  excludeTables: [],
  defaultPageSize: 100,
  maxPageSize: 1000,
  logLevel: 'info',
};

describe('generateOpenApiSpec', () => {
  it('generates valid OpenAPI 3.0 spec', () => {
    const spec = generateOpenApiSpec(mockSchema, mockConfig);
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toContain('testdb');
  });

  it('includes table paths', () => {
    const spec = generateOpenApiSpec(mockSchema, mockConfig);
    expect(spec.paths['/api/Products']).toBeDefined();
    expect(spec.paths['/api/Products/{id}']).toBeDefined();
  });

  it('includes view paths', () => {
    const spec = generateOpenApiSpec(mockSchema, mockConfig);
    expect(spec.paths['/api/ProductSummary']).toBeDefined();
  });

  it('includes procedure paths', () => {
    const spec = generateOpenApiSpec(mockSchema, mockConfig);
    expect(spec.paths['/rpc/GetProducts']).toBeDefined();
  });

  it('includes component schemas', () => {
    const spec = generateOpenApiSpec(mockSchema, mockConfig);
    expect(spec.components.schemas['Products']).toBeDefined();
  });

  it('excludes write operations in readonly mode', () => {
    const spec = generateOpenApiSpec(mockSchema, mockConfig);
    const tablePath = spec.paths['/api/Products'] as Record<string, unknown>;
    expect(tablePath['get']).toBeDefined();
    expect(tablePath['post']).toBeUndefined();
  });

  it('includes write operations when not readonly', () => {
    const rwConfig = { ...mockConfig, readonly: false };
    const spec = generateOpenApiSpec(mockSchema, rwConfig);
    const tablePath = spec.paths['/api/Products'] as Record<string, unknown>;
    expect(tablePath['post']).toBeDefined();
  });
});
