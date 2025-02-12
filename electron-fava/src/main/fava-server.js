const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const logger = require('../common/logger');
const paths = require('../config/paths');
const serverConfig = require('../config/server');

let pythonProcess;
let serverStarted = false;

// 检查服务是否可用
function checkServerAvailable() {
  return new Promise((resolve) => {
    let attempts = 0;
    let checkInterval;
    
    const checkServer = () => {
      logger.info(`Attempting to connect to Fava server (attempt ${attempts + 1}/${serverConfig.maxRetries})...`);
      
      const req = http.get(serverConfig.url, (response) => {
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

      req.setTimeout(serverConfig.timeout, () => {
        logger.warn('Connection attempt timed out');
        req.destroy();
        tryAgain();
      });
    };

    const tryAgain = () => {
      attempts++;
      if (attempts < serverConfig.maxRetries) {
        logger.info(`Waiting ${serverConfig.retryInterval}ms before next attempt...`);
      } else {
        logger.warn('Max attempts reached, proceeding anyway...');
        if (checkInterval) {
          clearInterval(checkInterval);
        }
        resolve(false);
      }
    };

    checkServer();
    // 定期尝试连接
    checkInterval = setInterval(checkServer, serverConfig.retryInterval);
  });
}

// 启动 Fava 服务器
function startFavaServer() {
  if (pythonProcess) {
    logger.info('Fava server is already running');
    return;
  }

  logger.info('Starting Fava with:');
  logger.info('- Executable:', paths.python);
  logger.info('- Working directory:', paths.root);
  logger.info('- Bean file:', paths.beancount);

  const env = {
    ...process.env,
    PYTHONUNBUFFERED: '1',  // 禁用 Python 输出缓冲
  };

  // 设置 PYTHONPATH
  if (isDev) {
    env.PYTHONPATH = paths.pythonPath;
    env.PATH = `${paths.venvBin}:${env.PATH}`;
  } else {
    env.PYTHONPATH = paths.pythonPath;
  }
  
  // 详细的调试信息
  logger.debug('Debug info:');
  logger.debug('- Is Dev:', isDev);
  logger.debug('- Working dir:', paths.root);
  logger.debug('- Launcher script:', paths.launcher);
  logger.debug('- Bean file:', paths.beancount);
  logger.debug('- PYTHONPATH:', env.PYTHONPATH);

  // 检查文件是否存在
  try {
    if (fs.existsSync(paths.launcher)) {
      logger.info('Launcher script exists');
      // 检查文件权限
      const stats = fs.statSync(paths.launcher);
      logger.debug('Launcher script permissions:', stats.mode.toString(8));
      if (!isDev) {
        // 确保文件有执行权限
        fs.chmodSync(paths.launcher, '755');
        logger.info('Set launcher script as executable');
      }
    } else {
      logger.error('Launcher script does not exist:', paths.launcher);
      throw new Error(`Launcher script not found: ${paths.launcher}`);
    }
    if (fs.existsSync(paths.beancount)) {
      logger.info('Bean file exists');
    } else {
      logger.error('Bean file does not exist:', paths.beancount);
      throw new Error(`Bean file not found: ${paths.beancount}`);
    }
  } catch (err) {
    logger.error('Error checking files:', err);
    throw err;
  }

  pythonProcess = spawn(
    isDev ? paths.python : paths.launcher,
    isDev ? [paths.launcher, paths.beancount] : [paths.beancount],
    {
      cwd: paths.root,
      env: env,
      shell: process.platform === 'win32'
    }
  );

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

  pythonProcess.on('close', (code, signal) => {
    pythonProcess = null;
    serverStarted = false;
    
    // 如果是通过信号终止的（比如我们调用 kill()），不要抛出错误
    if (signal) {
      return;
    }
    
    // 只有在进程异常退出时（退出码不为 0 且不为 null）才抛出错误
    if (code !== 0 && code !== null) {
      throw new Error(`Fava process exited with code ${code}`);
    }
  });
}

function stopFavaServer() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
    serverStarted = false;
  }
}

module.exports = {
  startFavaServer,
  stopFavaServer,
  checkServerAvailable,
  isServerStarted: () => serverStarted
};
