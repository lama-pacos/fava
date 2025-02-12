const { BrowserWindow } = require('electron');
const isDev = require('electron-is-dev');
const logger = require('../common/logger');
const paths = require('../config/paths');
const serverConfig = require('../config/server');
const windowConfig = require('../config/window');
const { checkServerAvailable } = require('./fava-server');

let mainWindow = null;

async function createWindow() {
  mainWindow = new BrowserWindow(windowConfig);

  logger.info('Created main window');

  // 立即显示窗口
  mainWindow.show();
  mainWindow.focus();

  // 显示加载中的状态
  mainWindow.loadFile(paths.loading);
  logger.info('Loading initial page...');

  // 等待服务器就绪
  let retries = 0;
  const maxRetries = 10;
  
  while (retries < maxRetries) {
    logger.info(`Checking server availability (attempt ${retries + 1}/${maxRetries})...`);
    const isAvailable = await checkServerAvailable();
    
    if (isAvailable) {
      logger.info('Server is ready, loading Fava interface...');
      await mainWindow.loadURL(serverConfig.url);
      break;
    }
    
    retries++;
    if (retries < maxRetries) {
      logger.info('Server not ready, waiting before next attempt...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (retries >= maxRetries) {
    logger.error('Failed to load Fava interface after maximum retries');
    // 显示错误页面或提示
    mainWindow.loadFile(paths.loading);
  }

  if (isDev) {
    mainWindow.webContents.openDevTools();
    logger.debug('Opened DevTools (development mode)');
  }

  // 监听页面加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    logger.info('Page loaded successfully');
  });

  // 监听页面加载失败事件
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error(`Page load failed: ${errorDescription} (${errorCode})`);
    // 如果加载失败，尝试重新加载
    setTimeout(() => {
      logger.info('Attempting to reload page...');
      mainWindow.loadURL(serverConfig.url);
    }, 1000);
  });

  mainWindow.on('closed', function () {
    logger.info('Main window closed');
    mainWindow = null;
  });
}

module.exports = {
  createWindow,
  getMainWindow: () => mainWindow
};
