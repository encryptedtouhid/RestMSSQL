import type { DatabaseSchema, TableInfo, ProcedureInfo } from '../introspection/types.js';
import type { AppConfig } from '../config.js';

interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: { url: string }[];
  paths: Record<string, unknown>;
  components: { schemas: Record<string, unknown> };
}

export function generateOpenApiSpec(schema: DatabaseSchema, config: AppConfig): OpenApiSpec {
  const paths: Record<string, unknown> = {};
  const schemas: Record<string, unknown> = {};

  // Tables
  for (const table of schema.tables) {
    const name = table.schema === 'dbo' ? table.name : `${table.schema}.${table.name}`;
    const path = `/api/${name}`;
    schemas[table.name] = buildComponentSchema(table);
    paths[path] = buildTablePaths(table, config.readonly);

    if (table.primaryKey.length > 0) {
      paths[`${path}/{id}`] = buildTableItemPaths(table, config.readonly);
    }
  }

  // Views
  for (const view of schema.views) {
    const name = view.schema === 'dbo' ? view.name : `${view.schema}.${view.name}`;
    const path = `/api/${name}`;
    schemas[view.name] = buildComponentSchema(view);
    paths[path] = {
      get: buildGetOperation(view),
    };
  }

  // Procedures
  for (const proc of schema.procedures) {
    const name = proc.schema === 'dbo' ? proc.name : `${proc.schema}.${proc.name}`;
    paths[`/rpc/${name}`] = {
      post: buildProcedureOperation(proc),
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: `${config.database} API`,
      version: '1.0.0',
      description: `Auto-generated REST API for ${config.database} database`,
    },
    servers: [{ url: `http://localhost:${config.serverPort}` }],
    paths,
    components: { schemas },
  };
}

function buildComponentSchema(table: TableInfo) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const col of table.columns) {
    properties[col.name] = {
      type: mapJsTypeToOpenApi(col.jsType),
      nullable: col.nullable,
    };

    if (!col.nullable && !col.hasDefault && !col.isIdentity) {
      required.push(col.name);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function buildGetOperation(table: TableInfo) {
  return {
    summary: `Get ${table.name}`,
    parameters: [
      {
        name: '$filter',
        in: 'query',
        schema: { type: 'string' },
        description: 'OData filter expression',
      },
      {
        name: '$select',
        in: 'query',
        schema: { type: 'string' },
        description: 'Comma-separated list of columns',
      },
      {
        name: '$orderby',
        in: 'query',
        schema: { type: 'string' },
        description: 'Order by columns',
      },
      {
        name: '$top',
        in: 'query',
        schema: { type: 'integer' },
        description: 'Number of records to return',
      },
      {
        name: '$skip',
        in: 'query',
        schema: { type: 'integer' },
        description: 'Number of records to skip',
      },
      {
        name: '$count',
        in: 'query',
        schema: { type: 'boolean' },
        description: 'Include total count',
      },
      {
        name: '$expand',
        in: 'query',
        schema: { type: 'string' },
        description: 'Related entities to include',
      },
    ],
    responses: {
      '200': {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                value: {
                  type: 'array',
                  items: { $ref: `#/components/schemas/${table.name}` },
                },
              },
            },
          },
        },
      },
    },
  };
}

function buildTablePaths(table: TableInfo, readonly: boolean) {
  const paths: Record<string, unknown> = {
    get: buildGetOperation(table),
  };

  if (!readonly) {
    paths['post'] = {
      summary: `Create ${table.name}`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${table.name}` },
          },
        },
      },
      responses: {
        '201': {
          description: 'Created',
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${table.name}` },
            },
          },
        },
      },
    };
  }

  return paths;
}

function buildTableItemPaths(table: TableInfo, readonly: boolean) {
  const paths: Record<string, unknown> = {
    get: {
      summary: `Get ${table.name} by ID`,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${table.name}` },
            },
          },
        },
        '404': { description: 'Not found' },
      },
    },
  };

  if (!readonly) {
    paths['patch'] = {
      summary: `Update ${table.name}`,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${table.name}` },
          },
        },
      },
      responses: {
        '200': { description: 'Updated' },
        '404': { description: 'Not found' },
      },
    };

    paths['put'] = {
      summary: `Replace ${table.name}`,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${table.name}` },
          },
        },
      },
      responses: {
        '200': { description: 'Replaced' },
        '404': { description: 'Not found' },
      },
    };

    paths['delete'] = {
      summary: `Delete ${table.name}`,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Deleted' },
        '404': { description: 'Not found' },
      },
    };
  }

  return paths;
}

function buildProcedureOperation(proc: ProcedureInfo) {
  const properties: Record<string, unknown> = {};
  for (const param of proc.parameters) {
    properties[param.name] = {
      type: mapJsTypeToOpenApi(param.jsType),
    };
  }

  return {
    summary: `Execute ${proc.name}`,
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                value: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
  };
}

function mapJsTypeToOpenApi(jsType: string): string {
  switch (jsType) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'string';
  }
}
