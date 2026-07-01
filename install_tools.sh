#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 开始安装开发工具 ===${NC}"

# 1. 安装 Homebrew
if ! command -v brew &> /dev/null; then
    echo -e "${GREEN}正在安装 Homebrew...${NC}"
    echo "⚠️  安装过程中需要输入你的系统密码（输入时不会显示字符），然后按回车。"
    echo "⚠️  如果提示 'Press RETURN to continue'，请按回车键。"
    
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # 配置环境变量
    echo -e "${GREEN}配置 Homebrew 环境变量...${NC}"
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/usr/local/bin/brew shellenv)"
    fi
else
    echo -e "${GREEN}✅ Homebrew 已安装${NC}"
fi

# 2. 安装 Docker
echo -e "${BLUE}=== 检查 Docker ===${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${GREEN}正在通过 Homebrew 安装 Docker...${NC}"
    brew install --cask docker
    
    echo -e "${GREEN}✅ Docker 安装完成！${NC}"
    echo -e "${BLUE}👉 请现在去 '应用程序(Applications)' 文件夹找到 Docker 图标并双击启动它。${NC}"
    echo -e "${BLUE}   启动后请等待状态栏的小鲸鱼图标变稳。${NC}"
else
    echo -e "${GREEN}✅ Docker 已安装${NC}"
fi

echo -e "${BLUE}=== 准备就绪 ===${NC}"
echo "Docker 启动后，你可以运行 ./setup.sh 来配置项目环境。"
