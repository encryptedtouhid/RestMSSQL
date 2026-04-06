import { describe, it, expect } from 'vitest';
import { parseSelect } from '../../../src/odata/select.js';

describe('parseSelect', () => {
  it('parses a single column', () => {
    const result = parseSelect('Name');
    expect(result.columns).toEqual(['Name']);
  });

  it('parses multiple columns', () => {
    const result = parseSelect('Id,Name,Price');
    expect(result.columns).toEqual(['Id', 'Name', 'Price']);
  });

  it('handles spaces around commas', () => {
    const result = parseSelect('Id , Name , Price');
    expect(result.columns).toEqual(['Id', 'Name', 'Price']);
  });

  it('allows underscores in column names', () => {
    const result = parseSelect('first_name,last_name');
    expect(result.columns).toEqual(['first_name', 'last_name']);
  });

  it('throws on empty string', () => {
    expect(() => parseSelect('')).toThrow('$select cannot be empty');
  });

  it('throws on whitespace only', () => {
    expect(() => parseSelect('   ')).toThrow('$select cannot be empty');
  });

  it('throws on invalid column names', () => {
    expect(() => parseSelect('123bad')).toThrow('Invalid column name');
  });

  it('throws on column with special characters', () => {
    expect(() => parseSelect('col;DROP TABLE')).toThrow('Invalid column name');
  });
});
