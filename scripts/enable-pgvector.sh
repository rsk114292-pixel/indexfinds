#!/bin/bash
# 在现有 PostgreSQL 容器中启用 pgvector 扩展
# 使用方法: ./scripts/enable-pgvector.sh

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-lolobuyspreadsheets}"
DB_CONTAINER="${DB_CONTAINER_NAME:-lolobuyspreadsheets_postgres}"
DB_USER_NAME="${DB_USER:-postgres}"
DB_DATABASE="${DB_NAME:-lolobuyspreadsheets_dev}"

echo "Enabling pgvector extension in ${DB_CONTAINER}..."

docker exec -it "$DB_CONTAINER" psql -U "$DB_USER_NAME" -d "$DB_DATABASE" -c "CREATE EXTENSION IF NOT EXISTS vector;"

if [ $? -eq 0 ]; then
  echo "pgvector extension enabled successfully!"
  docker exec -it "$DB_CONTAINER" psql -U "$DB_USER_NAME" -d "$DB_DATABASE" -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
else
  echo "Failed to enable pgvector extension. Make sure the container is using pgvector/pgvector:pg16 image."
  echo "You may need to:"
  echo "  1. docker-compose down"
  echo "  2. docker volume rm ${COMPOSE_PROJECT_NAME}_postgres_data"
  echo "  3. docker-compose up -d"
fi
