# RestMSSQL

[![CI](https://github.com/encryptedtouhid/mssql-rest-api/actions/workflows/ci.yml/badge.svg)](https://github.com/encryptedtouhid/mssql-rest-api/actions/workflows/ci.yml)

Zero-code REST API server for SQL Server. Point it at a database — it introspects the schema and generates a full OData-compatible REST API automatically. No code required.

## Quick Start

```bash
npm install

# Using individual flags
npx tsx src/index.ts \
  --host localhost \
  --database mydb \
  --user sa \
  --password "YourP@ssword" \
  --trust-server-certificate

# Or using a connection string
npx tsx src/index.ts \
  --connection "Server=localhost;Database=mydb;User Id=sa;Password=YourP@ssword;TrustServerCertificate=true"

# API:     http://localhost:3000/api
# Swagger: http://localhost:3000/swagger
```

## Features

- **Auto-generated endpoints** for all tables, views, and stored procedures
- **OData query support** — `$filter`, `$select`, `$orderby`, `$top`, `$skip`, `$expand`, `$count`
- **JSON and XML** responses via `Accept` header
- **Swagger UI** at `/swagger` with auto-generated OpenAPI spec
- **Read-only by default** — enable writes with `--no-readonly`
- **Multi-schema support** — expose specific schemas with `--schemas dbo,sales`
- **Composite primary keys** — `GET /api/Table/Key1=val1,Key2=val2`
- **Stored procedure** execution via `POST /rpc/<name>`
- **Relationship expansion** — auto-detects foreign keys for `$expand` with nested query options

## API Endpoints

| Method   | URL                 | Description                            |
| -------- | ------------------- | -------------------------------------- |
| `GET`    | `/api`              | Service document (lists all resources) |
| `GET`    | `/api/<Table>`      | List rows with OData query options     |
| `GET`    | `/api/<Table>/:id`  | Get single row by primary key          |
| `POST`   | `/api/<Table>`      | Create row (requires `--no-readonly`)  |
| `PATCH`  | `/api/<Table>/:id`  | Update row (requires `--no-readonly`)  |
| `PUT`    | `/api/<Table>/:id`  | Replace row (requires `--no-readonly`) |
| `DELETE` | `/api/<Table>/:id`  | Delete row (requires `--no-readonly`)  |
| `POST`   | `/rpc/<Procedure>`  | Execute stored procedure               |
| `GET`    | `/api/$metadata`    | OData CSDL metadata (XML)              |
| `GET`    | `/api/openapi.json` | OpenAPI 3.0 spec                       |
| `GET`    | `/swagger`          | Swagger UI                             |

Non-dbo schemas use dotted names: `/api/sales.Orders`

## OData Query Examples

```bash
# Filter
GET /api/Products?$filter=Price gt 100 and InStock eq true

# Select specific columns
GET /api/Products?$select=Name,Price

# Order and paginate
GET /api/Products?$orderby=Price desc&$top=10&$skip=20

# Expand related entities (with nested options)
GET /api/Products?$expand=Categories($select=Name)
GET /api/Orders?$expand=OrderItems($top=5;$orderby=UnitPrice desc)

# Count
GET /api/Products?$count=true

# Combine
GET /api/Products?$filter=contains(Name,'phone')&$select=Name,Price&$orderby=Price desc&$top=5

# String functions
GET /api/Products?$filter=startswith(Name,'Lap')
GET /api/Products?$filter=tolower(Name) eq 'laptop'

# Null checks
GET /api/Products?$filter=Description eq null

# Composite primary key
GET /api/StockLevels/WarehouseId=1,ProductId=2

# Stored procedure
POST /rpc/GetProductsByCategory
Content-Type: application/json
{"CategoryId": 1}

# XML response
curl -H "Accept: application/xml" http://localhost:3000/api/Products
```

## Configuration

Precedence: **CLI flags > environment variables > config file > defaults**.

### CLI Flags

```
--connection <string>        Connection string (Server=...;Database=...;User Id=...;Password=...)
--host <host>                SQL Server host (default: localhost)
--port <port>                SQL Server port (default: 1433)
--database <database>        Database name (required)
--user <user>                Database user
--password <password>        Database password
--encrypt                    Encrypt connection (default: true)
--trust-server-certificate   Trust server certificate
--server-port <port>         HTTP server port (default: 3000)
--no-readonly                Enable write operations
--no-cors                    Disable CORS
--schemas <schemas>          Comma-separated schemas (default: dbo)
--exclude-tables <tables>    Comma-separated tables to exclude
--default-page-size <size>   Default page size (default: 100)
--max-page-size <size>       Maximum page size (default: 1000)
--log-level <level>          fatal|error|warn|info|debug|trace (default: info)
```

### Environment Variables

```bash
MSSQLREST_HOST=localhost
MSSQLREST_DATABASE=mydb
MSSQLREST_USER=sa
MSSQLREST_PASSWORD=secret
MSSQLREST_SERVER_PORT=3000
MSSQLREST_READONLY=false
MSSQLREST_SCHEMAS=dbo,sales
```

### Config File

Create `.mssqlrestrc.json` or `mssqlrest.config.js`:

```json
{
  "host": "localhost",
  "database": "mydb",
  "user": "sa",
  "schemas": ["dbo", "sales"],
  "readonly": true
}
```

## Development

```bash
# Quick start with Docker SQL Server + API
./dev.sh

# Or manually
npm run docker:up
npm run dev -- --database mssqlrest_test --user sa --password "YourStr0ngP@ssword!" --trust-server-certificate --schemas dbo,sales,hr

# Tests
npm run test:unit
npm run test:integration    # requires Docker

# Lint, format, typecheck
npm run lint
npm run format
npm run typecheck
```

## Releasing

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and automated versioning.

```bash
npm run release             # auto-detect bump from commits
git push --follow-tags      # triggers GitHub Release
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for commit format, branching, and development details.

## Architecture

```
Request -> Content Negotiation -> OData Parser -> Query Builder -> SQL Server
                                                                       |
Response <- JSON/XML Formatter <- ----------------------------- Result Set
```

**Schema introspection** queries `INFORMATION_SCHEMA` and `sys.*` catalog views on startup to discover tables, views, columns, primary keys, foreign keys, and stored procedures. Routes are dynamically generated from the discovered schema.

**Security**: All user input is parameterized. Identifiers are validated against the introspected schema and bracket-quoted. LIKE wildcards are escaped. Results are always paginated. Security headers are set on all responses.

## License

MIT
