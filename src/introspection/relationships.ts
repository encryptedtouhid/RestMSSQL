import type sql from 'mssql';
import type { Relationship } from './types.js';

interface FkRow {
  CONSTRAINT_NAME: string;
  FROM_SCHEMA: string;
  FROM_TABLE: string;
  FROM_COLUMN: string;
  TO_SCHEMA: string;
  TO_TABLE: string;
  TO_COLUMN: string;
}

export async function discoverRelationships(
  pool: sql.ConnectionPool,
  schemas: string[],
): Promise<Relationship[]> {
  const request = pool.request();
  const schemaPlaceholders = schemas.map((_, i) => `@schema${i}`).join(', ');
  schemas.forEach((s, i) => request.input(`schema${i}`, s));

  const result = await request.query<FkRow>(`
    SELECT
      fk.name AS CONSTRAINT_NAME,
      SCHEMA_NAME(tp.schema_id) AS FROM_SCHEMA,
      tp.name AS FROM_TABLE,
      cp.name AS FROM_COLUMN,
      SCHEMA_NAME(tr.schema_id) AS TO_SCHEMA,
      tr.name AS TO_TABLE,
      cr.name AS TO_COLUMN
    FROM sys.foreign_keys fk
    INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    INNER JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
    INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
    INNER JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
    INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
    WHERE SCHEMA_NAME(tp.schema_id) IN (${schemaPlaceholders})
       OR SCHEMA_NAME(tr.schema_id) IN (${schemaPlaceholders})
    ORDER BY fk.name
  `);

  return result.recordset.map((row) => ({
    constraintName: row.CONSTRAINT_NAME,
    fromSchema: row.FROM_SCHEMA,
    fromTable: row.FROM_TABLE,
    fromColumn: row.FROM_COLUMN,
    toSchema: row.TO_SCHEMA,
    toTable: row.TO_TABLE,
    toColumn: row.TO_COLUMN,
  }));
}
