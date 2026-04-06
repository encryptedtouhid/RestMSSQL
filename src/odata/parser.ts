import type { ODataQuery } from './types.js';
import { parseFilter } from './filter.js';
import { parseSelect } from './select.js';
import { parseOrderBy } from './orderby.js';
import { parsePagination } from './pagination.js';
import { parseExpand } from './expand.js';

interface RawQueryParams {
  $filter?: string;
  $select?: string;
  $orderby?: string;
  $top?: string;
  $skip?: string;
  $expand?: string;
  $count?: string;
}

export function parseODataQuery(params: RawQueryParams, maxPageSize: number): ODataQuery {
  const query: ODataQuery = {};

  if (params.$filter) {
    query.filter = parseFilter(params.$filter);
  }

  if (params.$select) {
    query.select = parseSelect(params.$select);
  }

  if (params.$orderby) {
    query.orderBy = parseOrderBy(params.$orderby);
  }

  const pagination = parsePagination(params.$top, params.$skip, maxPageSize);
  if (pagination.top !== undefined || pagination.skip !== undefined) {
    query.pagination = pagination;
  }

  if (params.$expand) {
    query.expand = parseExpand(params.$expand);
  }

  if (params.$count === 'true') {
    query.count = true;
  }

  return query;
}
