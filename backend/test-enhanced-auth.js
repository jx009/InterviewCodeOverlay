/**
 * InterviewCodeOverlay 增强认证系统测试脚本
 * 测试新的验证码注册和登录流程
 */

const axios = require('axios');

// 配置
const API_BASE = 'http://localhost:3001/api/auth-enhanced';
const TEST_EMAIL = 'test@example.com';
const TEST_USERNAME = 'testuser123';
const TEST_PASSWORD = 'password123';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.bright}${colors.blue}🎯 ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.blue}🔄 ${msg}${colors.reset}`)
};

// 测试步骤
async function testCompleteFlow() {
  console.log('\n' + '='.repeat(60));
  log.title('InterviewCodeOverlay 增强认证系统测试');
  console.log('='.repeat(60));

  try {
    // 步骤1：发送验证码
    log.step('步骤1：发送邮箱验证码');
    const codeResponse = await api.post('/send-verification-code', {
      email: TEST_EMAIL
    });

    if (codeResponse.data.success) {
      log.success(`验证码已发送到 ${TEST_EMAIL}`);
      log.info(`验证Token: ${codeResponse.data.token.substring(0, 10)}...`);
      log.info(`有效期: ${codeResponse.data.expiresIn} 秒`);
      
      const verificationToken = codeResponse.data.token;
      
      // 模拟用户输入验证码（在实际情况下，这来自邮件）
      log.warning('⚠️ 注意：实际场景中，验证码会发送到邮箱');
      log.warning('⚠️ 这里模拟用户从邮件中获取验证码');
      
      // 从Redis获取验证码进行测试（仅测试用）
      const simulatedCode = '123456'; // 在实际测试中，你需要查看邮件或Redis
      
      // 步骤2：验证验证码（可选步骤）
      log.step('步骤2：验证验证码');
      try {
        const verifyResponse = await api.post('/verify-code', {
          token: verificationToken,
          code: simulatedCode
        });
        
        if (verifyResponse.data.success) {
          log.success('验证码验证成功');
        }
      } catch (error) {
        log.warning('验证码验证失败（这是预期的，因为我们使用的是模拟验证码）');
        log.info('在实际使用中，请使用邮件中收到的6位数字验证码');
      }

      // 步骤3：完整注册流程
      log.step('步骤3：完整注册流程');
      try {
        const registerResponse = await api.post('/register', {
          email: TEST_EMAIL,
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
          token: verificationToken,
          code: simulatedCode
        });

        if (registerResponse.data.success) {
          log.success('注册成功！');
          log.info(`用户ID: ${registerResponse.data.user.id}`);
          log.info(`用户名: ${registerResponse.data.user.username}`);
          log.info(`JWT Token: ${registerResponse.data.token.substring(0, 20)}...`);
          log.info(`Session ID: ${registerResponse.data.sessionId}`);
          
          const sessionId = registerResponse.data.sessionId;
          
          // 步骤4：检查会话状态
          log.step('步骤4：检查会话状态');
          const sessionResponse = await api.get(`/session-status?sessionId=${sessionId}`);
          
          if (sessionResponse.data.authenticated) {
            log.success('会话状态正常');
            log.info(`认证用户: ${sessionResponse.data.user.username}`);
          }

          // 步骤5：测试登录流程
          log.step('步骤5：测试登录流程');
          const loginResponse = await api.post('/login', {
            username: TEST_USERNAME,
            password: TEST_PASSWORD
          });

          if (loginResponse.data.success) {
            log.success('登录成功！');
            log.info(`新Session ID: ${loginResponse.data.sessionId}`);
          }

          // 步骤6：测试登出
          log.step('步骤6：测试登出');
          const logoutResponse = await api.post('/logout', {
            sessionId: loginResponse.data.sessionId
          });

          if (logoutResponse.data.success) {
            log.success('登出成功');
          }

        }
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.error?.includes('验证码')) {
          log.warning('注册失败：验证码相关错误（这是预期的）');
          log.info('原因：使用了模拟验证码而非真实邮件验证码');
        } else {
          throw error;
        }
      }

    } else {
      log.error('发送验证码失败');
    }

  } catch (error) {
    log.error(`测试失败: ${error.message}`);
    if (error.response) {
      log.error(`状态码: ${error.response.status}`);
      log.error(`错误信息: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// 测试健康检查
async function testHealthCheck() {
  log.step('检查服务器健康状态');
  try {
    const response = await axios.get('http://localhost:3001/health');
    if (response.data.status === 'ok') {
      log.success('服务器健康检查通过');
      log.info(`数据库: ${response.data.services.database}`);
      log.info(`Redis: ${response.data.services.redis}`);
      log.info(`邮件: ${response.data.services.email}`);
      return true;
    }
  } catch (error) {
    log.error('服务器健康检查失败');
    log.error('请确保服务器正在运行: npm run start:enhanced');
    return false;
  }
}

// 实际邮件发送测试（需要配置SMTP）
async function testRealEmailSending() {
  log.title('真实邮件发送测试');
  log.warning('⚠️ 这将发送真实邮件，请确保SMTP已正确配置');
  
  // 可以在这里提示用户输入真实邮箱
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('请输入您的邮箱地址进行测试（按Enter跳过）: ', async (email) => {
      rl.close();
      
      if (!email.trim()) {
        log.info('跳过真实邮件测试');
        resolve();
        return;
      }

      try {
        log.step(`发送验证码到 ${email}`);
        const response = await api.post('/send-verification-code', { email });
        
        if (response.data.success) {
          log.success('验证码已发送！请检查您的邮箱');
          log.info(`验证Token: ${response.data.token}`);
          log.warning('请使用收到的验证码进行后续测试');
        }
      } catch (error) {
        log.error(`邮件发送失败: ${error.message}`);
      }
      
      resolve();
    });
  });
}

// 主函数
async function main() {
  console.log(`开始时间: ${new Date().toLocaleString()}`);
  
  // 检查服务器状态
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    process.exit(1);
  }

  console.log('\n');
  
  // 基础流程测试
  await testCompleteFlow();
  
  console.log('\n');
  
  // 真实邮件测试（可选）
  await testRealEmailSending();

  console.log('\n' + '='.repeat(60));
  log.title('测试完成');
  console.log('='.repeat(60));
  
  log.info('测试说明:');
  console.log('• 基础流程测试使用模拟数据');
  console.log('• 真实使用需要配置SMTP并使用真实邮箱');
  console.log('• 验证码有效期为5分钟');
  console.log('• 会话有效期为7天');
  console.log('\n如需测试真实邮件发送，请：');
  console.log('1. 配置 .env 文件中的SMTP参数');
  console.log('2. 使用真实邮箱地址');
  console.log('3. 从邮件中获取6位数字验证码');
  
  console.log(`\n结束时间: ${new Date().toLocaleString()}`);
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testCompleteFlow,
  testHealthCheck,
  testRealEmailSending
}; 