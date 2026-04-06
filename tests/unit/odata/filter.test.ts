import { describe, it, expect } from 'vitest';
import { parseFilter } from '../../../src/odata/filter.js';

describe('parseFilter', () => {
  describe('comparisons', () => {
    it('parses eq with string', () => {
      const result = parseFilter("Name eq 'John'");
      expect(result).toEqual({
        type: 'comparison',
        operator: 'eq',
        left: { type: 'property', name: 'Name' },
        right: { type: 'literal', value: 'John' },
      });
    });

    it('parses gt with number', () => {
      const result = parseFilter('Price gt 10');
      expect(result).toEqual({
        type: 'comparison',
        operator: 'gt',
        left: { type: 'property', name: 'Price' },
        right: { type: 'literal', value: 10 },
      });
    });

    it('parses le with decimal', () => {
      const result = parseFilter('Price le 99.99');
      expect(result).toEqual({
        type: 'comparison',
        operator: 'le',
        left: { type: 'property', name: 'Price' },
        right: { type: 'literal', value: 99.99 },
      });
    });

    it('parses eq with boolean', () => {
      const result = parseFilter('InStock eq true');
      expect(result).toEqual({
        type: 'comparison',
        operator: 'eq',
        left: { type: 'property', name: 'InStock' },
        right: { type: 'literal', value: true },
      });
    });

    it('parses eq with null', () => {
      const result = parseFilter('Description eq null');
      expect(result).toEqual({
        type: 'comparison',
        operator: 'eq',
        left: { type: 'property', name: 'Description' },
        right: { type: 'literal', value: null },
      });
    });

    it('parses all comparison operators', () => {
      for (const op of ['eq', 'ne', 'gt', 'ge', 'lt', 'le'] as const) {
        const result = parseFilter(`Price ${op} 10`);
        expect(result.type).toBe('comparison');
        if (result.type === 'comparison') {
          expect(result.operator).toBe(op);
        }
      }
    });
  });

  describe('logical operators', () => {
    it('parses and', () => {
      const result = parseFilter('Price gt 10 and InStock eq true');
      expect(result.type).toBe('logical');
      if (result.type === 'logical') {
        expect(result.operator).toBe('and');
      }
    });

    it('parses or', () => {
      const result = parseFilter("Name eq 'A' or Name eq 'B'");
      expect(result.type).toBe('logical');
      if (result.type === 'logical') {
        expect(result.operator).toBe('or');
      }
    });

    it('parses not', () => {
      const result = parseFilter('not InStock eq true');
      expect(result.type).toBe('not');
    });

    it('respects operator precedence (and binds tighter than or)', () => {
      const result = parseFilter('A eq 1 or B eq 2 and C eq 3');
      // Should be: A eq 1 OR (B eq 2 AND C eq 3)
      expect(result.type).toBe('logical');
      if (result.type === 'logical') {
        expect(result.operator).toBe('or');
        expect(result.right.type).toBe('logical');
        if (result.right.type === 'logical') {
          expect(result.right.operator).toBe('and');
        }
      }
    });
  });

  describe('parentheses', () => {
    it('handles parenthesized expressions', () => {
      const result = parseFilter('(Price gt 10)');
      expect(result.type).toBe('comparison');
    });

    it('overrides precedence with parentheses', () => {
      const result = parseFilter('(A eq 1 or B eq 2) and C eq 3');
      expect(result.type).toBe('logical');
      if (result.type === 'logical') {
        expect(result.operator).toBe('and');
        expect(result.left.type).toBe('logical');
        if (result.left.type === 'logical') {
          expect(result.left.operator).toBe('or');
        }
      }
    });
  });

  describe('functions', () => {
    it('parses contains', () => {
      const result = parseFilter("contains(Name,'widget')");
      expect(result.type).toBe('function');
      if (result.type === 'function') {
        expect(result.name).toBe('contains');
        expect(result.args).toHaveLength(2);
      }
    });

    it('parses startswith', () => {
      const result = parseFilter("startswith(Name,'A')");
      expect(result.type).toBe('function');
      if (result.type === 'function') {
        expect(result.name).toBe('startswith');
      }
    });

    it('parses tolower', () => {
      const result = parseFilter("tolower(Name) eq 'john'");
      expect(result.type).toBe('comparison');
      if (result.type === 'comparison') {
        expect(result.left.type).toBe('function');
      }
    });

    it('throws on unsupported function', () => {
      expect(() => parseFilter("evil(Name,'x')")).toThrow('Unsupported function');
    });
  });

  describe('string escaping', () => {
    it('handles escaped single quotes', () => {
      const result = parseFilter("Name eq 'O''Brien'");
      expect(result.type).toBe('comparison');
      if (result.type === 'comparison') {
        expect(result.right.type).toBe('literal');
        if (result.right.type === 'literal') {
          expect(result.right.value).toBe("O'Brien");
        }
      }
    });
  });

  describe('error handling', () => {
    it('throws on empty filter', () => {
      expect(() => parseFilter('')).toThrow('$filter cannot be empty');
    });

    it('throws on unterminated string', () => {
      expect(() => parseFilter("Name eq 'unterminated")).toThrow('Unterminated string');
    });

    it('throws on missing closing parenthesis', () => {
      expect(() => parseFilter('(Price gt 10')).toThrow('Missing closing parenthesis');
    });

    it('throws on deeply nested expressions', () => {
      const deep = '('.repeat(15) + 'A eq 1' + ')'.repeat(15);
      expect(() => parseFilter(deep)).toThrow('too deeply nested');
    });
  });
});
