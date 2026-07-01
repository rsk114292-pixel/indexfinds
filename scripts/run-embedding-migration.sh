#!/bin/bash
# 执行 embedding 字段迁移
# 使用方法: ./scripts/run-embedding-migration.sh

DB_CONTAINER="${DB_CONTAINER_NAME:-lolobuyspreadsheets_postgres}"
DB_USER_NAME="${DB_USER:-postgres}"
DB_DATABASE="${DB_NAME:-lolobuyspreadsheets_dev}"

echo "Running embedding migration..."

# 复制 SQL 文件到容器
docker cp apps/api/src/migrations/add-product-embedding.sql "${DB_CONTAINER}:/tmp/"

# 执行迁移
docker exec -it "$DB_CONTAINER" psql -U "$DB_USER_NAME" -d "$DB_DATABASE" -f /tmp/add-product-embedding.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "Migration completed successfully!"
else
  echo ""
  echo "Migration failed. Please check the error messages above."
fi
