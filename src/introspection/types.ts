export interface ColumnInfo {
  name: string;
  sqlType: string;
  jsType: string;
  odataType: string;
  nullable: boolean;
  hasDefault: boolean;
  isIdentity: boolean;
  maxLength: number | null;
  precision: number | null;
  scale: number | null;
}

export interface TableInfo {
  schema: string;
  name: string;
  type: 'TABLE' | 'VIEW';
  columns: ColumnInfo[];
  primaryKey: string[];
}

export interface Relationship {
  constraintName: string;
  fromSchema: string;
  fromTable: string;
  fromColumn: string;
  toSchema: string;
  toTable: string;
  toColumn: string;
}

export interface ProcedureParam {
  name: string;
  sqlType: string;
  jsType: string;
  mode: 'IN' | 'INOUT' | 'OUT';
  hasDefault: boolean;
}

export interface ProcedureInfo {
  schema: string;
  name: string;
  parameters: ProcedureParam[];
}

export interface DatabaseSchema {
  tables: TableInfo[];
  views: TableInfo[];
  relationships: Relationship[];
  procedures: ProcedureInfo[];
}
