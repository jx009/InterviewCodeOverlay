const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const redis = require('redis');
require('dotenv').config();

const app = express();
const PORT = 3001;

// 中间件
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

// Redis连接 - 使用您的Redis服务
let redisClient = null;

async function initRedis() {
  try {
    redisClient = redis.createClient({
      socket: {
        host: 'localhost',
        port: 6379
      }
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis连接错误:', err);
    });
    
    await redisClient.connect();
    console.log('✅ Redis连接成功 (C:\\Program Files\\Redis)');
    
  } catch (error) {
    console.error('❌ Redis连接失败:', error);
    process.exit(1);
  }
}

// MySQL连接
let mysqlConnection = null;

async function initMySQL() {
  try {
    mysqlConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'Jianxin0520!',
      database: process.env.DB_NAME || 'interview_coder',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('✅ MySQL连接成功');
    
    // 创建用户表（如果不存在）
    await mysqlConnection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ 用户表检查完成');
    
  } catch (error) {
    console.error('❌ MySQL连接失败:', error);
    process.exit(1);
  }
}

// SMTP邮件服务
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

// 生成6位数字验证码
function generateVerificationCode() {
  // 🚀 开发模式：固定验证码便于测试
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    return '123456';
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 生成验证token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 生成30位随机session_id
function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 30; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 获取客户端IP地址
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '127.0.0.1';
}

// 邮件模板
function createVerificationEmail(code, email) {
  return {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'InterviewCodeOverlay - 邮箱验证码',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">InterviewCodeOverlay</h1>
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

// ============================================
// API路由 - 按照流程图要求
// ============================================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '完整认证服务正常运行',
    timestamp: new Date().toISOString(),
    services: {
      redis: redisClient?.isOpen || false,
      mysql: mysqlConnection ? true : false,
      smtp: transporter ? true : false
    },
    features: ['完整注册流程', '完整登录流程', 'Redis会话管理', 'MySQL用户管理']
  });
});

