#!/bin/bash

# 确保清理之前的构建
rm -rf dist
rm -rf build

# 打包 Python 应用
echo "Building Python application..."
pyinstaller pyinstaller.spec

# 复制示例文件到发布目录
cp example.beancount dist/

# 安装 npm 依赖
echo "Installing npm dependencies..."
npm install

# 构建 Electron 应用
echo "Building Electron application..."
npm run build

echo "Build complete! Check the dist directory for the packaged application."
