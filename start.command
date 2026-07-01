#!/bin/bash
cd "$(dirname "$0")"

echo "========================================"
echo "   LoloBuySpreadsheets 服务启动脚本"
echo "========================================"
echo ""

# Start Docker
echo "[1/3] 启动 Docker 服务 (PostgreSQL + Redis + Meilisearch + Embedding)..."
# Check if docker-compose exists, otherwise use docker compose
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

if [ $? -ne 0 ]; then
    echo "❌ Docker 启动失败，请确保 Docker Desktop 已运行"
    read -n 1 -s -r -p "按任意键退出..."
    exit 1
fi
echo "✅ Docker 服务已启动"
echo ""

# Wait for DB
echo "Waiting for database..."
sleep 3

echo ""
echo "========================================"
echo "   PostgreSQL: localhost:15432"
echo "   Redis:      localhost:16379"
echo "   Meilisearch: http://localhost:17700"
echo "   Embedding:  http://localhost:18001"
echo "   API:        http://localhost:4101"
echo "   Web:        http://localhost:3101"
echo ""
echo "   按 Ctrl+C 停止所有服务"
echo "========================================"
echo ""

# Run concurrently
# 支持 DISABLE_THROTTLE=true ./start.command 关闭限流（用于压力测试）
npx concurrently -n "API,WEB" -c "cyan,magenta" "cd apps/api && PORT=4101 DISABLE_THROTTLE=${DISABLE_THROTTLE:-false} npm run start:dev" "cd apps/web && PORT=3101 npm run dev"
