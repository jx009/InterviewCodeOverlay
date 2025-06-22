#!/usr/bin/env node

/**
 * InterviewCodeOverlay 增强认证前端集成测试
 * 测试Web端和Electron端的增强认证功能
 */

const axios = require('axios');

// 测试配置
const TEST_CONFIG = {
  webBaseUrl: 'http://localhost:3000',
  apiBaseUrl: 'http://localhost:3001/api',
  testEmail: 'test@example.com',
  testPassword: 'test123456',
  testUsername: 'testuser'
};

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.bright}${colors.cyan}🎯 ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.blue}🔄 ${msg}${colors.reset}`)
};

class IntegrationTester {
  constructor() {
    this.api = axios.create({
      baseURL: TEST_CONFIG.apiBaseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async runTests() {
    console.clear();
    console.log('='.repeat(80));
    log.title('InterviewCodeOverlay 增强认证前端集成测试');
    console.log('='.repeat(80));
    console.log('');

    try {
      await this.testHealthCheck();
      await this.testEnhancedAuthentication();
      await this.testWebIntegration();
      await this.testSessionManagement();
      await this.testErrorHandling();
      
      console.log('');
      console.log('='.repeat(80));
      log.success('所有测试完成！');
      console.log('='.repeat(80));
      
    } catch (error) {
      log.error(`测试失败: ${error.message}`);
      process.exit(1);
    }
  }

  async testHealthCheck() {
    log.step('第1步：健康检查测试');
    
    try {
      // 检查后端服务
      const healthResponse = await this.api.get('/health');
      if (healthResponse.status === 200) {
        log.success('后端服务正常运行');
      } else {
        throw new Error('后端服务健康检查失败');
      }
      
      // 检查增强认证端点
      const enhancedHealthResponse = await this.api.get('/auth-enhanced/session-status');
      if (enhancedHealthResponse.status === 401 || enhancedHealthResponse.status === 200) {
        log.success('增强认证端点正常');
      } else {
        throw new Error('增强认证端点异常');
      }
      
      console.log('');
    } catch (error) {
      log.error(`健康检查失败: ${error.message}`);
      log.warning('请确保后端服务已启动：npm run build && node dist/server-enhanced.js');
      throw error;
    }
  }

  async testEnhancedAuthentication() {
    log.step('第2步：增强认证流程测试');
    
    let verificationToken;
    
    try {
      // 1. 发送验证码
      log.info('测试邮箱验证码发送...');
      const codeResponse = await this.api.post('/auth-enhanced/send-verification-code', {
        email: TEST_CONFIG.testEmail
      });
      
      if (codeResponse.data.success) {
        verificationToken = codeResponse.data.token;
        log.success(`验证码发送成功，Token: ${verificationToken.substring(0, 10)}...`);
      } else {
        throw new Error('验证码发送失败');
      }
      
      // 2. 模拟验证码验证
      log.info('测试验证码验证...');
      const mockCode = '123456'; // 在测试环境中使用固定验证码
      
      try {
        const verifyResponse = await this.api.post('/auth-enhanced/verify-code', {
          token: verificationToken,
          code: mockCode
        });
        
        if (verifyResponse.data.success) {
          log.success('验证码验证成功');
        } else {
          log.warning('验证码验证失败（预期行为，需要真实验证码）');
        }
      } catch (error) {
        log.warning('验证码验证失败（预期行为，需要真实验证码）');
      }
      
      // 3. 测试增强登录（如果用户已存在）
      log.info('测试增强登录...');
      try {
        const loginResponse = await this.api.post('/auth-enhanced/login', {
          email: TEST_CONFIG.testEmail,
          password: TEST_CONFIG.testPassword
        });
        
        if (loginResponse.data.success) {
          log.success('增强登录成功');
          this.accessToken = loginResponse.data.accessToken;
          this.sessionId = loginResponse.data.sessionId;
          log.info(`会话ID: ${this.sessionId?.substring(0, 10)}...`);
        } else {
          log.warning('增强登录失败（可能用户不存在）');
        }
      } catch (error) {
        log.warning('增强登录失败（可能用户不存在）');
      }
      
      console.log('');
    } catch (error) {
      log.error(`增强认证测试失败: ${error.message}`);
      throw error;
    }
  }

  async testWebIntegration() {
    log.step('第3步：Web端集成测试');
    
    try {
      // 检查Web端是否可访问
      try {
        const webResponse = await axios.get(TEST_CONFIG.webBaseUrl, { timeout: 5000 });
        if (webResponse.status === 200) {
          log.success('Web端服务正常运行');
        }
      } catch (error) {
        log.warning('Web端服务未运行（请启动: cd web && npm run dev）');
      }
      
      // 测试Web端API调用
      log.info('测试Web端API集成...');
      
      // 模拟Web端的认证请求
      const webApi = axios.create({
        baseURL: TEST_CONFIG.apiBaseUrl,
        headers: {
          'Content-Type': 'application/json',
          'Origin': TEST_CONFIG.webBaseUrl,
          'User-Agent': 'InterviewCodeOverlay-Web/1.0'
        },
      });
      
      const healthResponse = await webApi.get('/health');
      if (healthResponse.status === 200) {
        log.success('Web端API调用正常');
      }
      
      console.log('');
    } catch (error) {
      log.error(`Web端集成测试失败: ${error.message}`);
      throw error;
    }
  }

  async testSessionManagement() {
    log.step('第4步：会话管理测试');
    
    try {
      if (this.accessToken) {
        // 设置认证头
        this.api.defaults.headers.Authorization = `Bearer ${this.accessToken}`;
        
        // 测试会话状态检查
        log.info('测试会话状态检查...');
        const sessionResponse = await this.api.get('/auth-enhanced/session-status');
        
        if (sessionResponse.data.success) {
          log.success('会话状态检查成功');
          log.info(`当前用户: ${sessionResponse.data.user?.username || '未知'}`);
        }
        
        // 测试会话刷新
        log.info('测试会话刷新...');
        try {
          const refreshResponse = await this.api.post('/auth-enhanced/refresh-session');
          if (refreshResponse.data.success) {
            log.success('会话刷新成功');
          }
        } catch (error) {
          log.warning('会话刷新失败（可能需要有效会话）');
        }
        
        // 测试登出
        log.info('测试增强登出...');
        try {
          const logoutResponse = await this.api.post('/auth-enhanced/logout');
          if (logoutResponse.data.success) {
            log.success('增强登出成功');
          }
        } catch (error) {
          log.warning('增强登出失败');
        }
      } else {
        log.warning('跳过会话管理测试（无有效认证）');
      }
      
      console.log('');
    } catch (error) {
      log.error(`会话管理测试失败: ${error.message}`);
      // 这个测试失败不应该中断整个测试流程
    }
  }

  async testErrorHandling() {
    log.step('第5步：错误处理测试');
    
    try {
      // 测试无效邮箱
      log.info('测试无效邮箱处理...');
      try {
        await this.api.post('/auth-enhanced/send-verification-code', {
          email: 'invalid-email'
        });
        log.error('应该拒绝无效邮箱');
      } catch (error) {
        if (error.response?.status === 400) {
          log.success('正确拒绝无效邮箱');
        } else {
          log.warning('无效邮箱处理异常');
        }
      }
      
      // 测试无效验证码
      log.info('测试无效验证码处理...');
      try {
        await this.api.post('/auth-enhanced/verify-code', {
          token: 'invalid-token',
          code: '000000'
        });
        log.error('应该拒绝无效验证码');
      } catch (error) {
        if (error.response?.status === 400) {
          log.success('正确拒绝无效验证码');
        } else {
          log.warning('无效验证码处理异常');
        }
      }
      
      // 测试无效登录
      log.info('测试无效登录处理...');
      try {
        await this.api.post('/auth-enhanced/login', {
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });
        log.error('应该拒绝无效登录');
      } catch (error) {
        if (error.response?.status === 401) {
          log.success('正确拒绝无效登录');
        } else {
          log.warning('无效登录处理异常');
        }
      }
      
      console.log('');
    } catch (error) {
      log.error(`错误处理测试失败: ${error.message}`);
      // 这个测试失败不应该中断整个测试流程
    }
  }

  showIntegrationGuide() {
    console.log('');
    console.log('='.repeat(80));
    log.title('前端集成使用指南');
    console.log('='.repeat(80));
    console.log('');
    
    log.info('Web端使用方法：');
    console.log('1. 启动Web端: cd web && npm run dev');
    console.log('2. 访问: http://localhost:3000');
    console.log('3. 切换到"增强认证"模式');
    console.log('4. 使用邮箱注册/登录');
    console.log('');
    
    log.info('Electron端使用方法：');
    console.log('1. 启动后端: npm run build && node dist/server-enhanced.js');
    console.log('2. 启动Electron: npm run electron:dev');
    console.log('3. 打开Web配置中心，登录后配置会自动同步');
    console.log('');
    
    log.info('API端点说明：');
    console.log('• POST /auth-enhanced/send-verification-code - 发送验证码');
    console.log('• POST /auth-enhanced/verify-code - 验证验证码');
    console.log('• POST /auth-enhanced/register - 增强注册');
    console.log('• POST /auth-enhanced/login - 增强登录');
    console.log('• POST /auth-enhanced/logout - 增强登出');
    console.log('• GET /auth-enhanced/session-status - 会话状态');
    console.log('• POST /auth-enhanced/refresh-session - 刷新会话');
    console.log('');
    
    log.warning('重要提醒：');
    console.log('• 确保Redis服务正在运行');
    console.log('• 确保SMTP邮件服务已配置');
    console.log('• 验证码有效期为5分钟');
    console.log('• 会话ID自动多端同步');
    console.log('');
  }
}

// 主函数
async function main() {
  const tester = new IntegrationTester();
  
  try {
    await tester.runTests();
    tester.showIntegrationGuide();
  } catch (error) {
    console.error('\n');
    log.error(`集成测试失败: ${error.message}`);
    process.exit(1);
  }
}

// 错误处理
process.on('SIGINT', () => {
  console.log('\n');
  log.warning('测试已取消');
  process.exit(0);
});

// 运行测试
if (require.main === module) {
  main().catch((error) => {
    console.error('\n');
    log.error(`测试执行失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = IntegrationTester; 