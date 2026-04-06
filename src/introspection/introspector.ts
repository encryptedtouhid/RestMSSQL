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
  const rawTables = await discoverTables(pool, config.schemas, config.excludeTables);

  const tables: TableInfo[] = [];
  const views: TableInfo[] = [];

  for (const raw of rawTables) {
    const columns = await discoverColumns(pool, raw.schema, raw.name);
    const primaryKey =
      raw.type === 'TABLE' ? await discoverPrimaryKeys(pool, raw.schema, raw.name) : [];

    const tableInfo: TableInfo = {
      schema: raw.schema,
      name: raw.name,
      type: raw.type,
      columns,
      primaryKey,
    };

    if (raw.type === 'VIEW') {
      views.push(tableInfo);
    } else {
      tables.push(tableInfo);
    }
  }

  const relationships = await discoverRelationships(pool, config.schemas);
  const procedures = await discoverProcedures(pool, config.schemas);

  return { tables, views, relationships, procedures };
}
