import type sql from 'mssql';
import type { ProcedureInfo, ProcedureParam } from './types.js';
import { mapSqlTypeToJs } from '../db/types.js';

interface ProcRow {
  SPECIFIC_SCHEMA: string;
  SPECIFIC_NAME: string;
}

interface ParamRow {
  PARAMETER_NAME: string;
  DATA_TYPE: string;
  PARAMETER_MODE: string;
  HAS_DEFAULT: string;
}

export async function discoverProcedures(
  pool: sql.ConnectionPool,
  schemas: string[],
): Promise<ProcedureInfo[]> {
  const request = pool.request();
  const schemaPlaceholders = schemas.map((_, i) => `@schema${i}`).join(', ');
  schemas.forEach((s, i) => request.input(`schema${i}`, s));

  const procResult = await request.query<ProcRow>(`
    SELECT SPECIFIC_SCHEMA, SPECIFIC_NAME
    FROM INFORMATION_SCHEMA.ROUTINES
    WHERE ROUTINE_TYPE = 'PROCEDURE'
      AND SPECIFIC_SCHEMA IN (${schemaPlaceholders})
    ORDER BY SPECIFIC_SCHEMA, SPECIFIC_NAME
  `);

  const procedures: ProcedureInfo[] = [];

  for (const proc of procResult.recordset) {
    const paramResult = await pool
      .request()
      .input('schema', proc.SPECIFIC_SCHEMA)
      .input('name', proc.SPECIFIC_NAME).query<ParamRow>(`
        SELECT
          PARAMETER_NAME,
          DATA_TYPE,
          PARAMETER_MODE,
          CASE WHEN p.has_default_value = 1 THEN 'YES' ELSE 'NO' END AS HAS_DEFAULT
        FROM INFORMATION_SCHEMA.PARAMETERS ip
        LEFT JOIN sys.parameters p
          ON p.object_id = OBJECT_ID(QUOTENAME(ip.SPECIFIC_SCHEMA) + '.' + QUOTENAME(ip.SPECIFIC_NAME))
          AND p.name = ip.PARAMETER_NAME
        WHERE ip.SPECIFIC_SCHEMA = @schema
          AND ip.SPECIFIC_NAME = @name
          AND ip.PARAMETER_NAME != ''
        ORDER BY ip.ORDINAL_POSITION
      `);

    const parameters: ProcedureParam[] = paramResult.recordset.map((row) => ({
      name: row.PARAMETER_NAME.replace(/^@/, ''),
      sqlType: row.DATA_TYPE,
      jsType: mapSqlTypeToJs(row.DATA_TYPE),
      mode: row.PARAMETER_MODE === 'INOUT' ? 'INOUT' : row.PARAMETER_MODE === 'OUT' ? 'OUT' : 'IN',
      hasDefault: row.HAS_DEFAULT === 'YES',
    }));

    procedures.push({
      schema: proc.SPECIFIC_SCHEMA,
      name: proc.SPECIFIC_NAME,
      parameters,
    });
  }

  return procedures;
}