// 流程图API 1: /mail_verify - 邮箱验证（发送验证码）
app.post('/api/mail_verify', async (req, res) => {
  try {
    const { email, username } = req.body; // 🆕 支持传入用户名进行检查
    
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
    
    // 🆕 检查邮箱和用户名是否已存在
    const conflicts = [];
    if (email) {
      const [emailUsers] = await mysqlConnection.execute(
        'SELECT id, username FROM users WHERE email = ?',
        [email]
      );
      if (emailUsers.length > 0) {
        conflicts.push(`邮箱 ${email} 已被用户 "${emailUsers[0].username}" 使用`);
      }
    }
    
    if (username) {
      const [usernameUsers] = await mysqlConnection.execute(
        'SELECT id, email FROM users WHERE username = ?',
        [username]
      );
      if (usernameUsers.length > 0) {
        // 隐藏部分邮箱信息保护隐私
        const maskedEmail = usernameUsers[0].email.replace(/(.{3}).*@/, '$1***@');
        conflicts.push(`用户名 "${username}" 已被注册（邮箱：${maskedEmail}）`);
      }
    }
    
    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: '注册信息冲突',
        details: conflicts,
        suggestion: '请更换邮箱或用户名，或直接使用已有账户登录'
      });
    }
    
    // 生成验证码和token
    const code = generateVerificationCode();
    const token = generateToken();
    
    // Redis存储token和邮箱、验证码的关系（5分钟有效期）
    const verifyData = JSON.stringify({
      email,
      code,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      attempts: 0
    });
    
    await redisClient.setEx(`verify_token:${token}`, 300, verifyData); // 5分钟
    await redisClient.setEx(`verify_email:${email}`, 300, JSON.stringify({ token, code })); // 5分钟
    
    // 发送邮件
    const mailOptions = createVerificationEmail(code, email);
    await transporter.sendMail(mailOptions);
    
    console.log(`✅ 验证码已发送到 ${email}: ${code}, token: ${token.substring(0, 10)}...`);
    
    res.json({
      success: true,
      message: '验证码已发送，请查收邮件',
      token, // 返回token用于后续注册
      expiresIn: 300 // 5分钟，单位秒
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

// 流程图API - 验证验证码（单独验证接口）
app.post('/api/verify_code', async (req, res) => {
  try {
    const { token, verify_code } = req.body;
    
    if (!token || !verify_code) {
      return res.status(400).json({
        success: false,
        message: 'token和验证码不能为空'
      });
    }
    
    // 验证token获取邮箱和验证码
    const verifyDataStr = await redisClient.get(`verify_token:${token}`);
    if (!verifyDataStr) {
      return res.status(400).json({
        success: false,
        message: '验证令牌无效或已过期'
      });
    }
    
    const verifyData = JSON.parse(verifyDataStr);
    
    // 检查过期时间
    if (new Date() > new Date(verifyData.expiresAt)) {
      await redisClient.del(`verify_token:${token}`);
      return res.status(400).json({
        success: false,
        message: '验证码已过期，请重新获取'
      });
    }
    
    // 验证验证码
    if (verifyData.code !== verify_code) {
      // 增加尝试次数
      verifyData.attempts++;
      if (verifyData.attempts >= 5) {
        await redisClient.del(`verify_token:${token}`);
        return res.status(400).json({
          success: false,
          message: '验证码错误次数过多，请重新获取'
        });
      }
      
      await redisClient.setEx(`verify_token:${token}`, 300, JSON.stringify(verifyData));
      return res.status(400).json({
        success: false,
        message: `验证码错误，还剩 ${5 - verifyData.attempts} 次机会`
      });
    }
    
    // 标记为已验证，避免重复验证
    verifyData.verified = true;
    await redisClient.setEx(`verify_token:${token}`, 300, JSON.stringify(verifyData));
    
    console.log(`✅ 验证码验证成功: ${verifyData.email}, code: ${verify_code}`);
    
    res.json({
      success: true,
      message: '验证码验证成功',
      email: verifyData.email
    });
    
  } catch (error) {
    console.error('验证码验证失败:', error);
    res.status(500).json({
      success: false,
      message: '验证码验证失败，请稍后重试',
      error: error.message
    });
  }
});

// 流程图API 2: /user_register - 用户注册
app.post('/api/user_register', async (req, res) => {
  try {
    const { token, password, username, verify_code } = req.body;
    
    if (!token || !password || !username || !verify_code) {
      return res.status(400).json({
        success: false,
        message: '所有参数都不能为空'
      });
    }
    
    // 验证token获取邮箱和验证码
    const verifyDataStr = await redisClient.get(`verify_token:${token}`);
    if (!verifyDataStr) {
      return res.status(400).json({
        success: false,
        message: '验证令牌无效或已过期'
      });
    }
    
    const verifyData = JSON.parse(verifyDataStr);
    
    // 检查过期时间
    if (new Date() > new Date(verifyData.expiresAt)) {
      await redisClient.del(`verify_token:${token}`);
      return res.status(400).json({
        success: false,
        message: '验证码已过期，请重新获取'
      });
    }
    
    // 检查是否已验证过（通过 /api/verify_code 接口验证）
    if (verifyData.verified) {
      console.log(`✅ 使用已验证的token进行注册: ${verifyData.email}`);
    } else {
      // 如果未通过单独验证接口验证，则验证验证码
    if (verifyData.code !== verify_code) {
      // 增加尝试次数
      verifyData.attempts++;
      if (verifyData.attempts >= 5) {
        await redisClient.del(`verify_token:${token}`);
        return res.status(400).json({
          success: false,
          message: '验证码错误次数过多，请重新获取'
        });
      }
      
      await redisClient.setEx(`verify_token:${token}`, 300, JSON.stringify(verifyData));
      return res.status(400).json({
        success: false,
        message: `验证码错误，还剩 ${5 - verifyData.attempts} 次机会`
      });
      }
    }
    
    const email = verifyData.email;
    
    // 检查用户名和邮箱是否已存在
    const [existingUsers] = await mysqlConnection.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已存在'
      });
    }
    
    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 写入MySQL完成注册
    const now = new Date();
    const [result] = await mysqlConnection.execute(
      'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, now, now]
    );
    
    console.log(`✅ 用户注册成功: ${username} (${email}), ID: ${result.insertId}`);
    
    // 清理Redis中的验证数据（失败不影响注册结果）
    try {
      await redisClient.del(`verify_token:${token}`);
      await redisClient.del(`verify_email:${email}`);
      console.log(`✅ Redis验证数据清理成功`);
    } catch (redisError) {
      console.warn(`⚠️ Redis清理失败，但不影响注册结果:`, redisError.message);
    }
    
    res.json({
      success: true,
      message: '注册成功',
      user: {
        id: result.insertId,
        username,
        email
      }
    });
    
  } catch (error) {
    console.error('用户注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试',
      error: error.message
    });
  }
});

// 流程图API 3: /login - 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIP = getClientIP(req);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '邮箱和密码不能为空'
      });
    }
    
    // 从MySQL验证用户
    const [users] = await mysqlConnection.execute(
      'SELECT id, username, email, password FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const user = users[0];
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: '密码错误'
      });
    }
    
    // 生成30位随机session_id
    const sessionId = generateSessionId();
    
    // 在Redis中保存session_id+IP和Uid的双向关系
    const sessionKey = `session:${sessionId}:${clientIP}`;
    const userSessionKey = `user_sessions:${user.id}`;
    
    const sessionData = JSON.stringify({
      userId: user.id,
      username: user.username,
      email: user.email,
      ip: clientIP,
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    });
    
    // 设置会话数据（7天有效期）
    await redisClient.setEx(sessionKey, 7 * 24 * 60 * 60, sessionData);
    
    // 添加到用户会话列表
    await redisClient.sAdd(userSessionKey, `${sessionId}:${clientIP}`);
    await redisClient.expire(userSessionKey, 7 * 24 * 60 * 60);
    
    console.log(`✅ 用户登录成功: ${user.username} (${email}), Session: ${sessionId}, IP: ${clientIP}`);
    
    // 设置cookie session_id
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: false, // 开发环境设为false
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      sameSite: 'lax'
    });
    
    res.json({
      success: true,
      message: '登录成功',
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试',
      error: error.message
    });
  }
});

