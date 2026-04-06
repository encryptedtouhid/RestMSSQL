export interface ODataJsonResponse {
  '@odata.context'?: string;
  '@odata.count'?: number;
  value: unknown[];
}

export function formatJsonResponse(
  data: Record<string, unknown>[],
  options: {
    context?: string;
    count?: number;
  } = {},
): ODataJsonResponse {
  const response: ODataJsonResponse = { value: data };

  if (options.context) {
    response['@odata.context'] = options.context;
  }

  if (options.count !== undefined) {
    response['@odata.count'] = options.count;
  }

  return response;
}

export function formatSingleJsonResponse(
  data: Record<string, unknown>,
  context?: string,
): Record<string, unknown> {
  const response: Record<string, unknown> = {};

  if (context) {
    response['@odata.context'] = context;
  }

  return { ...response, ...data };
}
