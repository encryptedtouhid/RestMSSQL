import { XMLBuilder } from 'fast-xml-parser';
import type { DatabaseSchema, TableInfo } from '../introspection/types.js';
import { mapSqlTypeToOData } from '../db/types.js';

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  suppressEmptyNode: false,
});

export function generateODataMetadata(schema: DatabaseSchema): string {
  const entityTypes = [...schema.tables, ...schema.views].map(buildEntityType);

  const entitySets = [...schema.tables, ...schema.views].map((t) => ({
    '@_Name': t.schema === 'dbo' ? t.name : `${t.schema}_${t.name}`,
    '@_EntityType': `Default.${t.name}`,
  }));

  const functionImports = schema.procedures.map((p) => ({
    '@_Name': p.name,
    Parameter: p.parameters.map((param) => ({
      '@_Name': param.name,
      '@_Type': mapSqlTypeToOData(param.sqlType),
      '@_Nullable': 'true',
    })),
  }));

  const metadata = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    'edmx:Edmx': {
      '@_Version': '4.0',
      '@_xmlns:edmx': 'http://docs.oasis-open.org/odata/ns/edmx',
      'edmx:DataServices': {
        Schema: {
          '@_Namespace': 'Default',
          '@_xmlns': 'http://docs.oasis-open.org/odata/ns/edm',
          EntityType: entityTypes,
          EntityContainer: {
            '@_Name': 'DefaultContainer',
            EntitySet: entitySets,
            ...(functionImports.length > 0 ? { FunctionImport: functionImports } : {}),
          },
        },
      },
    },
  };

  return builder.build(metadata) as string;
}

function buildEntityType(table: TableInfo) {
  const properties = table.columns.map((col) => ({
    '@_Name': col.name,
    '@_Type': mapSqlTypeToOData(col.sqlType),
    '@_Nullable': col.nullable ? 'true' : 'false',
    ...(col.maxLength && col.maxLength > 0 ? { '@_MaxLength': col.maxLength.toString() } : {}),
    ...(col.precision ? { '@_Precision': col.precision.toString() } : {}),
    ...(col.scale ? { '@_Scale': col.scale.toString() } : {}),
  }));

  const key =
    table.primaryKey.length > 0
      ? { PropertyRef: table.primaryKey.map((pk) => ({ '@_Name': pk })) }
      : undefined;

  return {
    '@_Name': table.name,
    ...(key ? { Key: key } : {}),
    Property: properties,
  };
}
