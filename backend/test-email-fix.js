const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailConfig() {
  console.log('🔍 QQ邮箱SMTP配置诊断');
  console.log('==========================');
  
  // 检查环境变量
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  
  console.log('📧 当前配置:');
  console.log(`SMTP服务器: ${smtpHost}:${smtpPort}`);
  console.log(`用户名: ${smtpUser}`);
  console.log(`密码: ${smtpPass ? '***已设置***' : '❌未设置'}`);
  console.log('');
  
  // 验证QQ邮箱配置
  if (smtpHost === 'smtp.qq.com') {
    console.log('🔧 QQ邮箱配置检查:');
    console.log('✅ SMTP服务器: smtp.qq.com');
    console.log('✅ 端口: 587 (TLS) 或 465 (SSL)');
    
    if (!smtpUser || !smtpUser.includes('@qq.com')) {
      console.log('❌ 错误: SMTP_USER应该是完整的QQ邮箱地址');
      return false;
    }
    
    if (!smtpPass || smtpPass.length < 16) {
      console.log('❌ 错误: SMTP_PASS应该是QQ邮箱的授权码（不是密码）');
      console.log('📋 获取授权码步骤:');
      console.log('1. 登录QQ邮箱网页版');
      console.log('2. 设置 -> 账户 -> POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务');
      console.log('3. 开启POP3/SMTP服务或IMAP/SMTP服务');
      console.log('4. 获取授权码（16位字符）');
      return false;
    }
  }
  
  // 测试SMTP连接
  console.log('🔌 测试SMTP连接...');
  
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: smtpPort === '465', // 465端口使用SSL，587端口使用TLS
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    // 添加调试选项
    debug: true,
    logger: true,
    // 连接超时设置
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });
  
  try {
    // 验证SMTP连接
    await transporter.verify();
    console.log('✅ SMTP连接验证成功！');
    
    // 发送测试邮件
    console.log('📨 发送测试邮件...');
    const testEmail = smtpUser; // 发送给自己
    
    const mailOptions = {
      from: {
        name: 'InterviewCodeOverlay Test',
        address: smtpUser,
      },
      to: testEmail,
      subject: '📧 邮件服务测试 - ' + new Date().toLocaleString(),
      html: `
        <h2>🎉 邮件服务测试成功！</h2>
        <p>如果您收到这封邮件，说明SMTP配置正确。</p>
        <p><strong>配置信息:</strong></p>
        <ul>
          <li>SMTP服务器: ${smtpHost}:${smtpPort}</li>
          <li>用户名: ${smtpUser}</li>
          <li>发送时间: ${new Date().toLocaleString('zh-CN')}</li>
        </ul>
        <p>现在可以正常发送验证码邮件了！</p>
      `,
      text: `邮件服务测试成功！SMTP配置正确。发送时间：${new Date().toLocaleString('zh-CN')}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ 测试邮件发送成功！');
    console.log(`MessageId: ${info.messageId}`);
    console.log('');
    console.log('🎉 邮件配置完全正常，可以发送验证码了！');
    return true;
    
  } catch (error) {
    console.log('❌ SMTP测试失败:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('');
      console.log('🔧 授权失败解决方案:');
      console.log('1. 确认QQ邮箱已开启SMTP服务');
      console.log('2. 使用授权码而不是QQ密码');
      console.log('3. 检查授权码是否正确（16位字符）');
      console.log('4. 尝试重新生成授权码');
      console.log('5. 确认账户没有异常状态');
    } else if (error.code === 'ECONNECTION') {
      console.log('');
      console.log('🔧 连接失败解决方案:');
      console.log('1. 检查网络连接');
      console.log('2. 确认SMTP服务器和端口正确');
      console.log('3. 检查防火墙设置');
    }
    
    return false;
  }
}

// 提供新的授权码更新功能
async function updateAuthCode() {
  console.log('');
  console.log('🔑 更新QQ邮箱授权码');
  console.log('====================');
  console.log('请按照以下步骤获取新的授权码:');
  console.log('');
  console.log('1. 登录QQ邮箱网页版 (https://mail.qq.com)');
  console.log('2. 点击右上角"设置" -> "账户"');
  console.log('3. 找到"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"');
  console.log('4. 开启"IMAP/SMTP服务"（如果未开启）');
  console.log('5. 点击"生成授权码"');
  console.log('6. 将16位授权码复制到.env文件中的SMTP_PASS');
  console.log('');
  console.log('💡 注意: 授权码不是QQ密码，是专门用于第三方登录的16位字符');
}

// 运行测试
testEmailConfig().then(success => {
  if (!success) {
    updateAuthCode();
  }
}).catch(error => {
  console.error('测试过程出错:', error);
});