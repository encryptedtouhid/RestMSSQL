import pino from 'pino';
import type { AppConfig } from '../config.js';

export function createLogger(config: Pick<AppConfig, 'logLevel'>) {
  return pino({
    level: config.logLevel,
    transport:
      process.env['NODE_ENV'] !== 'production'
        ? { target: 'pino/file', options: { destination: 1 } }
        : undefined,
  });
}

export type Logger = pino.Logger;
