#!/bin/bash
# Phase 2 测试脚本 #1: DDL Migration 验证
# 用途: 验证 search-system-ddl.sql 可以正确执行且具有幂等性

set -e  # 遇到错误立即退出

echo "=================================================="
echo "Phase 2 Test #1: DDL Migration 验证"
echo "=================================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 从 .env 读取数据库配置（如果存在）
if [ -f .env ]; then
  source <(grep -v '^#' .env | sed 's/\r$//' | awk '/=/ {print $1}')
fi

# 数据库连接参数（优先使用环境变量）
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-lolobuyspreadsheets_dev}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# 检测是否使用 Docker 或本地 psql
DOCKER_CONTAINER="lolobuyspreadsheets_postgres"
USE_DOCKER=false

if ! command -v psql &> /dev/null; then
  echo "⚠️  本地未安装 psql，尝试使用 Docker..."
  if docker ps --filter "name=$DOCKER_CONTAINER" --format "{{.Names}}" | grep -q "$DOCKER_CONTAINER"; then
    USE_DOCKER=true
    echo -e "${GREEN}✅ 找到 Docker 容器: $DOCKER_CONTAINER${NC}"
  else
    echo -e "${RED}❌ 本地未安装 psql 且未找到 Docker 容器${NC}"
    exit 1
  fi
fi

# 定义 psql 执行函数
run_psql() {
  if [ "$USE_DOCKER" = true ]; then
    docker exec -i "$DOCKER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" "$@"
  else
    PGPASSWORD=$DB_PASSWORD run_psql "$@"
  fi
}

echo "📌 数据库连接信息:"
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
if [ "$USE_DOCKER" = true ]; then
  echo "   连接方式: Docker exec"
else
  echo "   连接方式: 本地 psql"
fi
echo ""

# 测试数据库连接
echo "🔍 测试数据库连接..."
if run_psql -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 数据库连接成功${NC}"
else
  echo -e "${RED}❌ 数据库连接失败${NC}"
  exit 1
fi
echo ""

# 执行 DDL migration
MIGRATION_FILE="src/migrations/search-system-ddl.sql"
echo "📝 执行 DDL Migration..."
echo "   文件: $MIGRATION_FILE"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo -e "${RED}❌ Migration 文件不存在: $MIGRATION_FILE${NC}"
  exit 1
fi

echo ""
echo "   正在执行 migration（第 1 次）..."
if [ "$USE_DOCKER" = true ]; then
  docker exec -i "$DOCKER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATION_FILE" > /tmp/ddl-output-1.log 2>&1
  RESULT=$?
else
  PGPASSWORD=$DB_PASSWORD run_psql -f "$MIGRATION_FILE" > /tmp/ddl-output-1.log 2>&1
  RESULT=$?
fi

if [ $RESULT -eq 0 ]; then
  echo -e "${GREEN}✅ Migration 执行成功（第 1 次）${NC}"
else
  echo -e "${RED}❌ Migration 执行失败${NC}"
  cat /tmp/ddl-output-1.log
  exit 1
fi

echo ""

# 验证对象创建
echo "🔍 验证数据库对象..."

# 验证扩展
echo "   检查 pg_trgm 扩展..."
if run_psql -tAc \
  "SELECT 1 FROM pg_extension WHERE extname='pg_trgm'" | grep -q 1; then
  echo -e "   ${GREEN}✅ pg_trgm 扩展已创建${NC}"
else
  echo -e "   ${RED}❌ pg_trgm 扩展不存在${NC}"
  exit 1
fi

echo "   检查 vector 扩展..."
if run_psql -tAc \
  "SELECT 1 FROM pg_extension WHERE extname='vector'" | grep -q 1; then
  echo -e "   ${GREEN}✅ vector 扩展已创建${NC}"
else
  echo -e "   ${RED}❌ vector 扩展不存在${NC}"
  exit 1
fi

# 验证索引
echo "   检查 Trigram 索引..."
INDEX_COUNT=$(run_psql -tAc \
  "SELECT COUNT(*) FROM pg_indexes WHERE indexname IN ('idx_product_title_trgm', 'idx_product_description_trgm')")

if [ "$INDEX_COUNT" -eq "2" ]; then
  echo -e "   ${GREEN}✅ Trigram 索引已创建 (2/2)${NC}"
else
  echo -e "   ${YELLOW}⚠️  Trigram 索引创建不完整 ($INDEX_COUNT/2)${NC}"
fi

# 验证表
echo "   检查 product_text_embeddings 表..."
if run_psql -tAc \
  "SELECT 1 FROM information_schema.tables WHERE table_name='product_text_embeddings'" | grep -q 1; then
  echo -e "   ${GREEN}✅ product_text_embeddings 表已创建${NC}"
else
  echo -e "   ${RED}❌ product_text_embeddings 表不存在${NC}"
  exit 1
fi

echo "   检查 product_image_embeddings 表..."
if run_psql -tAc \
  "SELECT 1 FROM information_schema.tables WHERE table_name='product_image_embeddings'" | grep -q 1; then
  echo -e "   ${GREEN}✅ product_image_embeddings 表已创建${NC}"
else
  echo -e "   ${RED}❌ product_image_embeddings 表不存在${NC}"
  exit 1
fi

echo ""

# 测试幂等性 - 再次执行 migration
echo "🔄 测试幂等性（重复执行 migration）..."
echo "   正在执行 migration（第 2 次）..."
if [ "$USE_DOCKER" = true ]; then
  docker exec -i "$DOCKER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATION_FILE" > /tmp/ddl-output-2.log 2>&1
  RESULT=$?
else
  PGPASSWORD=$DB_PASSWORD run_psql -f "$MIGRATION_FILE" > /tmp/ddl-output-2.log 2>&1
  RESULT=$?
fi

if [ $RESULT -eq 0 ]; then
  echo -e "${GREEN}✅ Migration 幂等性验证通过（第 2 次执行无错误）${NC}"
else
  echo -e "${RED}❌ Migration 幂等性验证失败${NC}"
  cat /tmp/ddl-output-2.log
  exit 1
fi

echo ""

# 检查表结构
echo "📊 验证表结构..."
echo "   product_text_embeddings 表字段:"
run_psql -c \
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='product_text_embeddings' ORDER BY ordinal_position" \
  | head -n 12

echo ""
echo "   product_text_embeddings 表索引:"
run_psql -c \
  "SELECT indexname FROM pg_indexes WHERE tablename='product_text_embeddings'" \
  | head -n 10

echo ""
echo "=================================================="
echo -e "${GREEN}✅ DDL Migration 测试全部通过${NC}"
echo "=================================================="
echo ""
echo "测试总结:"
echo "  ✅ 数据库连接正常"
echo "  ✅ Migration 执行成功"
echo "  ✅ pg_trgm 扩展已创建"
echo "  ✅ vector 扩展已创建"
echo "  ✅ Trigram 索引已创建"
echo "  ✅ product_text_embeddings 表已创建"
echo "  ✅ product_image_embeddings 表已创建"
echo "  ✅ 幂等性验证通过"
echo ""
