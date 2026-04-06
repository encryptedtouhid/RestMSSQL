import type { ExpandItem, ExpandOption } from './types.js';
import { BadRequestError } from '../utils/errors.js';
import { parseSelect } from './select.js';
import { parseFilter } from './filter.js';
import { parseOrderBy } from './orderby.js';

const MAX_EXPAND_DEPTH = 2;

export function parseExpand(value: string, depth: number = 0): ExpandOption {
  if (depth > MAX_EXPAND_DEPTH) {
    throw new BadRequestError(`$expand nesting too deep (max depth: ${MAX_EXPAND_DEPTH})`);
  }

  if (!value.trim()) {
    throw new BadRequestError('$expand cannot be empty');
  }

  const items: ExpandItem[] = [];
  const parts = splitExpandItems(value);

  for (const part of parts) {
    items.push(parseExpandItem(part.trim(), depth));
  }

  return { items };
}

function splitExpandItems(value: string): string[] {
  const items: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (const ch of value) {
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth--;

    if (ch === ',' && parenDepth === 0) {
      items.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current) items.push(current);
  return items;
}

function parseExpandItem(value: string, depth: number): ExpandItem {
  const parenIdx = value.indexOf('(');

  if (parenIdx === -1) {
    const property = value.trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(property)) {
      throw new BadRequestError(`Invalid property name in $expand: ${property}`);
    }
    return { property };
  }

  const property = value.substring(0, parenIdx).trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(property)) {
    throw new BadRequestError(`Invalid property name in $expand: ${property}`);
  }

  if (!value.endsWith(')')) {
    throw new BadRequestError(`Missing closing parenthesis in $expand for ${property}`);
  }

  const optionsStr = value.substring(parenIdx + 1, value.length - 1);
  const item: ExpandItem = { property };

  const options = splitOptions(optionsStr);
  for (const opt of options) {
    const eqIdx = opt.indexOf('=');
    if (eqIdx === -1) continue;

    const key = opt.substring(0, eqIdx).trim().replace(/^\$/, '');
    const val = opt.substring(eqIdx + 1).trim();

    switch (key) {
      case 'select':
        item.select = parseSelect(val);
        break;
      case 'filter':
        item.filter = parseFilter(val);
        break;
      case 'orderby':
        item.orderBy = parseOrderBy(val);
        break;
      case 'top':
        item.top = parseInt(val, 10);
        if (isNaN(item.top)) throw new BadRequestError('$top in $expand must be an integer');
        break;
      case 'skip':
        item.skip = parseInt(val, 10);
        if (isNaN(item.skip)) throw new BadRequestError('$skip in $expand must be an integer');
        break;
      case 'expand':
        item.expand = parseExpand(val, depth + 1).items;
        break;
    }
  }

  return item;
}

function splitOptions(value: string): string[] {
  const options: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (const ch of value) {
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth--;

    if (ch === ';' && parenDepth === 0) {
      options.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current) options.push(current);
  return options;
}
