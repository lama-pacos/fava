const { app, dialog } = require('electron');
require('../common/logger');
const { createWindow, getMainWindow } = require('./window');
const { startFavaServer, stopFavaServer, checkServerAvailable, isServerStarted } = require('./fava-server');

app.on('ready', async () => {
  console.log('App is ready');
  startFavaServer();
  
  console.log('Creating window first...');
  createWindow();
  
  console.log('Waiting for Fava server to start...');
  const serverAvailable = await checkServerAvailable();
  console.log(`Server availability check result: ${serverAvailable}`);
  
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
  stopFavaServer();
});
