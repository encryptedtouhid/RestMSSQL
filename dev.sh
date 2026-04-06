#!/bin/bash
set -e

echo "==> Starting SQL Server in Docker..."
docker compose -f docker/docker-compose.yml up -d

echo "==> Waiting for database to be ready..."
until docker compose -f docker/docker-compose.yml logs mssql-init 2>&1 | grep -q "rows affected"; do
  sleep 2
done
sleep 2

echo "==> Database ready!"
echo ""
echo "  API:     http://localhost:3000/api"
echo "  Swagger: http://localhost:3000/swagger"
echo ""
echo "==> Starting mssql-rest-api..."
npx tsx src/index.ts \
  --host localhost \
  --database mssqlrest_test \
  --user sa \
  --password "YourStr0ngP@ssword!" \
  --trust-server-certificate \
  --no-readonly \
  --schemas dbo,sales,hr,inventory,finance,content \
  --server-port 3000
