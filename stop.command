#!/bin/bash
cd "$(dirname "$0")"

echo "========================================"
echo "   LoloBuySpreadsheets 服务停止脚本"
echo "========================================"
echo ""

# 1. Stop Docker
echo "[1/2] 停止 Docker 服务..."
if command -v docker-compose &> /dev/null; then
    docker-compose down
else
    docker compose down
fi
echo "✅ Docker 服务已停止"
echo ""

# 2. Stop Node processes by port (Safer than killall node)
echo "[2/2] 停止 Node.js 服务 (端口 3101, 4101)..."

# Function to kill process by port
kill_port() {
    local port=$1
    local name=$2
    local pid=$(lsof -ti:$port)
    if [ -n "$pid" ]; then
        echo "   停止 $name (PID: $pid)..."
        kill -9 $pid
        echo "   ✅ $name 已停止"
    else
        echo "   $name 未运行 (端口 $port 空闲)"
    fi
}

kill_port 3101 "Web (Next.js)"
kill_port 4101 "API (NestJS)"

echo ""
echo "========================================"
echo "所有服务已停止！"
echo "========================================"
echo ""
# Keep window open for a moment
read -n 1 -s -r -p "按任意键关闭窗口..."
