const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  // 只在 macOS 上执行
  if (process.platform === 'darwin') {
    const appOutDir = context.appOutDir;
    const favaLauncherPath = path.join(appOutDir, 'Fava.app/Contents/Resources/fava_launcher');
    
    console.log('Setting permissions for:', favaLauncherPath);
    try {
      fs.chmodSync(favaLauncherPath, '755');
      console.log('Successfully set permissions');
    } catch (err) {
      console.error('Error setting permissions:', err);
    }
  }
};
