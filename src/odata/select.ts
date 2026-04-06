import type { SelectOption } from './types.js';
import { BadRequestError } from '../utils/errors.js';

export function parseSelect(value: string): SelectOption {
  if (!value.trim()) {
    throw new BadRequestError('$select cannot be empty');
  }

  const columns = value
    .split(',')
    .map((col) => col.trim())
    .filter(Boolean);

  if (columns.length === 0) {
    throw new BadRequestError('$select must contain at least one column');
  }

  for (const col of columns) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) {
      throw new BadRequestError(`Invalid column name in $select: ${col}`);
    }
  }

  return { columns };
}
