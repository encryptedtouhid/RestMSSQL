import sql from 'mssql';
import type { AppConfig } from '../config.js';

let pool: sql.ConnectionPool | null = null;
let initPromise: Promise<sql.ConnectionPool> | null = null;

export async function initPool(config: AppConfig): Promise<sql.ConnectionPool> {
  if (pool) {
    return pool;
  }

  // Prevent race condition: if init is already in progress, return the same promise
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
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
      requestTimeout: 30000,
      connectionTimeout: 15000,
    };

    const newPool = new sql.ConnectionPool(sqlConfig);
    await newPool.connect();
    pool = newPool;
    return newPool;
  })();

  try {
    return await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

export function getPool(): sql.ConnectionPool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initPool() first.');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    try {
      await pool.close();
    } catch {
      // Ignore close errors during shutdown
    }
    pool = null;
    initPromise = null;
  }
}
