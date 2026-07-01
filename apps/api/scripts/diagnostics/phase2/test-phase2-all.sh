#!/bin/bash
# Phase 2 综合测试脚本
# 用途: 按优先级顺序运行所有 Phase 2 测试

set -e

echo "=================================================="
echo "Phase 2 架构修复 - 综合测试套件"
echo "=================================================="
echo ""
echo "测试范围:"
echo "  • DDL Migration 执行验证"
echo "  • 应用启动与模块依赖验证"
echo "  • BM25 DB端统计验证"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 测试结果记录
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 确保脚本有执行权限
chmod +x "$SCRIPT_DIR"/test-phase2-*.sh

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段 1: 阻塞性测试（必须通过）${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 测试 1: DDL Migration
echo -e "${YELLOW}[1/3] DDL Migration 验证${NC}"
echo ""

if bash "$SCRIPT_DIR/test-phase2-ddl.sh"; then
  echo ""
  echo -e "${GREEN}✅ 测试 1 通过${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo ""
  echo -e "${RED}❌ 测试 1 失败${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo ""
  echo -e "${RED}阻塞性测试失败，后续测试已取消${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 测试 2: 应用启动
echo -e "${YELLOW}[2/3] 应用启动与模块依赖验证${NC}"
echo ""

if bash "$SCRIPT_DIR/test-phase2-startup.sh"; then
  echo ""
  echo -e "${GREEN}✅ 测试 2 通过${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo ""
  echo -e "${RED}❌ 测试 2 失败${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo ""
  echo -e "${RED}应用启动测试失败，后续测试已取消${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段 2: 核心功能测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 测试 3: BM25 DB端统计
echo -e "${YELLOW}[3/3] BM25 DB端统计验证${NC}"
echo ""

if bash "$SCRIPT_DIR/test-phase2-bm25.sh"; then
  echo ""
  echo -e "${GREEN}✅ 测试 3 通过${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo ""
  echo -e "${YELLOW}⚠️  测试 3 失败（非阻塞）${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 测试总结
echo "=================================================="
echo "             测试总结"
echo "=================================================="
echo ""
echo -e "总测试数:   $((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))"
echo -e "${GREEN}通过:       $TESTS_PASSED${NC}"
echo -e "${RED}失败:       $TESTS_FAILED${NC}"
echo -e "${YELLOW}跳过:       $TESTS_SKIPPED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  🎉 Phase 2 测试全部通过！${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "✅ DDL Migration 正确执行且具有幂等性"
  echo "✅ 应用启动无循环依赖，模块加载正常"
  echo "✅ BM25 统计已改为 DB 端计算"
  echo ""
  echo -e "${GREEN}👍 可以进入 Phase 3 (代码质量修复)${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  ❌ 有测试失败，请检查并修复${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "请根据上述测试报告修复问题后重新运行测试"
  echo ""
  exit 1
fi
