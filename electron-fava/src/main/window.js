const { BrowserWindow } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');

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

  // 立即显示窗口
  mainWindow.show();
  mainWindow.focus();

  // 显示加载中的状态
  mainWindow.loadFile(path.join(__dirname, '../../loading.html'));

  // 等待一段时间后加载实际页面
  setTimeout(() => {
    mainWindow.loadURL('http://127.0.0.1:5000/my-ledger/');
  }, 500);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

module.exports = {
  createWindow,
  getMainWindow: () => mainWindow
};
