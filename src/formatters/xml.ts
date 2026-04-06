import { XMLBuilder } from 'fast-xml-parser';

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  suppressEmptyNode: true,
});

export function formatXmlResponse(
  data: Record<string, unknown>[],
  options: {
    entityName?: string;
    count?: number;
  } = {},
): string {
  const xml = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    feed: {
      '@_xmlns': 'http://www.w3.org/2005/Atom',
      '@_xmlns:d': 'http://schemas.microsoft.com/ado/2007/08/dataservices',
      '@_xmlns:m': 'http://schemas.microsoft.com/ado/2007/08/dataservices/metadata',
      ...(options.count !== undefined ? { 'm:count': options.count } : {}),
      entry: data.map((item) => ({
        content: {
          '@_type': 'application/xml',
          'm:properties': buildProperties(item),
        },
      })),
    },
  };

  return builder.build(xml) as string;
}

export function formatSingleXmlResponse(
  data: Record<string, unknown>,
  _entityName?: string,
): string {
  const xml = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    entry: {
      '@_xmlns': 'http://www.w3.org/2005/Atom',
      '@_xmlns:d': 'http://schemas.microsoft.com/ado/2007/08/dataservices',
      '@_xmlns:m': 'http://schemas.microsoft.com/ado/2007/08/dataservices/metadata',
      content: {
        '@_type': 'application/xml',
        'm:properties': buildProperties(data),
      },
    },
  };

  return builder.build(xml) as string;
}

function buildProperties(item: Record<string, unknown>): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(item)) {
    if (value === null) {
      props[`d:${key}`] = { '@_m:null': 'true' };
    } else {
      props[`d:${key}`] = value;
    }
  }

  return props;
}
