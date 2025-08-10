#!/usr/bin/env node

/**
 * InterviewCodeOverlay SMTP配置向导
 * 帮助用户快速配置邮件服务
 */

const readline = require('readline');
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

// 预设配置
const emailProviders = {
  '1': {
    name: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    instructions: [
      '1. 访问 https://myaccount.google.com/security',
      '2. 开启"两步验证"',
      '3. 生成"应用专用密码"',
      '4. 使用应用专用密码，不是账户密码'
    ]
  },
  '2': {
    name: 'Outlook/Hotmail',
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    instructions: [
      '1. 支持 @outlook.com, @hotmail.com, @live.com',
      '2. 推荐开启两步验证并使用应用密码',
      '3. 或直接使用账户密码'
    ]
  },
  '3': {
    name: 'QQ邮箱',
    host: 'smtp.qq.com',
    port: 587,
    secure: false,
    instructions: [
      '1. 登录QQ邮箱 → 设置 → 账户',
      '2. 开启"SMTP服务"',
      '3. 获取授权码（16位字符）',
      '4. 使用授权码，不是QQ密码'
    ]
  },
  '4': {
    name: '163邮箱',
    host: 'smtp.163.com',
    port: 587,
    secure: false,
    instructions: [
      '1. 登录163邮箱 → 设置 → POP3/SMTP/IMAP',
      '2. 开启"SMTP服务"',
      '3. 设置客户端授权密码',
      '4. 使用授权密码，不是邮箱密码'
    ]
  },
  '5': {
    name: '自定义SMTP',
    host: '',
    port: 587,
    secure: false,
    instructions: [
      '1. 请联系您的邮件服务提供商',
      '2. 获取SMTP服务器地址和端口',
      '3. 确认是否需要SSL/TLS加密',
      '4. 获取正确的用户名和密码'
    ]
  }
};

