const { app } = require('electron');
const fs = require('fs');
const path = require('path');

// 设置日志文件
const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, 'app.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// 保存原始的 console 方法
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// 重定向 console.log
console.log = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : arg
  ).join(' ');
  logStream.write(`${new Date().toISOString()} [INFO] ${message}\n`);
  originalConsoleLog.apply(console, args);
};

// 重定向 console.error
console.error = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : arg
  ).join(' ');
  logStream.write(`${new Date().toISOString()} [ERROR] ${message}\n`);
  originalConsoleError.apply(console, args);
};

module.exports = {
  logStream
};
