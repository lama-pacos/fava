const path = require('path');
const isDev = require('electron-is-dev');

// 基础路径配置
const BASE_PATHS = {
  development: {
    root: path.join(__dirname, '../..'),
    python: path.join(__dirname, '../../venv/bin/python'),
    pythonPath: path.join(__dirname, '../../..'),
    venvBin: path.join(__dirname, '../../venv/bin'),
    launcher: path.join(__dirname, '../../fava_launcher.py'),
    beancount: path.join(__dirname, '../../example.beancount'),
    loading: path.join(__dirname, '../../loading.html')
  },
  production: {
    root: process.resourcesPath,
    python: path.join(process.resourcesPath, 'fava_launcher'),
    pythonPath: process.resourcesPath,
    launcher: path.join(process.resourcesPath, 'fava_launcher'),
    beancount: path.join(process.resourcesPath, 'example.beancount'),
    loading: path.join(__dirname, '../../loading.html')
  }
};

// 获取当前环境的路径配置
const paths = isDev ? BASE_PATHS.development : BASE_PATHS.production;

module.exports = paths;
