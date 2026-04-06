import type { FastifyRequest, FastifyReply } from 'fastify';

export type ResponseFormat = 'json' | 'xml';

declare module 'fastify' {
  interface FastifyRequest {
    responseFormat: ResponseFormat;
  }
}

export function contentNegotiationHook(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: () => void,
): void {
  const accept = request.headers.accept ?? 'application/json';

  if (accept.includes('application/xml') || accept.includes('text/xml')) {
    request.responseFormat = 'xml';
  } else {
    request.responseFormat = 'json';
  }

  done();
}

export function setResponseHeaders(reply: FastifyReply, format: ResponseFormat): void {
  if (format === 'xml') {
    void reply.header('Content-Type', 'application/xml; charset=utf-8');
  } else {
    void reply.header('Content-Type', 'application/json; charset=utf-8');
  }
}
