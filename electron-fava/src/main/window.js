const { BrowserWindow } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const logger = require('../common/logger');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  logger.info('Created main window');

  // 立即显示窗口
  mainWindow.show();
  mainWindow.focus();

  // 显示加载中的状态
  mainWindow.loadFile(path.join(__dirname, '../../loading.html'));
  logger.info('Loading initial page...');

  // 等待一段时间后加载实际页面
  setTimeout(() => {
    mainWindow.loadURL('http://127.0.0.1:5000/my-ledger/');
    logger.info('Loading Fava interface...');
  }, 500);

  if (isDev) {
    mainWindow.webContents.openDevTools();
    logger.debug('Opened DevTools (development mode)');
  }

  mainWindow.on('closed', function () {
    logger.info('Main window closed');
    mainWindow = null;
  });
}

module.exports = {
  createWindow,
  getMainWindow: () => mainWindow
};
