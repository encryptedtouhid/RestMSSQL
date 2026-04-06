import type sql from 'mssql';
import type { ProcedureInfo, ProcedureParam } from './types.js';
import { mapSqlTypeToJs } from '../db/types.js';

interface ProcRow {
  SPECIFIC_SCHEMA: string;
  SPECIFIC_NAME: string;
}

interface ParamRow {
  SPECIFIC_SCHEMA: string;
  SPECIFIC_NAME: string;
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

  // Fetch procedures and all their parameters in two batch queries
  const [procResult, paramResult] = await Promise.all([
    request.query<ProcRow>(`
      SELECT SPECIFIC_SCHEMA, SPECIFIC_NAME
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE'
        AND SPECIFIC_SCHEMA IN (${schemaPlaceholders})
      ORDER BY SPECIFIC_SCHEMA, SPECIFIC_NAME
    `),
    pool.request().query<ParamRow>(
      `SELECT
          ip.SPECIFIC_SCHEMA,
          ip.SPECIFIC_NAME,
          ip.PARAMETER_NAME,
          ip.DATA_TYPE,
          ip.PARAMETER_MODE,
          CASE WHEN p.has_default_value = 1 THEN 'YES' ELSE 'NO' END AS HAS_DEFAULT
        FROM INFORMATION_SCHEMA.PARAMETERS ip
        LEFT JOIN sys.parameters p
          ON p.object_id = OBJECT_ID(QUOTENAME(ip.SPECIFIC_SCHEMA) + '.' + QUOTENAME(ip.SPECIFIC_NAME))
          AND p.name = ip.PARAMETER_NAME
        WHERE ip.SPECIFIC_SCHEMA IN (${schemas.map((_, i) => `'${schemas[i]!.replace(/'/g, "''")}'`).join(', ')})
          AND ip.PARAMETER_NAME != ''
        ORDER BY ip.SPECIFIC_SCHEMA, ip.SPECIFIC_NAME, ip.ORDINAL_POSITION`,
    ),
  ]);

  // Group parameters by procedure
  const paramsByProc = new Map<string, ProcedureParam[]>();
  for (const row of paramResult.recordset) {
    const key = `${row.SPECIFIC_SCHEMA}.${row.SPECIFIC_NAME}`;
    if (!paramsByProc.has(key)) {
      paramsByProc.set(key, []);
    }
    paramsByProc.get(key)!.push({
      name: row.PARAMETER_NAME.replace(/^@/, ''),
      sqlType: row.DATA_TYPE,
      jsType: mapSqlTypeToJs(row.DATA_TYPE),
      mode: row.PARAMETER_MODE === 'INOUT' ? 'INOUT' : row.PARAMETER_MODE === 'OUT' ? 'OUT' : 'IN',
      hasDefault: row.HAS_DEFAULT === 'YES',
    });
  }

  return procResult.recordset.map((proc) => ({
    schema: proc.SPECIFIC_SCHEMA,
    name: proc.SPECIFIC_NAME,
    parameters: paramsByProc.get(`${proc.SPECIFIC_SCHEMA}.${proc.SPECIFIC_NAME}`) ?? [],
  }));
}
