const { app, dialog } = require('electron');
const logger = require('../common/logger');
const { createWindow, getMainWindow } = require('./window');
const { startFavaServer, stopFavaServer, checkServerAvailable, isServerStarted } = require('./fava-server');

app.on('ready', async () => {
  logger.info('App is ready');
  startFavaServer();
  
  logger.info('Creating window first...');
  createWindow();
  
  logger.info('Waiting for Fava server to start...');
  const serverAvailable = await checkServerAvailable();
  logger.info(`Server availability check result: ${serverAvailable}`);
  
  if (!serverAvailable) {
    dialog.showMessageBox(getMainWindow(), {
      type: 'warning',
      title: 'Server Connection Issue',
      message: 'Could not connect to Fava server. The application may not work correctly.',
      buttons: ['OK']
    });
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (getMainWindow() === null && isServerStarted()) {
    createWindow();
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
