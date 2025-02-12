const { app, BrowserWindow, dialog } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let pythonProcess;
let serverStarted = false;

// 添加检查服务是否可用的函数
function checkServerAvailable() {
  return new Promise((resolve) => {
    const http = require('http');
    const maxAttempts = 30; // 最多等待30秒
    let attempts = 0;
    let checkInterval;
    
    const checkServer = () => {
      console.log(`Attempting to connect to Fava server (attempt ${attempts + 1}/${maxAttempts})...`);
      
      const req = http.get('http://localhost:5000', (response) => {
        console.log(`Received response from server with status code: ${response.statusCode}`);
        if (response.statusCode === 200 || response.statusCode === 302) {
          if (checkInterval) {
            clearInterval(checkInterval);
          }
          resolve(true);
          return;
        }
        tryAgain();
      });

      req.on('error', (err) => {
        console.log(`Connection attempt failed: ${err.message}`);
        tryAgain();
      });

      req.setTimeout(1000, () => {
        console.log('Connection attempt timed out');
        req.destroy();
        tryAgain();
      });
    };

    const tryAgain = () => {
      attempts++;
      if (attempts < maxAttempts) {
        console.log('Waiting 1 second before next attempt...');
      } else {
        console.log('Max attempts reached, proceeding anyway...');
        if (checkInterval) {
          clearInterval(checkInterval);
        }
        resolve(false);
      }
    };

    checkServer();
    // 每秒尝试一次
    checkInterval = setInterval(checkServer, 1000);
  });
}

// 设置日志文件
const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, 'app.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// 重定向 console.log 和 console.error
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : arg
  ).join(' ');
  logStream.write(`${new Date().toISOString()} [INFO] ${message}\n`);
  originalConsoleLog.apply(console, args);
};

console.error = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : arg
  ).join(' ');
  logStream.write(`${new Date().toISOString()} [ERROR] ${message}\n`);
  originalConsoleError.apply(console, args);
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,  // 先不显示
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadURL('http://localhost:5000');

  // 等待页面加载完成后再显示
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  console.log('App is ready');
  startFavaServer();
  
  console.log('Waiting for Fava server to start...');
  const serverAvailable = await checkServerAvailable();
  console.log(`Server availability check result: ${serverAvailable}`);
  
  console.log('Creating window...');
  createWindow();
  
  if (!serverAvailable) {
    dialog.showMessageBox(mainWindow, {
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
  if (mainWindow === null && serverStarted) {
    createWindow();
  }
});

function startFavaServer() {
  const resourcesPath = isDev ? __dirname : process.resourcesPath;
  const pythonPath = isDev 
    ? path.join(__dirname, 'venv/bin/python')
    : path.join(resourcesPath, 'python');
  const launcherPath = isDev
    ? path.join(__dirname, 'fava_launcher.py')
    : path.join(resourcesPath, 'fava_launcher.py');
  const beanPath = isDev
    ? path.join(__dirname, 'example.beancount')
    : path.join(resourcesPath, 'example.beancount');

  console.log('Development mode:', isDev);
  console.log('Resources Path:', resourcesPath);
  console.log('Python Path:', pythonPath);
  console.log('Launcher Path:', launcherPath);
  console.log('Bean Path:', beanPath);
  console.log('Working Directory:', isDev ? __dirname : resourcesPath);

  // Check if files exist
  try {
    if (fs.existsSync(pythonPath)) {
      console.log('Python executable exists');
      const stats = fs.statSync(pythonPath);
      console.log('Python executable stats:', stats);
    } else {
      console.error('Python executable not found at:', pythonPath);
      // List directory contents
      if (fs.existsSync(path.dirname(pythonPath))) {
        console.log('Contents of python directory:');
        fs.readdirSync(path.dirname(pythonPath)).forEach(file => {
          console.log(file);
        });
      }
    }
    if (fs.existsSync(launcherPath)) {
      console.log('Launcher script exists');
      const stats = fs.statSync(launcherPath);
      console.log('Launcher script stats:', stats);
    } else {
      console.error('Launcher script not found at:', launcherPath);
    }
    if (fs.existsSync(beanPath)) {
      console.log('Beancount file exists');
      const stats = fs.statSync(beanPath);
      console.log('Beancount file stats:', stats);
    } else {
      console.error('Beancount file not found at:', beanPath);
    }
  } catch (err) {
    console.error('Error checking files:', err);
  }

  // 确保工作目录存在
  const workingDir = isDev ? __dirname : resourcesPath;
  if (!fs.existsSync(workingDir)) {
    console.error('Working directory does not exist:', workingDir);
    dialog.showErrorBox('Error', `Working directory does not exist: ${workingDir}`);
    return;
  }

  // 确保 Python 可执行文件存在
  if (!fs.existsSync(pythonPath)) {
    console.error('Python executable not found:', pythonPath);
    dialog.showErrorBox('Error', `Python executable not found: ${pythonPath}`);
    return;
  }

  // 确保启动脚本存在
  if (!fs.existsSync(launcherPath)) {
    console.error('Launcher script not found:', launcherPath);
    dialog.showErrorBox('Error', `Launcher script not found: ${launcherPath}`);
    return;
  }

  // 确保 beancount 文件存在
  if (!fs.existsSync(beanPath)) {
    console.error('Beancount file not found:', beanPath);
    dialog.showErrorBox('Error', `Beancount file not found: ${beanPath}`);
    return;
  }

  // 在生产环境中，确保 Python 可执行文件有执行权限
  if (!isDev) {
    try {
      fs.chmodSync(pythonPath, '755');
    } catch (err) {
      console.error('Error setting executable permissions:', err);
    }
  }
  
  // 设置环境变量
  const env = {
    ...process.env,
    PYTHONPATH: path.join(__dirname, '..'),  // 添加父目录到 PYTHONPATH
    PYTHONUNBUFFERED: '1',  // 禁用 Python 输出缓冲
  };

  // 在开发模式下，使用虚拟环境中的 Python
  if (isDev) {
    env.PATH = `${path.join(__dirname, 'venv/bin')}:${env.PATH}`;
  }
  
  pythonProcess = spawn(pythonPath, [launcherPath, beanPath], {
    cwd: workingDir,
    env: env,
    shell: process.platform === 'win32'
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Fava stdout: ${data}`);
    // 检查是否包含服务器启动成功的信息
    if (data.toString().includes('Running on http://localhost:5000')) {
      console.log('Fava server started successfully');
      serverStarted = true;
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Fava stderr: ${data}`);
  });

  pythonProcess.on('error', (error) => {
    console.error('Failed to start Fava process:', error);
    dialog.showErrorBox('Error', `Failed to start Fava: ${error.message}`);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`Fava process exited with code ${code} and signal ${signal}`);
    serverStarted = false;
  });
}

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  logStream.end();
});
