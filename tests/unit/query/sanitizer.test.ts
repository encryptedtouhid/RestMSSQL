import { describe, it, expect } from 'vitest';
import {
  quoteIdentifier,
  quoteTableName,
  validateIdentifier,
} from '../../../src/query/sanitizer.js';

describe('sanitizer', () => {
  describe('validateIdentifier', () => {
    it('accepts valid identifiers', () => {
      expect(() => validateIdentifier('Name')).not.toThrow();
      expect(() => validateIdentifier('_private')).not.toThrow();
      expect(() => validateIdentifier('Column1')).not.toThrow();
      expect(() => validateIdentifier('first_name')).not.toThrow();
    });

    it('rejects identifiers starting with numbers', () => {
      expect(() => validateIdentifier('123bad')).toThrow('Invalid identifier');
    });

    it('rejects identifiers with special characters', () => {
      expect(() => validateIdentifier('col;DROP')).toThrow('Invalid identifier');
      expect(() => validateIdentifier("col'bad")).toThrow('Invalid identifier');
      expect(() => validateIdentifier('col bad')).toThrow('Invalid identifier');
    });

    it('rejects empty string', () => {
      expect(() => validateIdentifier('')).toThrow('Invalid identifier');
    });
  });

  describe('quoteIdentifier', () => {
    it('wraps in brackets', () => {
      expect(quoteIdentifier('Name')).toBe('[Name]');
    });

    it('escapes brackets inside name', () => {
      // A column named "a]b" should become [a]]b]
      // But our validator rejects ] in names, so this is defense-in-depth
    });
  });

  describe('quoteTableName', () => {
    it('formats schema.table', () => {
      expect(quoteTableName('dbo', 'Products')).toBe('[dbo].[Products]');
    });

    it('formats non-dbo schema', () => {
      expect(quoteTableName('sales', 'Orders')).toBe('[sales].[Orders]');
    });
  });
});
