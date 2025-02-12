const fs = require('fs');
const path = require('path');

function setPermissionsRecursive(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 为目录设置 755 权限
      fs.chmodSync(filePath, '755');
      // 递归处理子目录
      setPermissionsRecursive(filePath);
    } else {
      // 为文件设置 644 权限，对于可执行文件设置 755
      if (file === 'fava_launcher' || file.endsWith('.sh') || file.endsWith('.py')) {
        fs.chmodSync(filePath, '755');
      } else {
        fs.chmodSync(filePath, '644');
      }
    }
  });
}

exports.default = async function(context) {
  // 只在 macOS 上执行
  if (process.platform === 'darwin') {
    const appOutDir = context.appOutDir;
    const resourcesPath = path.join(appOutDir, 'Fava.app/Contents/Resources');
    
    console.log('Setting permissions for resources directory:', resourcesPath);
    try {
      // 设置 Resources 目录本身的权限
      fs.chmodSync(resourcesPath, '755');
      
      // 递归设置所有文件和目录的权限
      setPermissionsRecursive(resourcesPath);
      
      console.log('Successfully set permissions');
    } catch (err) {
      console.error('Error setting permissions:', err);
      throw err; // 让构建失败以提醒问题
    }
  }
};