// 额外API: 检查会话状态
app.get('/api/session_status', async (req, res) => {
  try {
    const sessionId = req.cookies?.session_id;
    const clientIP = getClientIP(req);
    
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }
    
    const sessionKey = `session:${sessionId}:${clientIP}`;
    const sessionDataStr = await redisClient.get(sessionKey);
    
    if (!sessionDataStr) {
      return res.status(401).json({
        success: false,
        message: '会话已过期'
      });
    }
    
    const sessionData = JSON.parse(sessionDataStr);
    
    // 更新最后活动时间
    sessionData.lastActivity = new Date().toISOString();
    await redisClient.setEx(sessionKey, 7 * 24 * 60 * 60, JSON.stringify(sessionData));
    
    res.json({
      success: true,
      message: '会话有效',
      user: {
        id: sessionData.userId,
        username: sessionData.username,
        email: sessionData.email
      },
      loginTime: sessionData.loginTime,
      lastActivity: sessionData.lastActivity
    });
    
  } catch (error) {
    console.error('检查会话状态失败:', error);
    res.status(500).json({
      success: false,
      message: '检查会话状态失败',
      error: error.message
    });
  }
});

// 额外API: 用户登出
app.post('/api/logout', async (req, res) => {
  try {
    const sessionId = req.cookies?.session_id;
    const clientIP = getClientIP(req);
    
    if (!sessionId) {
      return res.json({
        success: true,
        message: '已登出'
      });
    }
    
    const sessionKey = `session:${sessionId}:${clientIP}`;
    const sessionDataStr = await redisClient.get(sessionKey);
    
    if (sessionDataStr) {
      const sessionData = JSON.parse(sessionDataStr);
      
      // 从用户会话列表中移除
      await redisClient.sRem(`user_sessions:${sessionData.userId}`, `${sessionId}:${clientIP}`);
      
      // 删除会话数据
      await redisClient.del(sessionKey);
      
      console.log(`✅ 用户登出: ${sessionData.username}, Session: ${sessionId}`);
    }
    
    // 清除cookie
    res.clearCookie('session_id');
    
    res.json({
      success: true,
      message: '登出成功'
    });
    
  } catch (error) {
    console.error('用户登出失败:', error);
    res.status(500).json({
      success: false,
      message: '登出失败',
      error: error.message
    });
  }
});

// 启动服务器
async function startServer() {
  try {
    console.log('🚀 启动完整认证服务器...');
    console.log('📊 按照流程图实现注册和登录逻辑');
    console.log('');
    
    console.log('🔌 初始化Redis连接...');
    await initRedis();
    
    console.log('🗄️ 初始化MySQL连接...');
    await initMySQL();
    
    console.log('📧 初始化邮件服务...');
    initEmailService();
    
    app.listen(PORT, () => {
      console.log('');
      console.log('=====================================');
      console.log('  ✅ 完整认证服务器启动成功！');
      console.log('=====================================');
      console.log(`🌐 服务地址: http://localhost:${PORT}`);
      console.log(`🔍 健康检查: http://localhost:${PORT}/api/health`);
      console.log('');
      console.log('📋 流程图API端点:');
      console.log('  POST /api/mail_verify      - 邮箱验证（发送验证码）');
      console.log('  POST /api/user_register    - 用户注册');
      console.log('  POST /api/login           - 用户登录');
      console.log('');
      console.log('📋 额外API端点:');
      console.log('  GET  /api/session_status  - 会话状态检查');
      console.log('  POST /api/logout          - 用户登出');
      console.log('');
      console.log('🔧 技术栈:');
      console.log('  • Redis: C:\\Program Files\\Redis (真实Redis服务)');
      console.log('  • MySQL: 用户数据存储');
      console.log('  • SMTP: 邮件发送服务');
      console.log('  • bcrypt: 密码加密');
      console.log('  • 30位session_id: 会话管理');
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
async function gracefulShutdown() {
  console.log('\n👋 正在关闭服务器...');
  
  try {
    if (redisClient) {
      await redisClient.quit();
      console.log('✅ Redis连接已关闭');
    }
    
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('✅ MySQL连接已关闭');
    }
  } catch (error) {
    console.error('关闭连接时出错:', error);
  }
  
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// 启动服务器
startServer(); 