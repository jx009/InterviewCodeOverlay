#!/usr/bin/env node

/**
 * InterviewCodeOverlay 邮箱验证码发送问题调试工具
 * 专门用于排查验证码发送失败的问题
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

class EmailDebugger {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3001/api';
    this.testEmail = '2694954588@qq.com'; // 从截图中看到的邮箱
    
    this.api = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async runDiagnosis() {
    console.clear();
    console.log('='.repeat(80));
    log.title('InterviewCodeOverlay 邮箱验证码发送问题调试');
    console.log('='.repeat(80));
    console.log('');

    try {
      await this.step1_CheckServices();
      await this.step2_CheckConfiguration();
      await this.step3_TestEmailSending();
      await this.step4_CheckAPIEndpoint();
      await this.step5_TroubleshootSMTP();
      
      console.log('');
      console.log('='.repeat(80));
      log.title('诊断完成');
      console.log('='.repeat(80));
      this.showSolutions();
      
    } catch (error) {
      log.error(`调试过程中出现错误: ${error.message}`);
      this.showEmergencySolutions();
    }
  }

  async step1_CheckServices() {
    log.step('第1步：检查服务状态');
    console.log('');
    
    // 检查后端服务
    try {
      log.info('检查后端服务...');
      const healthResponse = await this.api.get('/health');
      
      if (healthResponse.status === 200) {
        log.success('后端服务正常运行');
        console.log(`   - 状态: ${healthResponse.data.status}`);
        console.log(`   - 时间: ${healthResponse.data.timestamp}`);
        console.log(`   - 服务: ${healthResponse.data.service}`);
      }
    } catch (error) {
      log.error('后端服务无法访问');
      console.log(`   - 错误: ${error.message}`);
      console.log(`   - 确保运行: cd backend && npm run build && node dist/server-enhanced.js`);
      throw new Error('后端服务未启动');
    }

    // 检查增强认证端点
    try {
      log.info('检查增强认证端点...');
      const authResponse = await this.api.get('/auth-enhanced/session-status');
      
      // 401是预期的（未认证）
      if (authResponse.status === 401 || authResponse.status === 200) {
        log.success('增强认证端点正常');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        log.success('增强认证端点正常（未认证状态）');
      } else {
        log.warning('增强认证端点可能有问题');
        console.log(`   - 状态码: ${error.response?.status}`);
        console.log(`   - 错误: ${error.message}`);
      }
    }

    console.log('');
  }

  async step2_CheckConfiguration() {
    log.step('第2步：检查配置文件');
    console.log('');
    
    // 检查.env文件
    const envPath = path.join(__dirname, 'backend', '.env');
    log.info('检查.env配置文件...');
    
    if (fs.existsSync(envPath)) {
      log.success('.env文件存在');
      
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      // 检查SMTP配置
      const smtpConfigs = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
      let smtpConfigured = true;
      
      log.info('检查SMTP配置...');
      smtpConfigs.forEach(key => {
        const line = envLines.find(line => line.startsWith(`${key}=`));
        if (line && line.includes('=') && line.split('=')[1].trim()) {
          console.log(`   ✅ ${key}: ${line.split('=')[1].substring(0, 10)}...`);
        } else {
          console.log(`   ❌ ${key}: 未配置`);
          smtpConfigured = false;
        }
      });
      
      if (!smtpConfigured) {
        log.error('SMTP配置不完整');
        console.log('   - 运行配置向导: node backend/configure-smtp.js');
      } else {
        log.success('SMTP配置完整');
      }
      
      // 检查Redis配置
      log.info('检查Redis配置...');
      const redisHost = envLines.find(line => line.startsWith('REDIS_HOST='));
      const redisPort = envLines.find(line => line.startsWith('REDIS_PORT='));
      
      if (redisHost && redisPort) {
        log.success('Redis配置存在');
        console.log(`   - Redis地址: ${redisHost.split('=')[1] || 'localhost'}:${redisPort.split('=')[1] || '6379'}`);
      } else {
        log.warning('Redis配置可能缺失');
      }
      
    } else {
      log.error('.env文件不存在');
      console.log('   - 复制示例文件: cp backend/env.example backend/.env');
      console.log('   - 运行配置向导: node backend/configure-smtp.js');
      throw new Error('配置文件缺失');
    }

    console.log('');
  }

  async step3_TestEmailSending() {
    log.step('第3步：测试邮件发送功能');
    console.log('');
    
    try {
      log.info(`测试向 ${this.testEmail} 发送验证码...`);
      
      const response = await this.api.post('/auth-enhanced/send-verification-code', {
        email: this.testEmail
      });
      
      if (response.data.success) {
        log.success('验证码发送成功！');
        console.log(`   - Token: ${response.data.token?.substring(0, 15)}...`);
        console.log(`   - 过期时间: ${response.data.expiresIn}秒`);
        
        if (response.data.isExistingUser) {
          log.info('该邮箱已注册，建议直接登录');
        }
        
        return true;
      } else {
        log.error('验证码发送失败');
        console.log(`   - 错误信息: ${response.data.error}`);
        return false;
      }
      
    } catch (error) {
      log.error('验证码发送请求失败');
      console.log(`   - HTTP状态: ${error.response?.status}`);
      console.log(`   - 错误类型: ${error.code}`);
      console.log(`   - 错误信息: ${error.response?.data?.error || error.message}`);
      
      // 详细错误分析
      if (error.response?.status === 400) {
        log.warning('请求参数错误 - 检查邮箱格式');
      } else if (error.response?.status === 429) {
        log.warning('发送频率限制 - 请稍后重试');
      } else if (error.response?.status === 500) {
        log.warning('服务器内部错误 - 可能是SMTP配置或Redis连接问题');
      } else if (error.code === 'ECONNREFUSED') {
        log.warning('连接被拒绝 - 后端服务未启动');
      } else if (error.code === 'NETWORK_ERROR') {
        log.warning('网络错误 - 检查网络连接');
      }
      
      return false;
    }
  }

  async step4_CheckAPIEndpoint() {
    log.step('第4步：检查API端点详情');
    console.log('');
    
    try {
      log.info('检查健康状态端点...');
      const healthResponse = await this.api.get('/health');
      
      if (healthResponse.data) {
        console.log('   - 服务状态详情:');
        console.log(`     * 状态: ${healthResponse.data.status}`);
        console.log(`     * 时间戳: ${healthResponse.data.timestamp}`);
        console.log(`     * 服务名: ${healthResponse.data.service}`);
        
        // 如果有更详细的健康检查信息
        if (healthResponse.data.redis) {
          console.log(`     * Redis: ${healthResponse.data.redis}`);
        }
        if (healthResponse.data.email) {
          console.log(`     * 邮件服务: ${healthResponse.data.email}`);
        }
      }
      
    } catch (error) {
      log.error('无法获取详细健康状态');
    }

    // 尝试访问具体的验证码端点
    try {
      log.info('测试验证码端点可访问性...');
      
      // 发送一个无效请求来测试端点是否存在
      await this.api.post('/auth-enhanced/send-verification-code', {});
      
    } catch (error) {
      if (error.response?.status === 400) {
        log.success('验证码端点存在（参数验证正常）');
      } else if (error.response?.status === 404) {
        log.error('验证码端点不存在 - 可能路由配置问题');
      } else {
        log.warning(`验证码端点响应异常: ${error.response?.status}`);
      }
    }

    console.log('');
  }

  async step5_TroubleshootSMTP() {
    log.step('第5步：SMTP问题排查');
    console.log('');
    
    log.info('分析可能的SMTP问题...');
    
    // 读取配置来分析问题
    const envPath = path.join(__dirname, 'backend', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      const smtpHost = envLines.find(line => line.startsWith('SMTP_HOST='))?.split('=')[1];
      const smtpUser = envLines.find(line => line.startsWith('SMTP_USER='))?.split('=')[1];
      
      if (smtpHost) {
        console.log(`   - SMTP服务器: ${smtpHost}`);
        
        if (smtpHost.includes('gmail.com')) {
          log.info('Gmail SMTP 检查项：');
          console.log('     * 确保开启了两步验证');
          console.log('     * 使用应用专用密码（不是Gmail密码）');
          console.log('     * 检查"允许安全性较低的应用"设置');
        } else if (smtpHost.includes('qq.com')) {
          log.info('QQ邮箱 SMTP 检查项：');
          console.log('     * 确保开启了SMTP服务');
          console.log('     * 使用授权码（不是QQ密码）');
          console.log('     * 授权码通常是16位字符');
        } else if (smtpHost.includes('163.com')) {
          log.info('163邮箱 SMTP 检查项：');
          console.log('     * 确保开启了SMTP服务');
          console.log('     * 使用客户端授权密码');
        }
      }
      
      if (smtpUser) {
        console.log(`   - 发送邮箱: ${smtpUser}`);
      }
    }

    console.log('');
  }

  showSolutions() {
    console.log('');
    log.title('解决方案建议');
    console.log('');
    
    log.info('1. 如果后端服务未启动：');
    console.log('   cd backend');
    console.log('   npm run build');
    console.log('   node dist/server-enhanced.js');
    console.log('');
    
    log.info('2. 如果SMTP配置有问题：');
    console.log('   node backend/configure-smtp.js  # 重新配置');
    console.log('   node backend/test-enhanced-auth.js  # 测试功能');
    console.log('');
    
    log.info('3. 如果Redis连接失败：');
    console.log('   # Windows:');
    console.log('   redis-server');
    console.log('   # 或安装Redis: https://redis.io/download');
    console.log('');
    
    log.info('4. 手动测试验证码发送：');
    console.log('   curl -X POST http://localhost:3001/api/auth-enhanced/send-verification-code \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log(`     -d '{"email":"${this.testEmail}"}'`);
    console.log('');
    
    log.info('5. 查看详细日志：');
    console.log('   # 后端服务的控制台输出会显示详细错误信息');
    console.log('');
  }

  showEmergencySolutions() {
    console.log('');
    log.title('紧急解决方案');
    console.log('');
    
    log.warning('如果问题持续存在，请尝试：');
    console.log('');
    
    console.log('1. 完全重新启动：');
    console.log('   # 停止所有服务');
    console.log('   # 重新配置SMTP: node backend/configure-smtp.js');
    console.log('   # 重新启动后端: cd backend && npm run build && node dist/server-enhanced.js');
    console.log('   # 重新启动前端: cd web && npm run dev');
    console.log('');
    
    console.log('2. 检查防火墙和网络：');
    console.log('   # 确保端口3001没有被占用');
    console.log('   # 检查防火墙是否阻止了连接');
    console.log('');
    
    console.log('3. 使用传统认证模式：');
    console.log('   # 在Web页面关闭"增强认证"模式');
    console.log('   # 使用传统的用户名密码注册');
    console.log('');
  }
}

// 主函数
async function main() {
  const emailDebugger = new EmailDebugger();
  await emailDebugger.runDiagnosis();
}

// 错误处理
process.on('SIGINT', () => {
  console.log('\n');
  log.warning('调试已取消');
  process.exit(0);
});

// 运行调试
if (require.main === module) {
  main().catch((error) => {
    console.error('\n');
    log.error(`调试失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = EmailDebugger; 