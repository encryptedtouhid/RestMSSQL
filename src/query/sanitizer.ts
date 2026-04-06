import { BadRequestError } from '../utils/errors.js';

const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function validateIdentifier(name: string): void {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new BadRequestError(`Invalid identifier: ${name}`);
  }
}

export function quoteIdentifier(name: string): string {
  validateIdentifier(name);
  return `[${name.replace(/\]/g, ']]')}]`;
}

export function quoteTableName(schema: string, table: string): string {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
}
