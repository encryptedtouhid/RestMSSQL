import { describe, it, expect } from 'vitest';
import { formatXmlResponse, formatSingleXmlResponse } from '../../../src/formatters/xml.js';

describe('formatXmlResponse', () => {
  it('generates valid XML', () => {
    const data = [{ Id: 1, Name: 'Test' }];
    const result = formatXmlResponse(data);
    expect(result).toContain('<?xml');
    expect(result).toContain('<feed');
    expect(result).toContain('<entry>');
    expect(result).toContain('d:Id');
    expect(result).toContain('d:Name');
  });

  it('handles null values', () => {
    const data = [{ Id: 1, Description: null }];
    const result = formatXmlResponse(data);
    expect(result).toContain('m:null');
  });

  it('includes count when provided', () => {
    const data = [{ Id: 1 }];
    const result = formatXmlResponse(data, { count: 42 });
    expect(result).toContain('m:count');
  });

  it('handles empty data', () => {
    const result = formatXmlResponse([]);
    expect(result).toContain('<feed');
  });
});

describe('formatSingleXmlResponse', () => {
  it('generates single entry XML', () => {
    const data = { Id: 1, Name: 'Test' };
    const result = formatSingleXmlResponse(data);
    expect(result).toContain('<?xml');
    expect(result).toContain('<entry');
    expect(result).toContain('d:Id');
  });
});
