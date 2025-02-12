#!/bin/bash

# 输出带颜色的文本
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 确保清理之前的构建
echo -e "${BLUE}Cleaning previous builds...${NC}"
rm -rf dist
rm -rf build

# 确保虚拟环境存在
if [ ! -d "venv" ]; then
    echo -e "${BLUE}Creating virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    echo -e "${BLUE}Using existing virtual environment...${NC}"
    source venv/bin/activate
fi

# 打包 Python 应用
echo -e "${BLUE}Building Python application...${NC}"
pyinstaller --clean --onefile fava_launcher.py

# 确保 Python 可执行文件有正确的权限
echo -e "${BLUE}Setting executable permissions...${NC}"
chmod 755 dist/fava_launcher

# 安装 Node.js 依赖
echo -e "${BLUE}Installing npm dependencies...${NC}"
yarn install

# 构建 Electron 应用
echo -e "${BLUE}Building Electron application...${NC}"
if [ "$(uname -m)" = "arm64" ]; then
    # 在 M1/M2 Mac 上构建 arm64 版本
    yarn electron-builder --mac --arm64
else
    # 在 Intel Mac 上构建 x64 版本
    yarn electron-builder --mac --x64
fi

echo -e "${GREEN}Build complete! Check the dist directory for the packaged application.${NC}"
