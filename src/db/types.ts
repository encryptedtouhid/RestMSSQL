export const SQL_TO_JS_TYPE: Record<string, string> = {
  int: 'number',
  bigint: 'number',
  smallint: 'number',
  tinyint: 'number',
  float: 'number',
  real: 'number',
  decimal: 'number',
  numeric: 'number',
  money: 'number',
  smallmoney: 'number',

  bit: 'boolean',

  char: 'string',
  varchar: 'string',
  nchar: 'string',
  nvarchar: 'string',
  text: 'string',
  ntext: 'string',
  xml: 'string',
  uniqueidentifier: 'string',

  date: 'string',
  time: 'string',
  datetime: 'string',
  datetime2: 'string',
  datetimeoffset: 'string',
  smalldatetime: 'string',

  binary: 'string',
  varbinary: 'string',
  image: 'string',

  sql_variant: 'string',
  hierarchyid: 'string',
  geometry: 'string',
  geography: 'string',
};

export const SQL_TO_ODATA_TYPE: Record<string, string> = {
  int: 'Edm.Int32',
  bigint: 'Edm.Int64',
  smallint: 'Edm.Int16',
  tinyint: 'Edm.Byte',
  float: 'Edm.Double',
  real: 'Edm.Single',
  decimal: 'Edm.Decimal',
  numeric: 'Edm.Decimal',
  money: 'Edm.Decimal',
  smallmoney: 'Edm.Decimal',

  bit: 'Edm.Boolean',

  char: 'Edm.String',
  varchar: 'Edm.String',
  nchar: 'Edm.String',
  nvarchar: 'Edm.String',
  text: 'Edm.String',
  ntext: 'Edm.String',
  xml: 'Edm.String',
  uniqueidentifier: 'Edm.Guid',

  date: 'Edm.Date',
  time: 'Edm.TimeOfDay',
  datetime: 'Edm.DateTimeOffset',
  datetime2: 'Edm.DateTimeOffset',
  datetimeoffset: 'Edm.DateTimeOffset',
  smalldatetime: 'Edm.DateTimeOffset',

  binary: 'Edm.Binary',
  varbinary: 'Edm.Binary',
  image: 'Edm.Binary',
};

export function mapSqlTypeToJs(sqlType: string): string {
  return SQL_TO_JS_TYPE[sqlType.toLowerCase()] ?? 'string';
}

export function mapSqlTypeToOData(sqlType: string): string {
  return SQL_TO_ODATA_TYPE[sqlType.toLowerCase()] ?? 'Edm.String';
}
