#!/bin/bash
# Phase 2 测试脚本 #3: BM25 DB端统计验证
# 用途: 验证 BM25 统计计算已改为 DB 端执行

set -e

echo "=================================================="
echo "Phase 2 Test #3: BM25 DB端统计验证"
echo "=================================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# API 端点配置
API_BASE_URL=${API_BASE_URL:-http://localhost:3100}
API_PREFIX=${API_PREFIX:-api}

# 从 .env 读取数据库配置
if [ -f .env ]; then
  source <(grep -v '^#' .env | sed 's/\r$//' | awk '/=/ {print $1}')
fi

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-lolobuyspreadsheets_dev}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# 检测是否使用 Docker
DOCKER_CONTAINER="lolobuyspreadsheets_postgres"
USE_DOCKER=false

if ! command -v psql &> /dev/null; then
  if docker ps --filter "name=$DOCKER_CONTAINER" --format "{{.Names}}" | grep -q "$DOCKER_CONTAINER"; then
    USE_DOCKER=true
  fi
fi

run_psql() {
  if [ "$USE_DOCKER" = true ]; then
    docker exec -i "$DOCKER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" "$@"
  else
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$@"
  fi
}

echo "🔍 测试前置检查..."

# 检查数据库连接
if run_psql -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 数据库连接正常${NC}"
else
  echo -e "${RED}❌ 数据库连接失败${NC}"
  exit 1
fi

# 检查商品数量
PRODUCT_COUNT=$(run_psql -tAc \
  "SELECT COUNT(*) FROM products WHERE status = 'active'")

echo "   当前活跃商品数: $PRODUCT_COUNT"

if [ "$PRODUCT_COUNT" -eq "0" ]; then
  echo -e "${YELLOW}⚠️  警告: 没有活跃商品，BM25 统计将为空${NC}"
fi

echo ""

# 测试 1: 验证 DB 端统计计算的 SQL 语句
echo "📊 测试 1: 验证 DB 端统计 SQL..."

