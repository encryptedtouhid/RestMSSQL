import type sql from 'mssql';
import type { ColumnInfo } from './types.js';
import { mapSqlTypeToJs, mapSqlTypeToOData } from '../db/types.js';

interface ColumnRow {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  COLUMN_NAME: string;
  DATA_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_DEFAULT: string | null;
  CHARACTER_MAXIMUM_LENGTH: number | null;
  NUMERIC_PRECISION: number | null;
  NUMERIC_SCALE: number | null;
  IS_IDENTITY: number;
}

export async function discoverColumns(
  pool: sql.ConnectionPool,
  schema: string,
  table: string,
): Promise<ColumnInfo[]> {
  const result = await pool.request().input('schema', schema).input('table', table)
    .query<ColumnRow>(`
      SELECT
        c.TABLE_SCHEMA,
        c.TABLE_NAME,
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.IS_NULLABLE,
        c.COLUMN_DEFAULT,
        c.CHARACTER_MAXIMUM_LENGTH,
        c.NUMERIC_PRECISION,
        c.NUMERIC_SCALE,
        CASE WHEN ic.object_id IS NOT NULL THEN 1 ELSE 0 END AS IS_IDENTITY
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN sys.identity_columns ic
        ON ic.object_id = OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME))
        AND ic.name = c.COLUMN_NAME
      WHERE c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @table
      ORDER BY c.ORDINAL_POSITION
    `);

  return result.recordset.map((row) => ({
    name: row.COLUMN_NAME,
    sqlType: row.DATA_TYPE,
    jsType: mapSqlTypeToJs(row.DATA_TYPE),
    odataType: mapSqlTypeToOData(row.DATA_TYPE),
    nullable: row.IS_NULLABLE === 'YES',
    hasDefault: row.COLUMN_DEFAULT !== null,
    isIdentity: row.IS_IDENTITY === 1,
    maxLength: row.CHARACTER_MAXIMUM_LENGTH,
    precision: row.NUMERIC_PRECISION,
    scale: row.NUMERIC_SCALE,
  }));
}

export async function discoverPrimaryKeys(
  pool: sql.ConnectionPool,
  schema: string,
  table: string,
): Promise<string[]> {
  const result = await pool.request().input('schema', schema).input('table', table).query<{
    COLUMN_NAME: string;
  }>(`
      SELECT ccu.COLUMN_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
        ON tc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA = ccu.TABLE_SCHEMA
      WHERE tc.TABLE_SCHEMA = @schema
        AND tc.TABLE_NAME = @table
        AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      ORDER BY ccu.COLUMN_NAME
    `);

  return result.recordset.map((row) => row.COLUMN_NAME);
}
