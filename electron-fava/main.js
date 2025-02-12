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
    const maxAttempts = 20; // 最多等待20秒
    let attempts = 0;
    let checkInterval;
    
    const checkServer = () => {
      console.log(`Attempting to connect to Fava server (attempt ${attempts + 1}/${maxAttempts})...`);
      
      const req = http.get('http://127.0.0.1:5000/my-ledger/', (response) => {
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

      req.setTimeout(500, () => {
        console.log('Connection attempt timed out');
        req.destroy();
        tryAgain();
      });
    };

    const tryAgain = () => {
      attempts++;
      if (attempts < maxAttempts) {
        console.log('Waiting 500ms before next attempt...');
      } else {
        console.log('Max attempts reached, proceeding anyway...');
        if (checkInterval) {
          clearInterval(checkInterval);
        }
        resolve(false);
      }
    };

    checkServer();
    // 每500ms尝试一次
    checkInterval = setInterval(checkServer, 500);
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

  mainWindow.loadURL('http://127.0.0.1:5000/my-ledger/');

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
  const workingDir = getWorkingDirectory();
  const beanPath = getBeanPath();
  
  console.log('Starting Fava with:');
  console.log('- Executable:', executablePath);
  console.log('- Working directory:', workingDir);
  console.log('- Bean file:', beanPath);
  console.log('- Is Dev:', isDev);
  
  // 设置环境变量
  const env = {
    ...process.env,
    PYTHONUNBUFFERED: '1',  // 禁用 Python 输出缓冲
  };

  // 设置 PYTHONPATH
  if (isDev) {
    env.PYTHONPATH = path.join(__dirname, '..');
    env.PATH = `${path.join(__dirname, 'venv/bin')}:${env.PATH}`;
  } else {
    env.PYTHONPATH = process.resourcesPath;
  }

  const launcherScript = isDev ? path.join(__dirname, 'fava_launcher.py') : path.join(process.resourcesPath, 'fava_launcher');
  
  // 详细的调试信息
  console.log('Debug info:');
  console.log('- Is Dev:', isDev);
  console.log('- __dirname:', __dirname);
  console.log('- process.resourcesPath:', process.resourcesPath);
  console.log('- Launcher script:', launcherScript);
  console.log('- Bean file:', beanPath);
  console.log('- Working dir:', workingDir);
  console.log('- PYTHONPATH:', env.PYTHONPATH);
  console.log('- Command:', `${isDev ? executablePath : launcherScript} ${isDev ? launcherScript : ''} ${beanPath}`);
  console.log('- Full command args:', isDev ? [launcherScript, beanPath] : [beanPath]);

  // 检查文件是否存在
  try {
    if (fs.existsSync(launcherScript)) {
      console.log('Launcher script exists');
      // 检查文件权限
      const stats = fs.statSync(launcherScript);
      console.log('Launcher script permissions:', stats.mode.toString(8));
      if (!isDev) {
        // 确保文件有执行权限
        fs.chmodSync(launcherScript, '755');
        console.log('Set launcher script as executable');
      }
    } else {
      console.error('Launcher script does not exist:', launcherScript);
      dialog.showErrorBox('Error', `Launcher script not found: ${launcherScript}`);
      return;
    }
    if (fs.existsSync(beanPath)) {
      console.log('Bean file exists');
    } else {
      console.error('Bean file does not exist:', beanPath);
      dialog.showErrorBox('Error', `Bean file not found: ${beanPath}`);
      return;
    }
  } catch (err) {
    console.error('Error checking files:', err);
    dialog.showErrorBox('Error', `Error checking files: ${err.message}`);
    return;
  }

  pythonProcess = spawn(isDev ? executablePath : launcherScript, isDev ? [launcherScript, beanPath] : [beanPath], {
    cwd: workingDir,
    env: env,
    shell: process.platform === 'win32'
  });

  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Fava stdout:', output);
    // 检查是否包含服务器启动成功的信息
    if (output.includes('Running on http://')) {
      console.log('Fava server started successfully');
      serverStarted = true;
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error('Fava stderr:', data.toString());
  });

  pythonProcess.on('error', (error) => {
    console.error('Failed to start Fava process:', error);
    dialog.showErrorBox('Error', `Failed to start Fava: ${error.message}`);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`Fava process exited with code ${code} and signal ${signal}`);
    serverStarted = false;
    if (code !== 0) {
      dialog.showErrorBox('Error', `Fava process exited with code ${code}`);
    }
  });
}

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  logStream.end();
});
