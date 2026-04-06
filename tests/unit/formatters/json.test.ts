import { describe, it, expect } from 'vitest';
import { formatJsonResponse, formatSingleJsonResponse } from '../../../src/formatters/json.js';

describe('formatJsonResponse', () => {
  it('wraps data in OData envelope', () => {
    const data = [{ Id: 1, Name: 'Test' }];
    const result = formatJsonResponse(data);
    expect(result.value).toEqual(data);
  });

  it('includes @odata.context when provided', () => {
    const data = [{ Id: 1 }];
    const result = formatJsonResponse(data, { context: 'http://localhost/api/$metadata#Products' });
    expect(result['@odata.context']).toBe('http://localhost/api/$metadata#Products');
  });

  it('includes @odata.count when provided', () => {
    const data = [{ Id: 1 }];
    const result = formatJsonResponse(data, { count: 42 });
    expect(result['@odata.count']).toBe(42);
  });

  it('handles empty data array', () => {
    const result = formatJsonResponse([]);
    expect(result.value).toEqual([]);
  });
});

describe('formatSingleJsonResponse', () => {
  it('returns data with context', () => {
    const data = { Id: 1, Name: 'Test' };
    const result = formatSingleJsonResponse(
      data,
      'http://localhost/api/$metadata#Products/$entity',
    );
    expect(result['@odata.context']).toBe('http://localhost/api/$metadata#Products/$entity');
    expect(result['Id']).toBe(1);
    expect(result['Name']).toBe('Test');
  });

  it('returns data without context', () => {
    const data = { Id: 1 };
    const result = formatSingleJsonResponse(data);
    expect(result['@odata.context']).toBeUndefined();
    expect(result['Id']).toBe(1);
  });
});
