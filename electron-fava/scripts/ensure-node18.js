const { execSync } = require('child_process');

function ensureNode18(scriptToRun) {
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
                exec ${scriptToRun}
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
    
    // 如果已经是 Node 18 或者没有 nvm，直接执行命令
    execSync(scriptToRun, { 
        stdio: 'inherit',
        shell: true
    });
}

// 获取要执行的命令
const scriptToRun = process.argv[2] || '';
if (!scriptToRun) {
    console.error('Please provide a script to run');
    process.exit(1);
}

// 执行命令
ensureNode18(scriptToRun);
