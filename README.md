# mssql-rest-api

Zero-code REST API server for SQL Server. Point it at a database — it introspects the schema and generates a full OData-compatible REST API automatically. No code required.

## Quick Start

```bash
# Install dependencies
npm install

# Start with a SQL Server connection
npx tsx src/index.ts \
  --host localhost \
  --database mydb \
  --user sa \
  --password "YourP@ssword" \
  --trust-server-certificate

# Server running at http://localhost:3000
```

## Features

- **Auto-generated endpoints** for all tables, views, and stored procedures
- **OData query support** — `$filter`, `$select`, `$orderby`, `$top`, `$skip`, `$expand`, `$count`
- **JSON and XML** responses via `Accept` header
- **Read-only by default** — enable writes with `--no-readonly`
- **OData $metadata** endpoint (CSDL XML)
- **OpenAPI/Swagger** spec auto-generated at `/api/openapi.json`
- **Multi-schema support** — expose specific schemas with `--schemas dbo,sales`
- **Stored procedure** execution via `POST /rpc/<name>`
- **Relationship expansion** — auto-detects foreign keys for `$expand`

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

Non-dbo schemas use dotted names: `/api/sales.Orders`

## OData Query Examples

```bash
# Filter
GET /api/Products?$filter=Price gt 100 and InStock eq true

# Select specific columns
GET /api/Products?$select=Name,Price

# Order and paginate
GET /api/Products?$orderby=Price desc&$top=10&$skip=20

# Include related entities
GET /api/Products?$expand=Category

# Count
GET /api/Products?$count=true

# Combine
GET /api/Products?$filter=contains(Name,'phone')&$select=Name,Price&$orderby=Price desc&$top=5

# String functions
GET /api/Products?$filter=startswith(Name,'Lap')
GET /api/Products?$filter=tolower(Name) eq 'laptop'

# Null checks
GET /api/Products?$filter=Description eq null

# Stored procedure
POST /rpc/GetProductsByCategory
Content-Type: application/json
{"CategoryId": 1}
```

## XML Responses

```bash
curl -H "Accept: application/xml" http://localhost:3000/api/Products
```

## Configuration

Configuration is loaded with precedence: **CLI flags > environment variables > config file > defaults**.

### CLI Flags

```
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

All options can be set via `MSSQLREST_` prefixed environment variables:

```bash
MSSQLREST_HOST=localhost
MSSQLREST_PORT=1433
MSSQLREST_DATABASE=mydb
MSSQLREST_USER=sa
MSSQLREST_PASSWORD=secret
MSSQLREST_SERVER_PORT=3000
MSSQLREST_READONLY=false
MSSQLREST_SCHEMAS=dbo,sales
MSSQLREST_LOG_LEVEL=info
```

### Config File

Create `.mssqlrestrc.json` or `mssqlrest.config.js` in your project root:

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
# Install dependencies
npm install

# Start SQL Server for testing
npm run docker:up

# Run in dev mode (auto-reload)
npm run dev -- --database mssqlrest_test --user sa --password "YourStr0ngP@ssword!" --trust-server-certificate --schemas dbo,sales,hr

# Run unit tests
npm run test:unit

# Run integration tests (requires Docker SQL Server)
npm run test:integration

# Lint and type check
npm run lint
npm run typecheck

# Format code
npm run format

# Build
npm run build

# Stop Docker
npm run docker:down
```

### Git Hooks

- **pre-commit**: lint-staged (ESLint + Prettier) + secretlint (prevents secret/key commits)
- **pre-push**: TypeScript type check + unit tests

## Architecture

```
Request → Content Negotiation → OData Parser → Query Builder → SQL Server
                                                                    ↓
Response ← JSON/XML Formatter ← ────────────────────── Result Set ←┘
```

**Schema introspection** queries `INFORMATION_SCHEMA` and `sys.*` catalog views on startup to discover tables, views, columns, primary keys, foreign keys, and stored procedures. Routes are dynamically generated from the discovered schema.

**Security**: All user input is parameterized (`@p0`, `@p1`, ...). Identifiers are validated against the introspected schema and bracket-quoted. No string interpolation of user values into SQL.

## License

MIT
