const { app } = require('electron');
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    // 设置日志文件
    this.logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    this.logFile = path.join(this.logDir, 'app.log');
    this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
  }

  _formatMessage(level, ...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : arg
    ).join(' ');
    return `${new Date().toISOString()} [${level}] ${message}`;
  }

  _write(level, ...args) {
    const formattedMessage = this._formatMessage(level, ...args);
    // 写入日志文件
    this.logStream.write(formattedMessage + '\n');
    // 输出到控制台
    if (level === 'ERROR') {
      console.error(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }

  info(...args) {
    this._write('INFO', ...args);
  }

  error(...args) {
    this._write('ERROR', ...args);
  }

  warn(...args) {
    this._write('WARN', ...args);
  }

  debug(...args) {
    this._write('DEBUG', ...args);
  }

  // 确保在应用退出时关闭日志流
  closeLogStream() {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

// 创建单例实例
const logger = new Logger();

// 确保在应用退出时关闭日志流
app.on('before-quit', () => {
  logger.closeLogStream();
});

module.exports = logger;
