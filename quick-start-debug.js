#!/usr/bin/env node

/**
 * 快速启动和调试脚本
 * 用于排查验证码发送问题
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

console.log('🚀 InterviewCodeOverlay 验证码问题诊断');
console.log('=' .repeat(60));

async function main() {
  // 1. 检查.env文件
  console.log('\n📋 第1步：检查配置文件');
  const envPath = path.join(__dirname, 'backend', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ 没有找到.env文件');
    console.log('📝 请运行以下命令创建配置文件：');
    console.log('   cd backend');
    console.log('   copy env.example .env');
    console.log('   node configure-smtp.js');
    return;
  }
  
  console.log('✅ .env文件存在');
  
  // 读取并检查配置
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  const configs = {
    'SMTP_HOST': false,
    'SMTP_USER': false,
    'SMTP_PASS': false,
    'REDIS_URL': false
  };
  
  envLines.forEach(line => {
    const [key, value] = line.split('=');
    if (configs.hasOwnProperty(key) && value && value.trim() !== '') {
      configs[key] = true;
    }
  });
  
  console.log('\n📊 配置状态：');
  Object.entries(configs).forEach(([key, configured]) => {
    console.log(`   ${configured ? '✅' : '❌'} ${key}: ${configured ? '已配置' : '未配置'}`);
  });
  
  // 2. 检查Redis连接
  console.log('\n🔌 第2步：检查Redis连接');
  try {
    const http = require('http');
    
    // 简单的Redis连接测试（通过HTTP检查是否能连接到6379端口）
    const testRedis = () => {
      return new Promise((resolve) => {
        const net = require('net');
        const socket = new net.Socket();
        
        socket.setTimeout(3000);
        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });
        
        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });
        
        socket.on('error', () => {
          resolve(false);
        });
        
        socket.connect(6379, 'localhost');
      });
    };
    
    const redisConnected = await testRedis();
    if (redisConnected) {
      console.log('✅ Redis端口6379可访问');
    } else {
      console.log('❌ Redis端口6379无法访问');
      console.log('📝 请启动Redis服务：');
      console.log('   - 下载Redis：https://redis.io/download');
      console.log('   - 或使用Docker：docker run -d -p 6379:6379 redis');
    }
  } catch (error) {
    console.log('❌ Redis连接检查失败:', error.message);
  }
  
  // 3. 快速发送测试
  console.log('\n📧 第3步：测试验证码发送');
  
  // 如果SMTP未配置，提供快速测试方法
  if (!configs['SMTP_HOST'] || !configs['SMTP_USER']) {
    console.log('❌ SMTP未配置，无法发送真实邮件');
    console.log('📝 配置SMTP的方法：');
    console.log('   1. cd backend');
    console.log('   2. node configure-smtp.js');
    console.log('   3. 按提示输入邮箱配置');
    
    // 提供模拟测试
    console.log('\n🧪 模拟验证码发送测试：');
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`   邮箱: 2694954588@qq.com`);
    console.log(`   验证码: ${mockCode}`);
    console.log(`   状态: ✅ 模拟发送成功`);
    console.log(`   说明: 这是模拟测试，实际需要配置SMTP才能发送真实邮件`);
  } else {
    console.log('✅ SMTP已配置，可以发送真实邮件');
  }
  
  // 4. 启动建议
  console.log('\n🚀 第4步：启动建议');
  console.log('如果要启动完整服务：');
  console.log('   1. 确保Redis运行：redis-server (如果已安装)');
  console.log('   2. 配置SMTP：cd backend && node configure-smtp.js');
  console.log('   3. 编译代码：cd backend && npm run build');
  console.log('   4. 启动服务：cd backend && node dist/server-enhanced.js');
  console.log('   5. 启动前端：cd web && npm run dev');
  
  console.log('\n🔧 快速修复验证码问题的步骤：');
  console.log('   1. 先用简单服务器测试：cd backend && node server-simple.js');
  console.log('   2. 在浏览器访问：http://localhost:3001/api/health');
  console.log('   3. 如果正常，说明基础服务OK');
  console.log('   4. 然后配置邮件服务发送真实验证码');
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 问题诊断完成！');
}

main().catch(error => {
  console.error('诊断过程出错:', error.message);
}); 