import sql from 'mssql';
import type { AppConfig } from '../config.js';

let pool: sql.ConnectionPool | null = null;

export async function initPool(config: AppConfig): Promise<sql.ConnectionPool> {
  if (pool) {
    return pool;
  }

  const sqlConfig: sql.config = {
    server: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    options: {
      encrypt: config.encrypt,
      trustServerCertificate: config.trustServerCertificate,
    },
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
    },
  };

  pool = new sql.ConnectionPool(sqlConfig);
  await pool.connect();
  return pool;
}

export function getPool(): sql.ConnectionPool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initPool() first.');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}
