#!/bin/bash
# 本地开发启动脚本
# 使用方法: cd embedding-service && ./start-dev.sh

# 检查 Python 虚拟环境
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate

# 安装依赖
echo "Installing dependencies..."
pip install -r requirements.txt

# 启动服务
echo "Starting embedding service on port 8001..."
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
