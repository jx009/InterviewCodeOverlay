/**
 * 邮件服务测试脚本
 * 用于测试SMTP配置和邮件发送功能
 */

require('dotenv').config();
const { initEmailTransporter, EmailService } = require('./src/utils/email-service');
const { initRedis, closeRedis } = require('./src/config/redis-working');
const readline = require('readline');

// 创建命令行交互界面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 打印SMTP配置信息
function printSMTPConfig() {
  console.log('\n===== SMTP配置信息 =====');
  console.log(`SMTP服务器: ${process.env.SMTP_HOST || '未配置'}`);
  console.log(`SMTP端口: ${process.env.SMTP_PORT || '未配置'}`);
  console.log(`SMTP安全连接: ${process.env.SMTP_SECURE === 'true' ? '是' : '否'}`);
  console.log(`SMTP用户名: ${process.env.SMTP_USER ? '已配置' : '未配置'}`);
  console.log(`SMTP密码: ${process.env.SMTP_PASS ? '已配置' : '未配置'}`);
  console.log(`发件人地址: ${process.env.EMAIL_FROM || process.env.SMTP_USER || '未配置'}`);
  console.log('=======================\n');
}

// 测试发送验证码
async function testSendVerificationCode(email) {
  console.log(`\n🔄 正在发送验证码到 ${email}...`);
  
  try {
    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 发送验证码
    const result = await EmailService.sendVerificationCode(email, code);
    
    if (result) {
      console.log(`✅ 验证码 ${code} 已成功发送到 ${email}`);
    } else {
      console.log(`❌ 验证码发送失败`);
    }
  } catch (error) {
    console.error('❌ 发送过程出错:', error);
  }
}

// 测试发送欢迎邮件
async function testSendWelcomeEmail(email, username) {
  console.log(`\n🔄 正在发送欢迎邮件到 ${email}...`);
  
  try {
    const result = await EmailService.sendWelcomeEmail(email, username);
    
    if (result) {
      console.log(`✅ 欢迎邮件已成功发送到 ${email}`);
    } else {
      console.log(`❌ 欢迎邮件发送失败`);
    }
  } catch (error) {
    console.error('❌ 发送过程出错:', error);
  }
}

// 测试邮件服务
async function testEmailService() {
  console.log('📧 邮件服务测试工具');
  printSMTPConfig();
  
  try {
    // 初始化Redis
    console.log('🔄 初始化Redis...');
    await initRedis();
    
    // 初始化邮件服务
    console.log('🔄 初始化邮件服务...');
    await initEmailTransporter();
    
    // 询问用户要测试的邮箱
    rl.question('请输入测试邮箱: ', async (email) => {
      if (!email || !email.includes('@')) {
        console.log('❌ 邮箱格式不正确');
        await cleanup();
        return;
      }
      
      // 询问测试类型
      rl.question('选择测试类型 (1: 验证码邮件, 2: 欢迎邮件): ', async (type) => {
        if (type === '1') {
          await testSendVerificationCode(email);
        } else if (type === '2') {
          rl.question('请输入用户名: ', async (username) => {
            await testSendWelcomeEmail(email, username || 'TestUser');
            await cleanup();
          });
          return;
        } else {
          console.log('❌ 无效的选择');
        }
        
        await cleanup();
      });
    });
  } catch (error) {
    console.error('❌ 测试过程出错:', error);
    await cleanup();
  }
}

// 清理资源
async function cleanup() {
  try {
    console.log('\n🔄 清理资源...');
    await closeRedis();
    rl.close();
  } catch (error) {
    console.error('❌ 清理资源失败:', error);
    process.exit(1);
  }
}

// 启动测试
testEmailService();

// 处理退出
rl.on('close', () => {
  console.log('\n👋 测试结束');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n\n🛑 收到中断信号');
  await cleanup();
}); 