import { describe, it, expect } from 'vitest';
import { parseOrderBy } from '../../../src/odata/orderby.js';

describe('parseOrderBy', () => {
  it('parses single column ascending (default)', () => {
    const result = parseOrderBy('Name');
    expect(result.items).toEqual([{ column: 'Name', direction: 'asc' }]);
  });

  it('parses single column with explicit asc', () => {
    const result = parseOrderBy('Name asc');
    expect(result.items).toEqual([{ column: 'Name', direction: 'asc' }]);
  });

  it('parses single column descending', () => {
    const result = parseOrderBy('Price desc');
    expect(result.items).toEqual([{ column: 'Price', direction: 'desc' }]);
  });

  it('parses multiple columns', () => {
    const result = parseOrderBy('Name asc, Price desc');
    expect(result.items).toEqual([
      { column: 'Name', direction: 'asc' },
      { column: 'Price', direction: 'desc' },
    ]);
  });

  it('throws on empty string', () => {
    expect(() => parseOrderBy('')).toThrow('$orderby cannot be empty');
  });

  it('throws on invalid column name', () => {
    expect(() => parseOrderBy('123bad')).toThrow('Invalid column name');
  });

  it('throws on invalid direction', () => {
    expect(() => parseOrderBy('Name sideways')).toThrow('Invalid direction');
  });
});