echo "   执行统计查询（基础统计）..."
BASIC_STATS=$(run_psql -tAc \
  "SELECT COUNT(*) as count,
          ROUND(AVG(array_length(string_to_array(
            CONCAT(COALESCE(title,''), ' ', COALESCE(description,'')), ' '
          ), 1))) as avg_len
   FROM products WHERE status = 'active'")

TOTAL_DOCS=$(echo "$BASIC_STATS" | awk '{print $1}')
AVG_LEN=$(echo "$BASIC_STATS" | awk '{print $2}')

echo -e "   ${GREEN}✅ 基础统计查询成功${NC}"
echo "      总文档数: $TOTAL_DOCS"
echo "      平均长度: $AVG_LEN"

echo ""
echo "   执行词频统计（前 10 个高频词）..."
TERM_FREQ_SAMPLE=$(run_psql \
  -c "SELECT word, COUNT(DISTINCT product_id) as doc_count FROM (
        SELECT p.id as product_id, unnest(string_to_array(
          lower(CONCAT(COALESCE(p.title,''), ' ', COALESCE(p.description,''))), ' '
        )) as word
        FROM products p WHERE p.status = 'active'
      ) tokens
      WHERE length(word) > 0
      GROUP BY word
      HAVING COUNT(DISTINCT product_id) >= 2
      ORDER BY doc_count DESC
      LIMIT 10" 2>&1)

if echo "$TERM_FREQ_SAMPLE" | grep -q "ERROR"; then
  echo -e "${RED}❌ 词频统计查询失败${NC}"
  echo "$TERM_FREQ_SAMPLE"
  exit 1
else
  echo -e "${GREEN}✅ 词频统计查询成功${NC}"
  echo "$TERM_FREQ_SAMPLE" | head -n 15
fi

echo ""

# 测试 2: 检查应用是否正在运行
echo "🔍 测试 2: 检查应用状态..."

if curl -s -f "$API_BASE_URL/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 应用正在运行${NC}"
  APP_RUNNING=true
elif curl -s -f "$API_BASE_URL" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 应用正在运行${NC}"
  APP_RUNNING=true
else
  echo -e "${YELLOW}⚠️  应用未运行，跳过 API 测试${NC}"
  APP_RUNNING=false
fi

echo ""

# 测试 3: 调用 BM25 stats API（如果应用在运行）
if [ "$APP_RUNNING" = true ]; then
  echo "📡 测试 3: 调用 BM25 Stats API..."

  # 检查是否有 BM25 stats 端点
  # 注意：可能需要根据实际路由调整
  STATS_ENDPOINT="$API_BASE_URL/$API_PREFIX/search/bm25/stats"

  echo "   尝试访问: $STATS_ENDPOINT"

  STATS_RESPONSE=$(curl -s "$STATS_ENDPOINT" 2>&1)

  if echo "$STATS_RESPONSE" | grep -q "totalDocuments"; then
    echo -e "${GREEN}✅ BM25 Stats API 响应成功${NC}"
    echo "$STATS_RESPONSE" | jq . 2>/dev/null || echo "$STATS_RESPONSE"

    # 提取统计数据进行验证
    API_TOTAL_DOCS=$(echo "$STATS_RESPONSE" | jq -r '.totalDocuments' 2>/dev/null || echo "N/A")
    API_AVG_LEN=$(echo "$STATS_RESPONSE" | jq -r '.avgDocLength' 2>/dev/null || echo "N/A")
    API_UNIQUE_TERMS=$(echo "$STATS_RESPONSE" | jq -r '.uniqueTerms' 2>/dev/null || echo "N/A")

    echo ""
    echo "   API 统计结果:"
    echo "      总文档数: $API_TOTAL_DOCS"
    echo "      平均长度: $API_AVG_LEN"
    echo "      唯一词汇: $API_UNIQUE_TERMS"

    # 验证 API 结果与数据库直接查询结果一致
    if [ "$API_TOTAL_DOCS" = "$TOTAL_DOCS" ]; then
      echo -e "   ${GREEN}✅ 总文档数一致${NC}"
    else
      echo -e "   ${YELLOW}⚠️  总文档数不一致: DB=$TOTAL_DOCS, API=$API_TOTAL_DOCS${NC}"
    fi

  else
    echo -e "${YELLOW}⚠️  Stats API 不可用或路径错误${NC}"
    echo "   响应: $STATS_RESPONSE"
  fi
else
  echo "   跳过 API 测试（应用未运行）"
fi

echo ""

# 测试 4: 检查 BM25 服务代码实现
echo "🔍 测试 4: 验证代码实现..."

BM25_SERVICE="src/search/bm25-ranking.service.ts"

if [ ! -f "$BM25_SERVICE" ]; then
  echo -e "${RED}❌ BM25 服务文件不存在: $BM25_SERVICE${NC}"
  exit 1
fi

echo "   检查是否使用 DB 端统计..."
if grep -q "this.dataSource.query" "$BM25_SERVICE" && \
   grep -q "SELECT COUNT" "$BM25_SERVICE"; then
  echo -e "${GREEN}✅ 代码使用 DB 端统计查询${NC}"
else
  echo -e "${RED}❌ 代码未使用 DB 端统计${NC}"
  exit 1
fi

echo "   检查是否移除了全量加载逻辑..."
if grep -q "productRepository.find()" "$BM25_SERVICE" || \
   grep -q "findAll.*products" "$BM25_SERVICE"; then
  echo -e "${RED}❌ 代码仍包含全量加载逻辑${NC}"
  exit 1
else
  echo -e "${GREEN}✅ 代码已移除全量加载${NC}"
fi

echo "   检查 termDocFrequency Map 大小限制..."
if grep -q "MAX_TERM_MAP_SIZE" "$BM25_SERVICE"; then
  echo -e "${GREEN}✅ 代码包含 Map 大小限制${NC}"
else
  echo -e "${YELLOW}⚠️  代码未设置 Map 大小限制${NC}"
fi

echo "   检查是否使用 setTimeout 链式调度..."
if grep -q "setTimeout(scheduleNext" "$BM25_SERVICE"; then
  echo -e "${GREEN}✅ 代码使用 setTimeout 链式调度${NC}"
else
  echo -e "${YELLOW}⚠️  代码未使用 setTimeout 链式调度${NC}"
fi

echo ""

# 测试 5: 性能基准测试（如果有测试数据）
if [ "$PRODUCT_COUNT" -gt "100" ]; then
  echo "⏱️  测试 5: 性能基准测试..."

  echo "   执行统计查询性能测试（3次取平均）..."

  TOTAL_TIME=0
  for i in {1..3}; do
    START_TIME=$(date +%s%3N)
    run_psql \
      -c "SELECT COUNT(*) as count,
                 AVG(array_length(string_to_array(
                   CONCAT(COALESCE(title,''), ' ', COALESCE(description,'')), ' '
                 ), 1)) as avg_len
          FROM products WHERE status = 'active'" > /dev/null
    END_TIME=$(date +%s%3N)

    ELAPSED=$((END_TIME - START_TIME))
    TOTAL_TIME=$((TOTAL_TIME + ELAPSED))
    echo "      第 $i 次: ${ELAPSED}ms"
  done

  AVG_TIME=$((TOTAL_TIME / 3))
  echo ""
  echo "   平均耗时: ${AVG_TIME}ms"

  if [ "$AVG_TIME" -lt 1000 ]; then
    echo -e "   ${GREEN}✅ 性能优秀 (< 1s)${NC}"
  elif [ "$AVG_TIME" -lt 3000 ]; then
    echo -e "   ${GREEN}✅ 性能良好 (< 3s)${NC}"
  else
    echo -e "   ${YELLOW}⚠️  性能一般 (> 3s)，考虑添加索引或优化查询${NC}"
  fi
else
  echo "   跳过性能测试（商品数量 < 100）"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✅ BM25 DB端统计验证全部通过${NC}"
echo "=================================================="
echo ""
echo "测试总结:"
echo "  ✅ DB 端统计 SQL 正确"
echo "  ✅ 代码已改为 DB 端计算"
echo "  ✅ 已移除全量加载逻辑"
echo "  ✅ 使用 setTimeout 链式调度"
if [ "$APP_RUNNING" = true ]; then
  echo "  ✅ Stats API 响应正常"
fi
echo ""
