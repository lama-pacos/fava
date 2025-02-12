// 服务器配置
module.exports = {
  host: '127.0.0.1',
  port: 5000,
  endpoint: '/my-ledger/',
  maxRetries: 20,        // 最大重试次数
  retryInterval: 500,    // 重试间隔（毫秒）
  timeout: 500,          // 连接超时时间（毫秒）
  get url() {
    return `http://${this.host}:${this.port}${this.endpoint}`;
  }
};
