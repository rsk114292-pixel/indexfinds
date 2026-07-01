#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始项目环境设置...${NC}"

# 1. 检查并安装 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "未检测到 pnpm，正在安装..."
    npm install -g pnpm
    if [ $? -ne 0 ]; then
        echo -e "${RED}pnpm 安装失败，请检查 npm 是否正确安装。${NC}"
        exit 1
    fi
else
    echo "✅ pnpm 已安装"
fi

# 2. 安装依赖
echo -e "${GREEN}正在安装 API 依赖...${NC}"
cd apps/api
pnpm install
if [ $? -ne 0 ]; then
    echo -e "${RED}API 依赖安装失败${NC}"
    exit 1
fi
cd ../..

echo -e "${GREEN}正在安装 Web 依赖...${NC}"
cd apps/web
pnpm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Web 依赖安装失败${NC}"
    exit 1
fi
cd ../..

# 3. 配置环境变量
echo -e "${GREEN}配置环境变量...${NC}"

# API .env
if [ ! -f apps/api/.env ]; then
    echo "创建 apps/api/.env..."
    cp apps/api/.env.example apps/api/.env
    # 生成随机 JWT Secret
    JWT_SECRET=$(openssl rand -base64 32)
    # 替换 JWT_SECRET (简单的 sed 替换，假设 .env.example 中有该占位符或空值)
    # 这里直接追加或替换可能更安全，但简单起见我们先提示用户
    echo "" >> apps/api/.env
    echo "# Auto-generated JWT Secret" >> apps/api/.env
    # 如果 .env.example 中是 JWT_SECRET=your_jwt_secret_here，我们尝试替换它
    sed -i '' "s/JWT_SECRET=your_jwt_secret_here/JWT_SECRET=$JWT_SECRET/" apps/api/.env
    
    echo "⚠️  请手动编辑 apps/api/.env 填入必要的 API Keys (如 QWEN_API_KEY)"
else
    echo "✅ apps/api/.env 已存在"
fi

# Web .env (虽然没有 .env.example，但我们创建一个基本的)
if [ ! -f apps/web/.env ]; then
    echo "创建 apps/web/.env..."
    cat > apps/web/.env <<EOL
NEXT_PUBLIC_API_URL=http://localhost:4101
NEXT_PUBLIC_APP_NAME=LoloBuySpreadsheets
NEXT_PUBLIC_APP_URL=http://localhost:3101
EOL
else
    echo "✅ apps/web/.env 已存在"
fi

# 4. 启动 Docker 服务
echo -e "${GREEN}启动 Docker 服务...${NC}"
docker-compose up -d
if [ $? -ne 0 ]; then
    echo -e "${RED}Docker 启动失败，请确保 Docker Desktop 已运行${NC}"
    exit 1
fi

echo "等待数据库准备就绪 (10秒)..."
sleep 10

# 5. 初始化数据库
echo -e "${GREEN}初始化数据库...${NC}"
cd apps/api
echo "运行数据库检查..."
npm run check:db

echo "运行种子数据..."
npm run seed:categories
npm run seed:brands-colors

echo -e "${GREEN}✅ 环境设置完成！${NC}"
echo -e "使用以下命令启动开发服务："
echo -e "  - API: ${GREEN}cd apps/api && npm run start:dev${NC}"
echo -e "  - Web: ${GREEN}cd apps/web && npm run dev${NC}"
