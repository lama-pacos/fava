const isDev = require('electron-is-dev');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const logger = require('../common/logger');

let pythonProcess;
let serverStarted = false;

// 获取可执行文件路径
function getPythonExecutablePath() {
  if (isDev) {
    return path.join(__dirname, '../../venv/bin/python');
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
    return path.join(__dirname, '../..');
  }
  // 在生产环境中，使用资源目录
  return process.resourcesPath;
}

// 获取 beancount 文件路径
function getBeanPath() {
  if (isDev) {
    return path.join(__dirname, '../../example.beancount');
  }
  // 在生产环境中，使用资源目录中的示例文件
  return path.join(process.resourcesPath, 'example.beancount');
}

// 检查服务是否可用
function checkServerAvailable() {
  return new Promise((resolve) => {
    const maxAttempts = 20; // 最多等待20秒
    let attempts = 0;
    let checkInterval;
    
    const checkServer = () => {
      logger.info(`Attempting to connect to Fava server (attempt ${attempts + 1}/${maxAttempts})...`);
      
      const req = http.get('http://127.0.0.1:5000/my-ledger/', (response) => {
        logger.info(`Received response from server with status code: ${response.statusCode}`);
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
        logger.error(`Connection attempt failed: ${err.message}`);
        tryAgain();
      });

      req.setTimeout(500, () => {
        logger.warn('Connection attempt timed out');
        req.destroy();
        tryAgain();
      });
    };

    const tryAgain = () => {
      attempts++;
      if (attempts < maxAttempts) {
        logger.info('Waiting 500ms before next attempt...');
      } else {
        logger.warn('Max attempts reached, proceeding anyway...');
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

// 启动 Fava 服务器
function startFavaServer() {
  if (pythonProcess) {
    logger.info('Fava server is already running');
    return;
  }

  const executablePath = getPythonExecutablePath();
  const workingDir = getWorkingDirectory();
  const beanPath = getBeanPath();
  
  logger.info('Starting Fava with:');
  logger.info('- Executable:', executablePath);
  logger.info('- Working directory:', workingDir);
  logger.info('- Bean file:', beanPath);

  const env = {
    ...process.env,
    PYTHONUNBUFFERED: '1',  // 禁用 Python 输出缓冲
  };

  // 设置 PYTHONPATH
  if (isDev) {
    env.PYTHONPATH = path.join(workingDir, '..');
    env.PATH = `${path.join(workingDir, 'venv/bin')}:${env.PATH}`;
  } else {
    env.PYTHONPATH = process.resourcesPath;
  }

  const launcherScript = isDev ? path.join(workingDir, 'fava_launcher.py') : path.join(process.resourcesPath, 'fava_launcher');
  
  // 详细的调试信息
  logger.debug('Debug info:');
  logger.debug('- Is Dev:', isDev);
  logger.debug('- Working dir:', workingDir);
  logger.debug('- Launcher script:', launcherScript);
  logger.debug('- Bean file:', beanPath);
  logger.debug('- PYTHONPATH:', env.PYTHONPATH);

  // 检查文件是否存在
  try {
    if (fs.existsSync(launcherScript)) {
      logger.info('Launcher script exists');
      // 检查文件权限
      const stats = fs.statSync(launcherScript);
      logger.debug('Launcher script permissions:', stats.mode.toString(8));
      if (!isDev) {
        // 确保文件有执行权限
        fs.chmodSync(launcherScript, '755');
        logger.info('Set launcher script as executable');
      }
    } else {
      logger.error('Launcher script does not exist:', launcherScript);
      throw new Error(`Launcher script not found: ${launcherScript}`);
    }
    if (fs.existsSync(beanPath)) {
      logger.info('Bean file exists');
    } else {
      logger.error('Bean file does not exist:', beanPath);
      throw new Error(`Bean file not found: ${beanPath}`);
    }
  } catch (err) {
    logger.error('Error checking files:', err);
    throw err;
  }

  pythonProcess = spawn(isDev ? executablePath : launcherScript, isDev ? [launcherScript, beanPath] : [beanPath], {
    cwd: workingDir,
    env: env,
    shell: process.platform === 'win32'
  });

  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString();
    logger.info(`Fava stdout: ${output}`);
    if (output.includes('Running on http://')) {
      logger.info('Fava server started successfully');
      serverStarted = true;
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    logger.error(`Fava stderr: ${data}`);
  });

  pythonProcess.on('error', (error) => {
    logger.error('Failed to start Fava process:', error);
    throw error;
  });

  pythonProcess.on('close', (code) => {
    logger.info(`Fava process exited with code ${code}`);
    pythonProcess = null;
    serverStarted = false;
    if (code !== 0) {
      throw new Error(`Fava process exited with code ${code}`);
    }
  });
}

function stopFavaServer() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
    serverStarted = false;
    logger.info('Fava server stopped');
  }
}

module.exports = {
  startFavaServer,
  stopFavaServer,
  checkServerAvailable,
  isServerStarted: () => serverStarted
};
