#!/bin/bash

# 输出带颜色的文本
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting initialization...${NC}"

# 检查是否安装了 nvm
if [ -z "$NVM_DIR" ]; then
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        echo -e "${BLUE}Loading nvm...${NC}"
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        echo -e "${RED}nvm is not installed. Please install nvm first:${NC}"
        echo -e "${YELLOW}curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash${NC}"
        exit 1
    fi
fi

# 使用 Node.js 18
echo -e "${BLUE}Installing and using Node.js 18...${NC}"
nvm install 18
nvm use 18

# 检查是否安装了 yarn
if ! command -v yarn &> /dev/null; then
    echo -e "${BLUE}Installing yarn...${NC}"
    npm install -g yarn
fi

# 检查 Python 版本
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3 first.${NC}"
    exit 1
fi

# 检查是否在 M1/M2 Mac 上运行
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    echo -e "${BLUE}Detected Apple Silicon (M1/M2) Mac${NC}"
    export ARCHFLAGS="-arch arm64"
fi

# 删除旧的虚拟环境（如果存在）
if [ -d "venv" ]; then
    echo -e "${BLUE}Removing existing virtual environment...${NC}"
    rm -rf venv
fi

# 创建新的虚拟环境
echo -e "${BLUE}Creating new virtual environment...${NC}"
python3 -m venv venv

# 激活虚拟环境
echo -e "${BLUE}Activating virtual environment...${NC}"
source venv/bin/activate

# 升级 pip
echo -e "${BLUE}Upgrading pip...${NC}"
python -m pip install --upgrade pip

# 安装 Python 依赖
echo -e "${BLUE}Installing Python dependencies...${NC}"
pip install -r requirements.txt

# 提示关于 regex 包的信息
if [ "$ARCH" = "arm64" ]; then
    echo -e "${YELLOW}Note: You may see an error about regex package architecture mismatch.${NC}"
    echo -e "${YELLOW}This is normal on M1/M2 Macs and won't affect the application's functionality.${NC}"
fi

# 安装 Node.js 依赖
echo -e "${BLUE}Installing Node.js dependencies...${NC}"
yarn install

# 检查是否安装成功
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Initialization completed successfully!${NC}"
    echo -e "${GREEN}You can now run 'yarn start' to start the application.${NC}"
else
    echo -e "${RED}Error: Failed to install dependencies.${NC}"
    exit 1
fi
