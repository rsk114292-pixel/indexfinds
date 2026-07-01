#!/bin/bash
# ============================================================
# 压力测试运行脚本
#
# 用法:
#   ./scripts/load-test/run.sh                    # 运行所有负载测试
#   ./scripts/load-test/run.sh search             # 只测搜索
#   ./scripts/load-test/run.sh visual             # 只测视觉搜索
#   ./scripts/load-test/run.sh mixed              # 只测混合场景
#   ./scripts/load-test/run.sh search stress      # 搜索压力测试
#   ./scripts/load-test/run.sh mixed soak         # 混合持久测试
#
# 环境变量:
#   BASE_URL=http://your-vps:4000 ./scripts/load-test/run.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEST=${1:-all}
STAGE=${2:-load}
BASE_URL=${BASE_URL:-http://localhost:4100}
RESULTS_DIR="$SCRIPT_DIR/results"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查 k6
if ! command -v k6 &> /dev/null; then
  echo -e "${RED}k6 未安装。请运行: brew install k6${NC}"
  exit 1
fi

# 检查 API 是否可达
echo -e "${BLUE}检查 API 连接...${NC}"
if ! curl -sf "${BASE_URL}/health" > /dev/null 2>&1; then
  echo -e "${RED}API 不可达: ${BASE_URL}/health${NC}"
  echo -e "${YELLOW}请确保 Docker 容器已启动: docker compose up -d${NC}"
  exit 1
fi
echo -e "${GREEN}API 连接正常${NC}"
echo ""

# 创建结果目录
mkdir -p "$RESULTS_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

run_test() {
  local name=$1
  local script=$2
  local stage=$3

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  运行: ${name} (${stage} 模式)${NC}"
  echo -e "${BLUE}  目标: ${BASE_URL}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  local result_file="$RESULTS_DIR/${name}_${stage}_${TIMESTAMP}.json"

  k6 run \
    -e BASE_URL="${BASE_URL}" \
    -e STAGE="${stage}" \
    --summary-export="${result_file}" \
    "${script}"

  echo ""
  echo -e "${GREEN}结果已保存: ${result_file}${NC}"
  echo ""
}

case $TEST in
  search)
    run_test "search" "$SCRIPT_DIR/search.k6.js" "$STAGE"
    ;;
  visual)
    run_test "visual-search" "$SCRIPT_DIR/visual-search.k6.js" "$STAGE"
    ;;
  mixed)
    run_test "mixed" "$SCRIPT_DIR/mixed.k6.js" "$STAGE"
    ;;
  all)
    echo -e "${YELLOW}将依次运行所有测试 (${STAGE} 模式)${NC}"
    echo -e "${YELLOW}预计耗时: baseline ~1分钟, load ~5分钟, stress ~6分钟, soak ~35分钟${NC}"
    echo ""

    run_test "search" "$SCRIPT_DIR/search.k6.js" "$STAGE"
    sleep 5  # 等系统恢复

    run_test "visual-search" "$SCRIPT_DIR/visual-search.k6.js" "$STAGE"
    sleep 5

    run_test "mixed" "$SCRIPT_DIR/mixed.k6.js" "$STAGE"

    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  所有测试完成！${NC}"
    echo -e "${GREEN}  结果目录: ${RESULTS_DIR}/${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    ;;
  *)
    echo "用法: $0 [search|visual|mixed|all] [baseline|load|stress|soak]"
    exit 1
    ;;
esac
