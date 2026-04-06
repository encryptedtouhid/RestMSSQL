import type { PaginationOption } from './types.js';
import { BadRequestError } from '../utils/errors.js';

export function parsePagination(
  top: string | undefined,
  skip: string | undefined,
  maxPageSize: number,
): PaginationOption {
  const result: PaginationOption = {};

  if (top !== undefined) {
    const parsed = parseInt(top, 10);
    if (isNaN(parsed) || parsed < 0) {
      throw new BadRequestError('$top must be a non-negative integer');
    }
    result.top = Math.min(parsed, maxPageSize);
  }

  if (skip !== undefined) {
    const parsed = parseInt(skip, 10);
    if (isNaN(parsed) || parsed < 0) {
      throw new BadRequestError('$skip must be a non-negative integer');
    }
    result.skip = parsed;
  }

  return result;
}
