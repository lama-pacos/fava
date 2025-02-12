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
      
      const req = http.get('http://127.0.0.1:5000', (response) => {
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

  mainWindow.loadURL('http://127.0.0.1:5000');

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

// 获取可执行文件路径
function getPythonExecutablePath() {
  if (isDev) {
    return path.join(__dirname, 'venv/bin/python');
  }
  // 在生产环境中，使用打包的可执行文件
  if (process.platform === 'darwin') {
    return path.join(process.resourcesPath, 'fava_launcher');
  }
  throw new Error('Unsupported platform');
}

// 获取工作目录
function getWorkingDirectory() {
  if (isDev) {
    return __dirname;
  }
  // 在生产环境中，使用资源目录
  return process.resourcesPath;
}

// 获取 beancount 文件路径
function getBeanPath() {
  if (isDev) {
    return path.join(__dirname, 'example.beancount');
  }
  // 在生产环境中，使用资源目录中的示例文件
  return path.join(process.resourcesPath, 'example.beancount');
}

// 启动 Fava 服务器
function startFavaServer() {
  if (pythonProcess) {
    console.log('Fava server is already running');
    return;
  }

  const executablePath = getPythonExecutablePath();
  
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
  
  const launcherScript = isDev ? path.join(__dirname, 'fava_launcher.py') : path.join(process.resourcesPath, 'fava_launcher');
  console.log('Starting Fava with:');
  console.log('- Python:', executablePath);
  console.log('- Script:', launcherScript);
  console.log('- Bean file:', getBeanPath());
  console.log('- Working dir:', getWorkingDirectory());
  console.log('- Environment:', env);

  pythonProcess = spawn(executablePath, [launcherScript, getBeanPath()], {
    cwd: getWorkingDirectory(),
    env: env,
    shell: process.platform === 'win32'
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Fava stdout: ${data}`);
    // 检查是否包含服务器启动成功的信息
    if (data.toString().includes('Running on http://127.0.0.1:5000')) {
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