class SMTPConfigurator {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.config = {};
  }

  async start() {
    console.clear();
    console.log('='.repeat(60));
    log.title('InterviewCodeOverlay SMTP配置向导');
    console.log('='.repeat(60));
    log.info('这个向导将帮助您配置邮件服务，用于发送验证码邮件');
    console.log('');

    try {
      await this.selectProvider();
      await this.inputCredentials();
      await this.confirmConfiguration();
      await this.saveConfiguration();
      await this.testConfiguration();
    } catch (error) {
      log.error(`配置过程中出现错误: ${error.message}`);
    } finally {
      this.rl.close();
    }
  }

  async selectProvider() {
    log.step('第1步：选择邮件服务提供商');
    console.log('');
    
    Object.entries(emailProviders).forEach(([key, provider]) => {
      console.log(`${key}. ${provider.name}`);
    });
    
    console.log('');
    const choice = await this.question('请选择 (1-5): ');
    
    if (!emailProviders[choice]) {
      throw new Error('无效的选择');
    }

    this.selectedProvider = emailProviders[choice];
    log.success(`已选择: ${this.selectedProvider.name}`);
    
    // 显示配置说明
    console.log('');
    log.info('配置说明:');
    this.selectedProvider.instructions.forEach(instruction => {
      console.log(`   ${instruction}`);
    });
    console.log('');
  }

  async inputCredentials() {
    log.step('第2步：输入邮件配置信息');
    console.log('');

    // SMTP服务器
    if (this.selectedProvider.host) {
      this.config.SMTP_HOST = this.selectedProvider.host;
      log.info(`SMTP服务器: ${this.config.SMTP_HOST}`);
    } else {
      this.config.SMTP_HOST = await this.question('SMTP服务器地址: ');
    }

    // 端口
    const defaultPort = this.selectedProvider.port;
    const portInput = await this.question(`SMTP端口 (默认${defaultPort}): `);
    this.config.SMTP_PORT = portInput.trim() || defaultPort;

    // SSL/TLS
    const secureInput = await this.question('是否使用SSL/TLS? (y/N): ');
    this.config.SMTP_SECURE = secureInput.toLowerCase() === 'y' ? 'true' : 'false';

    // 邮箱地址
    this.config.SMTP_USER = await this.question('邮箱地址: ');
    this.config.EMAIL_FROM = this.config.SMTP_USER;

    // 密码
    this.config.SMTP_PASS = await this.question('密码/授权码: ', true);

    console.log('');
  }

  async confirmConfiguration() {
    log.step('第3步：确认配置信息');
    console.log('');
    
    console.log('配置预览:');
    console.log(`SMTP服务器: ${this.config.SMTP_HOST}`);
    console.log(`端口: ${this.config.SMTP_PORT}`);
    console.log(`SSL/TLS: ${this.config.SMTP_SECURE}`);
    console.log(`邮箱: ${this.config.SMTP_USER}`);
    console.log(`密码: ${'*'.repeat(this.config.SMTP_PASS.length)}`);
    
    console.log('');
    const confirm = await this.question('确认保存配置? (Y/n): ');
    
    if (confirm.toLowerCase() === 'n') {
      throw new Error('用户取消配置');
    }
  }

  async saveConfiguration() {
    log.step('第4步：保存配置到.env文件');
    
    const envPath = path.join(__dirname, '.env');
    let envContent = '';

    // 读取现有.env文件
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      log.info('找到现有.env文件，将更新SMTP配置');
    } else {
      log.info('创建新的.env文件');
      // 如果有env.example，复制作为基础
      const examplePath = path.join(__dirname, 'env.example');
      if (fs.existsSync(examplePath)) {
        envContent = fs.readFileSync(examplePath, 'utf8');
        log.info('从env.example复制基础配置');
      }
    }

    // 更新SMTP配置
    const smtpConfigs = [
      'SMTP_HOST',
      'SMTP_PORT', 
      'SMTP_SECURE',
      'SMTP_USER',
      'SMTP_PASS',
      'EMAIL_FROM'
    ];

    smtpConfigs.forEach(key => {
      const value = this.config[key];
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;
      
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, newLine);
      } else {
        envContent += `\n${newLine}`;
      }
    });

    // 保存文件
    fs.writeFileSync(envPath, envContent);
    log.success('配置已保存到.env文件');
    console.log('');
  }

  async testConfiguration() {
    log.step('第5步：测试邮件发送');
    
    const shouldTest = await this.question('是否测试邮件发送? (Y/n): ');
    
    if (shouldTest.toLowerCase() === 'n') {
      log.info('跳过邮件测试');
      this.showCompleteGuide();
      return;
    }

    const testEmail = await this.question('请输入测试邮箱地址: ');
    
    if (!testEmail.includes('@')) {
      log.warning('邮箱格式无效，跳过测试');
      this.showCompleteGuide();
      return;
    }

    log.info('正在启动服务器并测试邮件发送...');
    console.log('');

    try {
      // 这里可以添加实际的邮件测试逻辑
      log.warning('请手动运行以下命令测试邮件发送:');
      console.log('');
      console.log('1. 启动服务器:');
      console.log('   npm run build && node dist/server-enhanced.js');
      console.log('');
      console.log('2. 在新终端中测试:');
      console.log(`   curl -X POST http://localhost:3001/api/auth-enhanced/send-verification-code \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"email":"${testEmail}"}'`);
      console.log('');
      console.log('3. 或运行测试脚本:');
      console.log('   node test-enhanced-auth.js');
      console.log('');
    } catch (error) {
      log.error(`测试失败: ${error.message}`);
    }

    this.showCompleteGuide();
  }

  showCompleteGuide() {
    console.log('');
    console.log('='.repeat(60));
    log.title('配置完成！');
    console.log('='.repeat(60));
    
    log.success('SMTP邮件服务配置已完成');
    console.log('');
    
    log.info('下一步操作:');
    console.log('1. 启动增强版服务器: npm run build && node dist/server-enhanced.js');
    console.log('2. 访问健康检查: http://localhost:3001/health');
    console.log('3. 运行测试脚本: node test-enhanced-auth.js');
    console.log('4. 查看详细文档: 阅读 SMTP配置指南.md');
    console.log('');
    
    log.warning('注意事项:');
    console.log('• 请确保Redis服务正在运行');
    console.log('• 验证码有效期为5分钟');
    console.log('• 每小时最多发送10封验证码邮件');
    console.log('• 如有问题，请查看SMTP配置指南.md');
    console.log('');
  }

  question(prompt, isPassword = false) {
    return new Promise((resolve) => {
      if (isPassword) {
        // 隐藏密码输入
        this.rl.question(prompt, (answer) => {
          resolve(answer.trim());
        });
        this.rl.stdoutMuted = true;
        this.rl._writeToOutput = function _writeToOutput(stringToWrite) {
          if (stringToWrite.charCodeAt(0) === 13) {
            this.output.write(stringToWrite);
          } else {
            this.output.write('*');
          }
        };
      } else {
        this.rl.question(prompt, (answer) => {
          resolve(answer.trim());
        });
      }
    });
  }
}

// 主函数
async function main() {
  const configurator = new SMTPConfigurator();
  await configurator.start();
}

// 错误处理
process.on('SIGINT', () => {
  console.log('\n');
  log.warning('配置已取消');
  process.exit(0);
});

// 运行配置向导
if (require.main === module) {
  main().catch((error) => {
    console.error('\n');
    log.error(`配置失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = SMTPConfigurator; 