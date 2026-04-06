import type { OrderByOption } from './types.js';
import { BadRequestError } from '../utils/errors.js';

export function parseOrderBy(value: string): OrderByOption {
  if (!value.trim()) {
    throw new BadRequestError('$orderby cannot be empty');
  }

  const items = value.split(',').map((item) => {
    const parts = item.trim().split(/\s+/);
    const column = parts[0];
    const dir = parts[1]?.toLowerCase();

    if (!column || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
      throw new BadRequestError(`Invalid column name in $orderby: ${column}`);
    }

    if (dir && dir !== 'asc' && dir !== 'desc') {
      throw new BadRequestError(`Invalid direction in $orderby: ${dir}. Must be 'asc' or 'desc'`);
    }

    return {
      column,
      direction: (dir === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc',
    };
  });

  return { items };
}
