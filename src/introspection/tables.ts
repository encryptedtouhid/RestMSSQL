import type sql from 'mssql';

interface TableRow {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  TABLE_TYPE: string;
}

export async function discoverTables(
  pool: sql.ConnectionPool,
  schemas: string[],
  excludeTables: string[],
): Promise<{ schema: string; name: string; type: 'TABLE' | 'VIEW' }[]> {
  const request = pool.request();

  const schemaPlaceholders = schemas.map((_, i) => `@schema${i}`).join(', ');
  schemas.forEach((s, i) => request.input(`schema${i}`, s));

  let query = `
    SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA IN (${schemaPlaceholders})
  `;

  if (excludeTables.length > 0) {
    const excludePlaceholders = excludeTables.map((_, i) => `@exclude${i}`).join(', ');
    excludeTables.forEach((t, i) => request.input(`exclude${i}`, t));
    query += ` AND TABLE_NAME NOT IN (${excludePlaceholders})`;
  }

  query += ' ORDER BY TABLE_SCHEMA, TABLE_NAME';

  const result = await request.query<TableRow>(query);

  return result.recordset.map((row) => ({
    schema: row.TABLE_SCHEMA,
    name: row.TABLE_NAME,
    type: row.TABLE_TYPE === 'VIEW' ? ('VIEW' as const) : ('TABLE' as const),
  }));
}
