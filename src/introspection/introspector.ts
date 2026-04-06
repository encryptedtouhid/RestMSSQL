import type sql from 'mssql';
import type { AppConfig } from '../config.js';
import type { DatabaseSchema, TableInfo } from './types.js';
import { discoverTables } from './tables.js';
import { discoverColumns, discoverPrimaryKeys } from './columns.js';
import { discoverRelationships } from './relationships.js';
import { discoverProcedures } from './procedures.js';

export async function introspectDatabase(
  pool: sql.ConnectionPool,
  config: AppConfig,
): Promise<DatabaseSchema> {
  // Run independent queries in parallel
  const [rawTables, relationships, procedures] = await Promise.all([
    discoverTables(pool, config.schemas, config.excludeTables),
    discoverRelationships(pool, config.schemas),
    discoverProcedures(pool, config.schemas),
  ]);

  // Batch column and PK discovery in parallel per table
  const tableInfos = await Promise.all(
    rawTables.map(async (raw) => {
      const [columns, primaryKey] = await Promise.all([
        discoverColumns(pool, raw.schema, raw.name),
        raw.type === 'TABLE'
          ? discoverPrimaryKeys(pool, raw.schema, raw.name)
          : Promise.resolve([]),
      ]);

      return {
        schema: raw.schema,
        name: raw.name,
        type: raw.type,
        columns,
        primaryKey,
      } as TableInfo;
    }),
  );

  const tables = tableInfos.filter((t) => t.type === 'TABLE');
  const views = tableInfos.filter((t) => t.type === 'VIEW');

  return { tables, views, relationships, procedures };
}
