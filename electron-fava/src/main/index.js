const { app, dialog } = require('electron');
const logger = require('../common/logger');
const { createWindow, getMainWindow } = require('./window');
const { startFavaServer, stopFavaServer, isServerStarted } = require('./fava-server');

app.on('ready', async () => {
  logger.info('App is ready');
  
  // 先启动 Fava 服务器
  startFavaServer();
  logger.info('Fava server starting...');
  
  // 创建窗口（现在包含了等待服务器就绪的逻辑）
  await createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async function () {
  if (getMainWindow() === null && isServerStarted()) {
    await createWindow();
  }
});

app.on('before-quit', () => {
  // 先记录退出日志
  logger.info('Application is quitting...');
  // 关闭日志流
  logger.closeLogStream();
  // 停止服务器
  stopFavaServer();
});
