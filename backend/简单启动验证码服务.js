const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = 3001;

// 中间件
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

// SMTP配置
let transporter = null;

function initEmailService() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('✅ SMTP服务初始化成功');
  } else {
    console.log('⚠️ SMTP配置不完整，验证码功能不可用');
  }
}

// 内存存储验证码（生产环境请使用Redis）
const verificationCodes = new Map();

// 生成6位数字验证码
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 生成验证token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 邮件模板
function createVerificationEmail(code, email) {
  return {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'QuizCoze - 邮箱验证码',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">QuizCoze</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">面试代码助手</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #333; margin-top: 0;">邮箱验证码</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            您好！您正在注册 InterviewCodeOverlay 账户，请使用以下验证码完成注册：
          </p>
          
          <div style="background: #fff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px dashed #667eea;">
            <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">${code}</span>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            验证码有效期为 5 分钟，请及时使用
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              这是一封自动发送的邮件，请勿回复<br>
              如果您没有申请注册，请忽略此邮件
            </p>
          </div>
        </div>
      </div>
    `
  };
}

// API路由

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '增强认证服务正常运行',
    timestamp: new Date().toISOString(),
    features: ['邮箱验证码', 'SMTP邮件', '内存缓存']
  });
});

// 发送验证码
app.post('/api/auth/send-verification-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: '邮箱地址不能为空'
      });
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      });
    }
    
    if (!transporter) {
      return res.status(500).json({
        success: false,
        message: 'SMTP服务未配置，无法发送验证码'
      });
    }
    
    // 生成验证码和token
    const code = generateVerificationCode();
    const token = generateToken();
    
    // 存储验证码（5分钟有效期）
    verificationCodes.set(email, {
      code,
      token,
      attempts: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5分钟
    });
    
    // 发送邮件
    const mailOptions = createVerificationEmail(code, email);
    await transporter.sendMail(mailOptions);
    
    console.log(`✅ 验证码已发送到 ${email}: ${code}`);
    
    res.json({
      success: true,
      message: '验证码已发送，请查收邮件',
      token,
      expiresIn: 5 * 60 // 5分钟，单位秒
    });
    
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({
      success: false,
      message: '发送验证码失败，请稍后重试',
      error: error.message
    });
  }
});

// 验证验证码
app.post('/api/auth/verify-code', (req, res) => {
  try {
    const { email, code, token } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: '邮箱和验证码不能为空'
      });
    }
    
    const stored = verificationCodes.get(email);
    if (!stored) {
      return res.status(400).json({
        success: false,
        message: '验证码不存在或已过期'
      });
    }
    
    // 检查过期时间
    if (new Date() > stored.expiresAt) {
      verificationCodes.delete(email);
      return res.status(400).json({
        success: false,
        message: '验证码已过期，请重新获取'
      });
    }
    
    // 检查尝试次数
    if (stored.attempts >= 5) {
      verificationCodes.delete(email);
      return res.status(400).json({
        success: false,
        message: '验证码错误次数过多，请重新获取'
      });
    }
    
    // 验证token（如果提供）
    if (token && stored.token !== token) {
      return res.status(400).json({
        success: false,
        message: '验证令牌无效'
      });
    }
    
    // 验证码验证
    if (stored.code !== code) {
      stored.attempts++;
      return res.status(400).json({
        success: false,
        message: `验证码错误，还剩 ${5 - stored.attempts} 次机会`
      });
    }
    
    // 验证成功，删除验证码
    verificationCodes.delete(email);
    
    console.log(`✅ 邮箱 ${email} 验证成功`);
    
    res.json({
      success: true,
      message: '邮箱验证成功',
      verified: true
    });
    
  } catch (error) {
    console.error('验证失败:', error);
    res.status(500).json({
      success: false,
      message: '验证失败，请稍后重试',
      error: error.message
    });
  }
});

// 获取验证码状态（调试用）
app.get('/api/auth/verification-status/:email', (req, res) => {
  const { email } = req.params;
  const stored = verificationCodes.get(email);
  
  if (!stored) {
    return res.json({
      exists: false,
      message: '无验证码记录'
    });
  }
  
  res.json({
    exists: true,
    attempts: stored.attempts,
    expiresAt: stored.expiresAt,
    isExpired: new Date() > stored.expiresAt
  });
});

// 启动服务器
async function startServer() {
  try {
    console.log('🚀 启动增强认证服务器...');
    console.log('📧 初始化邮件服务...');
    
    initEmailService();
    
    app.listen(PORT, () => {
      console.log('');
      console.log('=====================================');
      console.log('  ✅ 增强认证服务器启动成功！');
      console.log('=====================================');
      console.log(`🌐 服务地址: http://localhost:${PORT}`);
      console.log(`🔍 健康检查: http://localhost:${PORT}/api/health`);
      console.log('📧 支持功能: 邮箱验证码发送和验证');
      console.log('⚡ 缓存方式: 内存存储（重启后清空）');
      console.log('');
      console.log('📋 API端点:');
      console.log('  POST /api/auth/send-verification-code');
      console.log('  POST /api/auth/verify-code');
      console.log('  GET  /api/auth/verification-status/:email');
      console.log('');
      console.log('💡 测试命令:');
      console.log('  node test-verification-now.js');
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 正在关闭服务器...');
  process.exit(0);
});

// 启动服务器
startServer(); 