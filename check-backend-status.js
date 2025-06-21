#!/usr/bin/env node

/**
 * 快速检查后端服务状态
 */

const axios = require('axios');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function checkBackend() {
  console.log('🔍 检查后端服务状态...\n');
  
  try {
    // 检查基础健康端点
    const response = await axios.get('http://localhost:3001/api/health', {
      timeout: 5000
    });
    
    console.log(`${colors.green}✅ 后端服务正常运行${colors.reset}`);
    console.log(`   状态: ${response.data.status}`);
    console.log(`   服务: ${response.data.service}`);
    console.log(`   时间: ${response.data.timestamp}`);
    
    // 测试增强认证端点
    try {
      await axios.get('http://localhost:3001/api/auth-enhanced/session-status');
    } catch (authError) {
      if (authError.response?.status === 401) {
        console.log(`${colors.green}✅ 增强认证端点正常${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️  增强认证端点可能有问题${colors.reset}`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.log(`${colors.red}❌ 后端服务无法访问${colors.reset}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   原因: 连接被拒绝 - 后端服务未启动');
      console.log('   解决: 运行 start-enhanced.bat 启动后端服务');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   原因: 连接超时');
      console.log('   解决: 检查网络连接或防火墙设置');
    } else {
      console.log(`   错误: ${error.message}`);
    }
    
    console.log('\n📝 启动后端服务的步骤:');
    console.log('   1. cd backend');
    console.log('   2. npm install (如果是第一次)');
    console.log('   3. npm run build');
    console.log('   4. node dist/server-enhanced.js');
    console.log('   或者直接运行: start-enhanced.bat');
    
    return false;
  }
}

if (require.main === module) {
  checkBackend().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = checkBackend; 