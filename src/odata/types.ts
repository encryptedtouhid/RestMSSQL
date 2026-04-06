// Filter AST nodes
export type FilterNode =
  | ComparisonNode
  | LogicalNode
  | NotNode
  | FunctionCallNode
  | LiteralNode
  | PropertyNode;

export interface ComparisonNode {
  type: 'comparison';
  operator: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le';
  left: FilterNode;
  right: FilterNode;
}

export interface LogicalNode {
  type: 'logical';
  operator: 'and' | 'or';
  left: FilterNode;
  right: FilterNode;
}

export interface NotNode {
  type: 'not';
  operand: FilterNode;
}

export interface FunctionCallNode {
  type: 'function';
  name: string;
  args: FilterNode[];
}

export interface LiteralNode {
  type: 'literal';
  value: string | number | boolean | null;
}

export interface PropertyNode {
  type: 'property';
  name: string;
}

// Select
export interface SelectOption {
  columns: string[];
}

// OrderBy
export interface OrderByItem {
  column: string;
  direction: 'asc' | 'desc';
}

export interface OrderByOption {
  items: OrderByItem[];
}

// Pagination
export interface PaginationOption {
  top?: number;
  skip?: number;
}

// Expand
export interface ExpandItem {
  property: string;
  select?: SelectOption;
  filter?: FilterNode;
  orderBy?: OrderByOption;
  top?: number;
  skip?: number;
  expand?: ExpandItem[];
}

export interface ExpandOption {
  items: ExpandItem[];
}

// Combined parsed query
export interface ODataQuery {
  filter?: FilterNode;
  select?: SelectOption;
  orderBy?: OrderByOption;
  pagination?: PaginationOption;
  expand?: ExpandOption;
  count?: boolean;
}
