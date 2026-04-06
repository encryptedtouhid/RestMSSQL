import type { FilterNode } from './types.js';
import { BadRequestError } from '../utils/errors.js';

const COMPARISON_OPS = new Set(['eq', 'ne', 'gt', 'ge', 'lt', 'le']);
const SUPPORTED_FUNCTIONS = new Set([
  'contains',
  'startswith',
  'endswith',
  'tolower',
  'toupper',
  'trim',
  'length',
  'indexof',
  'substring',
  'concat',
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'second',
]);
const MAX_DEPTH = 10;

interface Token {
  type: 'string' | 'number' | 'boolean' | 'null' | 'identifier' | 'operator' | 'paren' | 'comma';
  value: string;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i]!)) {
      i++;
      continue;
    }

    // String literal
    if (input[i] === "'") {
      let str = '';
      i++; // skip opening quote
      while (i < input.length) {
        if (input[i] === "'" && input[i + 1] === "'") {
          str += "'";
          i += 2;
        } else if (input[i] === "'") {
          break;
        } else {
          str += input[i];
          i++;
        }
      }
      if (i >= input.length) {
        throw new BadRequestError('Unterminated string literal in $filter');
      }
      i++; // skip closing quote
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Parentheses
    if (input[i] === '(' || input[i] === ')') {
      tokens.push({ type: 'paren', value: input[i]! });
      i++;
      continue;
    }

    // Comma
    if (input[i] === ',') {
      tokens.push({ type: 'comma', value: ',' });
      i++;
      continue;
    }

    // Number (including negative and decimal)
    if (
      /[0-9]/.test(input[i]!) ||
      (input[i] === '-' && i + 1 < input.length && /[0-9]/.test(input[i + 1]!))
    ) {
      let num = '';
      if (input[i] === '-') {
        num += '-';
        i++;
      }
      while (i < input.length && /[0-9.]/.test(input[i]!)) {
        num += input[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // Identifiers, keywords, operators
    if (/[a-zA-Z_]/.test(input[i]!)) {
      let word = '';
      while (i < input.length && /[a-zA-Z0-9_.]/.test(input[i]!)) {
        word += input[i];
        i++;
      }

      if (word === 'true' || word === 'false') {
        tokens.push({ type: 'boolean', value: word });
      } else if (word === 'null') {
        tokens.push({ type: 'null', value: word });
      } else if (word === 'and' || word === 'or' || word === 'not' || COMPARISON_OPS.has(word)) {
        tokens.push({ type: 'operator', value: word });
      } else {
        tokens.push({ type: 'identifier', value: word });
      }
      continue;
    }

    throw new BadRequestError(`Unexpected character in $filter: '${input[i]}'`);
  }

  return tokens;
}

class FilterParser {
  private pos = 0;
  private depth = 0;

  constructor(private tokens: Token[]) {}

  parse(): FilterNode {
    const node = this.parseOr();
    if (this.pos < this.tokens.length) {
      throw new BadRequestError(`Unexpected token in $filter: '${this.tokens[this.pos]!.value}'`);
    }
    return node;
  }

  private parseOr(): FilterNode {
    let left = this.parseAnd();

    while (this.match('operator', 'or')) {
      this.pos++;
      const right = this.parseAnd();
      left = { type: 'logical', operator: 'or', left, right };
    }

    return left;
  }

  private parseAnd(): FilterNode {
    let left = this.parseNot();

    while (this.match('operator', 'and')) {
      this.pos++;
      const right = this.parseNot();
      left = { type: 'logical', operator: 'and', left, right };
    }

    return left;
  }

  private parseNot(): FilterNode {
    if (this.match('operator', 'not')) {
      this.pos++;
      this.checkDepth();
      const operand = this.parseNot();
      this.depth--;
      return { type: 'not', operand };
    }

    return this.parseComparison();
  }

  private parseComparison(): FilterNode {
    const left = this.parsePrimary();

    const current = this.tokens[this.pos];
    if (current && current.type === 'operator' && COMPARISON_OPS.has(current.value)) {
      const operator = current.value as 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le';
      this.pos++;
      const right = this.parsePrimary();
      return { type: 'comparison', operator, left, right };
    }

    return left;
  }

  private parsePrimary(): FilterNode {
    const token = this.tokens[this.pos];

    if (!token) {
      throw new BadRequestError('Unexpected end of $filter expression');
    }

    // Parenthesized expression
    if (token.type === 'paren' && token.value === '(') {
      this.pos++;
      this.checkDepth();
      const node = this.parseOr();
      this.depth--;
      if (!this.match('paren', ')')) {
        throw new BadRequestError('Missing closing parenthesis in $filter');
      }
      this.pos++;
      return node;
    }

    // String literal
    if (token.type === 'string') {
      this.pos++;
      return { type: 'literal', value: token.value };
    }

    // Number
    if (token.type === 'number') {
      this.pos++;
      const num = token.value.includes('.') ? parseFloat(token.value) : parseInt(token.value, 10);
      return { type: 'literal', value: num };
    }

    // Boolean
    if (token.type === 'boolean') {
      this.pos++;
      return { type: 'literal', value: token.value === 'true' };
    }

    // Null
    if (token.type === 'null') {
      this.pos++;
      return { type: 'literal', value: null };
    }

    // Identifier or function call
    if (token.type === 'identifier') {
      const name = token.value;
      this.pos++;

      // Check if it's a function call
      if (this.match('paren', '(')) {
        if (!SUPPORTED_FUNCTIONS.has(name)) {
          throw new BadRequestError(`Unsupported function in $filter: ${name}`);
        }
        this.pos++; // skip (
        this.checkDepth();
        const args = this.parseArgList();
        this.depth--;
        if (!this.match('paren', ')')) {
          throw new BadRequestError(`Missing closing parenthesis for function ${name}`);
        }
        this.pos++; // skip )
        return { type: 'function', name, args };
      }

      // It's a property reference
      return { type: 'property', name };
    }

    throw new BadRequestError(`Unexpected token in $filter: '${token.value}'`);
  }

  private parseArgList(): FilterNode[] {
    const args: FilterNode[] = [];

    if (this.match('paren', ')')) {
      return args;
    }

    args.push(this.parseOr());

    while (this.match('comma', ',')) {
      this.pos++;
      args.push(this.parseOr());
    }

    return args;
  }

  private match(type: string, value?: string): boolean {
    const token = this.tokens[this.pos];
    if (!token) return false;
    if (token.type !== type) return false;
    if (value !== undefined && token.value !== value) return false;
    return true;
  }

  private checkDepth(): void {
    this.depth++;
    if (this.depth > MAX_DEPTH) {
      throw new BadRequestError(`$filter expression too deeply nested (max depth: ${MAX_DEPTH})`);
    }
  }
}

export function parseFilter(value: string): FilterNode {
  if (!value.trim()) {
    throw new BadRequestError('$filter cannot be empty');
  }

  const tokens = tokenize(value);
  const parser = new FilterParser(tokens);
  return parser.parse();
}
