const { execSync, spawn } = require('child_process');

function getCurrentNodeVersion() {
    return process.version;
}

function switchToNode18() {
    try {
        // 检查是否安装了 nvm
        execSync('command -v nvm', { stdio: 'ignore' });
        
        // 如果当前不是 Node 18，切换到 Node 18
        if (!process.version.startsWith('v18')) {
            console.log(`Current Node version is ${process.version}, switching to Node 18...`);
            
            // 构建包含 nvm 命令的脚本
            const nvmScript = `
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                if ! nvm use 18; then
                    nvm install 18
                    nvm use 18
                fi
                exec node "${__filename}"
            `;
            
            // 使用 bash 执行 nvm 命令
            execSync(nvmScript, { 
                stdio: 'inherit',
                shell: '/bin/bash'
            });
            return;
        }
    } catch (error) {
        console.log('nvm not found, continuing with current Node version...');
    }
    
    // 如果已经是 Node 18 或者没有 nvm，直接启动 Electron
    startElectron();
}

function startElectron() {
    console.log(`Starting Electron with Node ${process.version}`);
    const electron = spawn('electron', ['.'], {
        stdio: 'inherit',
        shell: true
    });
    
    electron.on('error', (err) => {
        console.error('Failed to start Electron:', err);
        process.exit(1);
    });
}

// 开始执行
switchToNode18();
