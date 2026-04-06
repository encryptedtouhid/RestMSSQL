import { describe, it, expect } from 'vitest';
import { parsePagination } from '../../../src/odata/pagination.js';

describe('parsePagination', () => {
  it('parses $top', () => {
    const result = parsePagination('10', undefined, 1000);
    expect(result.top).toBe(10);
    expect(result.skip).toBeUndefined();
  });

  it('parses $skip', () => {
    const result = parsePagination(undefined, '20', 1000);
    expect(result.top).toBeUndefined();
    expect(result.skip).toBe(20);
  });

  it('parses both $top and $skip', () => {
    const result = parsePagination('10', '20', 1000);
    expect(result.top).toBe(10);
    expect(result.skip).toBe(20);
  });

  it('caps $top at maxPageSize', () => {
    const result = parsePagination('5000', undefined, 1000);
    expect(result.top).toBe(1000);
  });

  it('returns empty for undefined inputs', () => {
    const result = parsePagination(undefined, undefined, 1000);
    expect(result.top).toBeUndefined();
    expect(result.skip).toBeUndefined();
  });

  it('throws on negative $top', () => {
    expect(() => parsePagination('-1', undefined, 1000)).toThrow('non-negative integer');
  });

  it('throws on non-numeric $top', () => {
    expect(() => parsePagination('abc', undefined, 1000)).toThrow('non-negative integer');
  });

  it('throws on negative $skip', () => {
    expect(() => parsePagination(undefined, '-5', 1000)).toThrow('non-negative integer');
  });
});
