#!/usr/bin/env node

/**
 * 强制退出登录 - 彻底清除所有认证数据
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 强制退出登录 - 彻底清除所有认证数据...\n');

// 1. 清除所有可能的共享会话文件
const sessionPaths = [
  path.join(__dirname, 'shared-session.json'),
  path.join(__dirname, '..', 'shared-session.json'),
  path.join(__dirname, 'backend', 'shared-session.json'),
  path.join(__dirname, 'electron', 'shared-session.json'),
  path.join(__dirname, 'web', 'shared-session.json'),
  path.join(__dirname, 'dist', 'shared-session.json'),
];

console.log('🗑️  清除共享会话文件:');
let cleanedFiles = 0;
sessionPaths.forEach((sessionPath, index) => {
  try {
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
      console.log(`✅ ${index + 1}. 已删除: ${sessionPath}`);
      cleanedFiles++;
    } else {
      console.log(`➖ ${index + 1}. 不存在: ${sessionPath}`);
    }
  } catch (error) {
    console.log(`❌ ${index + 1}. 删除失败: ${sessionPath} - ${error.message}`);
  }
});

// 2. 创建清理localStorage的HTML页面
const clearLocalStorageHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>清理localStorage</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #1a1a1a; 
            color: #fff; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #2a2a2a; 
            padding: 20px; 
            border-radius: 8px; 
        }
        .status { 
            margin: 10px 0; 
            padding: 10px; 
            border-radius: 4px; 
        }
        .success { background: #2d5a2d; }
        .info { background: #2d4a5a; }
        .warning { background: #5a4a2d; }
        button { 
            background: #007acc; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 4px; 
            cursor: pointer; 
            margin: 5px; 
        }
        button:hover { background: #005a99; }
        .danger { background: #cc3333; }
        .danger:hover { background: #aa1111; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 强制清理登录状态</h1>
        <div id="status"></div>
        
        <h2>当前localStorage状态:</h2>
        <div id="current-status"></div>
        
        <h2>操作:</h2>
        <button onclick="checkStatus()">🔍 检查当前状态</button>
        <button onclick="clearAllAuth()" class="danger">🗑️ 清除所有认证数据</button>
        <button onclick="testClean()">✅ 测试清理效果</button>
        
        <h2>说明:</h2>
        <div class="info status">
            <p>如果你看到"正在跳转到仪表盘"而不是登录表单，说明localStorage中还有认证数据。</p>
            <p>点击"清除所有认证数据"按钮，然后重新打开登录页面。</p>
        </div>
    </div>

    <script>
        function updateStatus(message, type = 'info') {
            const statusDiv = document.getElementById('status');
            statusDiv.innerHTML = '<div class="status ' + type + '">' + message + '</div>';
        }
        
        function updateCurrentStatus() {
            const currentDiv = document.getElementById('current-status');
            const sessionId = localStorage.getItem('sessionId');
            const sessionIdBackup = localStorage.getItem('sessionId_backup');
            const lastActivity = localStorage.getItem('lastActivity');
            const token = localStorage.getItem('token');
            
            let html = '<div class="status info">';
            html += '<p><strong>sessionId:</strong> ' + (sessionId ? sessionId.substring(0, 20) + '...' : '未设置') + '</p>';
            html += '<p><strong>sessionId_backup:</strong> ' + (sessionIdBackup ? sessionIdBackup.substring(0, 20) + '...' : '未设置') + '</p>';
            html += '<p><strong>lastActivity:</strong> ' + (lastActivity || '未设置') + '</p>';
            html += '<p><strong>token:</strong> ' + (token ? token.substring(0, 20) + '...' : '未设置') + '</p>';
            html += '</div>';
            
            currentDiv.innerHTML = html;
        }
        
        function checkStatus() {
            updateCurrentStatus();
            
            const sessionId = localStorage.getItem('sessionId');
            const sessionIdBackup = localStorage.getItem('sessionId_backup');
            
            if (sessionId || sessionIdBackup) {
                updateStatus('⚠️ 发现认证数据！这就是为什么你看到"正在跳转到仪表盘"的原因。', 'warning');
            } else {
                updateStatus('✅ 没有发现认证数据，应该能正常显示登录表单。', 'success');
            }
        }
        
        function clearAllAuth() {
            console.log('🗑️ 开始清除所有认证数据...');
            
            // 清除所有可能的认证相关数据
            const keysToRemove = [
                'sessionId',
                'sessionId_backup', 
                'lastActivity',
                'token',
                'user',
                'authToken',
                'refresh_token',
                'access_token'
            ];
            
            let removedCount = 0;
            keysToRemove.forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    console.log('🗑️ 已删除:', key);
                    removedCount++;
                }
            });
            
            // 清除所有cookies
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            
            updateStatus('✅ 已清除 ' + removedCount + ' 个认证数据项和所有cookies。现在刷新页面应该能看到登录表单了！', 'success');
            updateCurrentStatus();
            
            console.log('✅ 认证数据清理完成');
        }
        
        function testClean() {
            checkStatus();
            const sessionId = localStorage.getItem('sessionId');
            const sessionIdBackup = localStorage.getItem('sessionId_backup');
            
            if (!sessionId && !sessionIdBackup) {
                updateStatus('✅ 清理成功！现在可以关闭此页面，重新打开登录页面了。', 'success');
            } else {
                updateStatus('❌ 还有残留数据，请点击"清除所有认证数据"按钮。', 'warning');
            }
        }
        
        // 页面加载时自动检查状态
        window.onload = function() {
            checkStatus();
        };
    </script>
</body>
</html>
`;

const clearHtmlPath = path.join(__dirname, 'clear-auth.html');
fs.writeFileSync(clearHtmlPath, clearLocalStorageHtml);

console.log(`\n✅ 清理工具已创建: ${clearHtmlPath}`);

console.log('\n📋 使用步骤:');
console.log('1. 打开浏览器访问:', clearHtmlPath);
console.log('2. 点击"检查当前状态"查看localStorage内容');
console.log('3. 点击"清除所有认证数据"按钮');
console.log('4. 点击"测试清理效果"验证清理结果');
console.log('5. 关闭页面，重新打开Electron应用');

console.log('\n🎯 预期结果:');
console.log('- localStorage中的sessionId将被完全清除');
console.log('- 重新打开应用时应该显示用户名密码输入界面');
console.log('- 不再显示"正在跳转到仪表盘"');

console.log('\n⚠️  重要提示:');
console.log('- 如果Electron应用正在运行，请先关闭它');
console.log('- 清理完成后重新启动应用');
console.log('- 如果问题仍然存在，可能需要清理Electron的用户数据目录');

console.log(`\n🧹 清理: 完成后删除 ${clearHtmlPath}`);