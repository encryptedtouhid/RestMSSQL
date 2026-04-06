import { describe, it, expect } from 'vitest';
import { parseExpand } from '../../../src/odata/expand.js';

describe('parseExpand', () => {
  it('parses single property', () => {
    const result = parseExpand('Category');
    expect(result.items).toEqual([{ property: 'Category' }]);
  });

  it('parses multiple properties', () => {
    const result = parseExpand('Category,Orders');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.property).toBe('Category');
    expect(result.items[1]!.property).toBe('Orders');
  });

  it('parses with nested $select', () => {
    const result = parseExpand('Category($select=Name,Description)');
    expect(result.items[0]!.property).toBe('Category');
    expect(result.items[0]!.select).toEqual({ columns: ['Name', 'Description'] });
  });

  it('parses with nested $top', () => {
    const result = parseExpand('Orders($top=5)');
    expect(result.items[0]!.top).toBe(5);
  });

  it('parses with multiple nested options', () => {
    const result = parseExpand('Orders($select=Id,Total;$top=10;$orderby=OrderDate desc)');
    expect(result.items[0]!.select).toEqual({ columns: ['Id', 'Total'] });
    expect(result.items[0]!.top).toBe(10);
    expect(result.items[0]!.orderBy!.items[0]!.column).toBe('OrderDate');
    expect(result.items[0]!.orderBy!.items[0]!.direction).toBe('desc');
  });

  it('throws on empty string', () => {
    expect(() => parseExpand('')).toThrow('$expand cannot be empty');
  });

  it('throws on invalid property name', () => {
    expect(() => parseExpand('123bad')).toThrow('Invalid property name');
  });

  it('throws on excessive nesting depth', () => {
    expect(() => parseExpand('A($expand=B($expand=C($expand=D)))')).toThrow('nesting too deep');
  });
});
