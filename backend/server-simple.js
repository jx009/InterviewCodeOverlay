const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const Database = require('./database');

// 创建数据库实例
const db = new Database();

const app = express();
const PORT = 3001;

const JWT_SECRET = 'interview-coder-secret-key';
const REFRESH_SECRET = 'interview-coder-refresh-secret';

// AI模型数据
const aiModels = [
  { id: 1, name: 'claude-sonnet-4-20250514-thinking', displayName: 'Claude Sonnet 4 Thinking', provider: 'anthropic', category: 'premium' },
  { id: 2, name: 'claude-3-7-sonnet-thinking', displayName: 'Claude 3.7 Sonnet Thinking', provider: 'anthropic', category: 'premium' },
  { id: 3, name: 'claude-opus-4-20250514-thinking', displayName: 'Claude Opus 4 Thinking', provider: 'anthropic', category: 'premium' },
  { id: 4, name: 'claude-3-7-sonnet-20250219', displayName: 'Claude 3.7 Sonnet', provider: 'anthropic', category: 'standard' },
  { id: 5, name: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', provider: 'anthropic', category: 'standard' },
  { id: 6, name: 'gemini-2.5-flash-preview-04-17-thinking', displayName: 'Gemini 2.5 Flash Thinking', provider: 'google', category: 'premium' },
  { id: 7, name: 'gemini-2.5-flash-preview-04-17', displayName: 'Gemini 2.5 Flash', provider: 'google', category: 'standard' },
  { id: 8, name: 'gemini-2.5-pro-preview-06-05', displayName: 'Gemini 2.5 Pro', provider: 'google', category: 'standard' },
  { id: 9, name: 'gemini-2.5-pro-preview-06-05-thinking', displayName: 'Gemini 2.5 Pro Thinking', provider: 'google', category: 'premium' },
  { id: 10, name: 'chatgpt-4o-latest', displayName: 'ChatGPT 4o Latest', provider: 'openai', category: 'standard' },
  { id: 11, name: 'o3-mini', displayName: 'GPT o3 Mini', provider: 'openai', category: 'premium' }
];

// 🆕 增强认证相关配置
let transporter = null;
const sessionStore = new Map(); // 简单内存存储，生产环境应该使用Redis

// 初始化邮件服务
require('dotenv').config();
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
    console.log('⚠️ SMTP配置不完整，使用开发环境模式');
  }
}

// 生成验证码
function generateVerificationCode() {
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    return '123456'; // 开发环境固定验证码
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 生成验证token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 生成session ID
function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 30; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 邮件模板
function createVerificationEmail(code, email) {
  return {
    from: process.env.SMTP_USER || 'noreply@example.com',
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
        </div>
      </div>
    `
  };
}

// 初始化邮件服务
initEmailService();

// 中间件
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

// 静态文件服务
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// OAuth登录页面路由
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/auth/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth-success.html'));
});

app.get('/auth/error', (req, res) => {
  res.status(400).json({ 
    error: '认证失败',
    message: '登录过程中发生错误，请重试'
  });
});

// 🆕 增强认证中间件（支持sessionId认证）
const authenticateSession = (req, res, next) => {
  // 支持从Cookie或请求头获取sessionId
  const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(401).json({ 
      success: false,
      message: '未登录' 
    });
  }
  
  const sessionData = sessionStore.get(`session:${sessionId}`);
  
  if (!sessionData) {
    return res.status(401).json({ 
      success: false,
      message: '会话已过期' 
    });
  }
  
  // 更新最后活动时间
  sessionData.lastActivity = new Date().toISOString();
  sessionStore.set(`session:${sessionId}`, sessionData);
  
  // 将用户信息添加到请求对象
  req.user = {
    userId: sessionData.userId,
    username: sessionData.username,
    email: sessionData.email
  };
  
  next();
};

// 📱 传统认证中间件（保持兼容性，后续会删除）
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '访问令牌无效' });
    }
    req.user = user;
    next();
  });
};

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Register request received:', req.body);
    const { email, password, username } = req.body;

    // 基本验证
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    // 检查用户是否已存在
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: '用户已存在' });
    }

    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.createUser({
      username: username || email.split('@')[0],
      email,
      password: hashedPassword
    });

    console.log('User registered successfully:', newUser.email);

    // 生成tokens
    const accessToken = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: newUser.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // 存储刷新令牌到数据库
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
    await db.storeRefreshToken(newUser.id, refreshToken, expiresAt.toISOString());

    const response = {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username
      },
      accessToken,
      refreshToken
    };

    console.log('Registration response:', { ...response, accessToken: 'HIDDEN', refreshToken: 'HIDDEN' });
    res.status(201).json(response);
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户（可以用email或username）
    const user = await db.getUserByUsernameOrEmail(username);
    if (!user) {
      return res.status(400).json({ error: '用户不存在' });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: '密码错误' });
    }

    // 生成tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // 存储刷新令牌到数据库
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
    await db.storeRefreshToken(user.id, refreshToken, expiresAt.toISOString());

    console.log(`✅ 用户 ${user.username} 登录成功`);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// OAuth回调接口（用于Electron客户端登录）
app.post('/api/auth/oauth/callback', async (req, res) => {
  try {
    console.log('🔐 收到OAuth回调请求:', req.body);
    const { code, provider } = req.body;

    // 简化的OAuth处理 - 在真实应用中这里会验证code
    // 这里我们创建一个演示用户或使用现有用户
    let user = await db.getUserByEmail('demo@example.com');
    
    if (!user) {
      // 创建演示用户
      const hashedPassword = await bcrypt.hash('demo123', 10);
      user = await db.createUser({
        username: `${provider}_demo_user`,
        email: 'demo@example.com',
        password: hashedPassword
      });
      console.log('✅ 创建了演示用户:', user.username);
    }

    // 生成tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // 存储刷新令牌到数据库
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
    await db.storeRefreshToken(user.id, refreshToken, expiresAt.toISOString());

    console.log(`✅ OAuth登录成功，用户: ${user.username}`);

    res.json({
      success: true,
      token: accessToken, // 注意这里返回的字段名是 token，不是 accessToken
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      refreshToken
    });
  } catch (error) {
    console.error('OAuth回调处理失败:', error);
    res.status(500).json({ 
      success: false,
      error: 'OAuth登录失败，请重试' 
    });
  }
});

// 获取当前用户
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 检查Web端会话状态（不需要认证，用于Electron客户端检查）
app.get('/api/auth/web-session-status', async (req, res) => {
  try {
    // 检查是否有活跃的共享会话文件
    const fs = require('fs');
    const path = require('path');
    const sharedSessionPath = path.join(__dirname, '..', 'shared-session.json');
    
    if (!fs.existsSync(sharedSessionPath)) {
      return res.json({ 
        hasActiveSession: false,
        message: 'No active web session found'
      });
    }
    
    const sharedSession = JSON.parse(fs.readFileSync(sharedSessionPath, 'utf8'));
    
    // 检查会话是否过期
    const now = new Date();
    const expiresAt = new Date(sharedSession.expiresAt);
    
    if (now > expiresAt) {
      // 删除过期的会话文件
      fs.unlinkSync(sharedSessionPath);
      return res.json({ 
        hasActiveSession: false,
        message: 'Web session expired'
      });
    }
    
    console.log(`✅ 检测到活跃的Web会话，用户: ${sharedSession.user.username}`);
    
    res.json({
      hasActiveSession: true,
      user: sharedSession.user,
      message: `Active web session for ${sharedSession.user.username}`
    });
  } catch (error) {
    console.error('检查Web会话状态失败:', error);
    res.json({ 
      hasActiveSession: false,
      message: 'Error checking web session'
    });
  }
});

// 🆕 增强认证：创建共享会话文件
app.post('/api/create-shared-session', authenticateSession, async (req, res) => {
  try {
    console.log('🔄 创建增强认证共享会话文件供Electron客户端使用');
    
    const userId = req.user.userId;
    const user = await db.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: '用户不存在' 
      });
    }
    
    // 🆕 获取当前的sessionId（从请求头或Cookie）
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.status(401).json({ 
        success: false,
        message: '未找到会话ID' 
      });
    }
    
    // 创建共享会话文件（增强认证版本）
    const sharedSession = {
      sessionId,  // 🆕 使用sessionId而不是accessToken
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天
    };
    
    const fs = require('fs');
    const path = require('path');
    const sharedSessionPath = path.join(__dirname, '..', 'shared-session.json');
    
    fs.writeFileSync(sharedSessionPath, JSON.stringify(sharedSession, null, 2));
    
    console.log(`✅ 增强认证共享会话文件已创建，用户: ${user.username}`);
    
    res.json({
      success: true,
      message: '共享会话已创建'
    });
  } catch (error) {
    console.error('创建增强认证共享会话失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器内部错误' 
    });
  }
});

// 📱 传统认证：创建共享token文件（保持兼容性）
app.post('/api/auth/create-shared-session', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 创建共享会话文件供Electron客户端使用');
    
    const userId = req.user.userId;
    const user = await db.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 生成新的token给Electron客户端使用
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' } // 延长到7天
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // 存储刷新令牌到数据库
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
    await db.storeRefreshToken(user.id, refreshToken, expiresAt.toISOString());
    
    // 创建共享会话文件
    const sharedSession = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    
    const fs = require('fs');
    const path = require('path');
    const sharedSessionPath = path.join(__dirname, '..', 'shared-session.json');
    
    fs.writeFileSync(sharedSessionPath, JSON.stringify(sharedSession, null, 2));
    
    console.log(`✅ 共享会话文件已创建，用户: ${user.username}`);
    
    res.json({
      success: true,
      message: '共享会话已创建'
    });
  } catch (error) {
    console.error('创建共享会话失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '服务器内部错误' 
    });
  }
});

// 获取共享会话（供Electron客户端使用）
app.get('/api/auth/shared-session', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const sharedSessionPath = path.join(__dirname, '..', 'shared-session.json');
    
    if (!fs.existsSync(sharedSessionPath)) {
      return res.status(404).json({ 
        success: false, 
        error: '未找到共享会话' 
      });
    }
    
    const sharedSession = JSON.parse(fs.readFileSync(sharedSessionPath, 'utf8'));
    
    // 检查会话是否过期
    const now = new Date();
    const expiresAt = new Date(sharedSession.expiresAt);
    
    if (now > expiresAt) {
      // 删除过期的会话文件
      fs.unlinkSync(sharedSessionPath);
      return res.status(404).json({ 
        success: false, 
        error: '共享会话已过期' 
      });
    }
    
    console.log(`✅ Electron客户端获取共享会话，用户: ${sharedSession.user.username}`);
    
    res.json({
      success: true,
      ...sharedSession
    });
  } catch (error) {
    console.error('获取共享会话失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '服务器内部错误' 
    });
  }
});

// 获取AI模型列表
app.get('/api/config/models', authenticateSession, (req, res) => {
  res.json(aiModels);
});

// 获取编程语言列表
app.get('/api/config/languages', authenticateSession, (req, res) => {
  const languages = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 
    'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'Other'
  ];
  res.json(languages);
});

// 获取用户配置
app.get('/api/config', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    const config = await db.getUserConfig(userId);
    
    console.log(`📋 获取用户 ${userId} 的配置:`, {
      aiModel: config.aiModel,
      programmingModel: config.programmingModel,
      multipleChoiceModel: config.multipleChoiceModel,
      language: config.language
    });
    
    res.json(config);
  } catch (error) {
    console.error('❌ 获取配置失败:', error);
    res.status(500).json({ error: '获取配置失败' });
  }
});

// 更新用户配置
app.put('/api/config', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log(`🔄 用户 ${userId} 请求更新配置:`, req.body);
    
    const updatedConfig = await db.updateUserConfig(userId, req.body);
    
    console.log(`✅ 用户 ${userId} 配置已更新:`, {
      aiModel: updatedConfig.aiModel,
      programmingModel: updatedConfig.programmingModel,
      multipleChoiceModel: updatedConfig.multipleChoiceModel,
      language: updatedConfig.language
    });
    
    res.json(updatedConfig);
  } catch (error) {
    console.error('❌ 更新配置失败:', error);
    res.status(500).json({ error: '更新配置失败' });
  }
});

// 刷新token端点
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: '刷新令牌缺失' });
    }
    
    // 验证刷新token（包括数据库验证）
    const tokenData = await db.validateRefreshToken(refreshToken);
    
    if (!tokenData) {
      return res.status(401).json({ error: '刷新令牌无效或已过期' });
    }
    
    // 生成新的访问token
    const accessToken = jwt.sign(
      { userId: tokenData.userId, email: tokenData.email },
      JWT_SECRET,
      { expiresIn: '7d' } // 延长到7天
    );
    
    console.log(`🔄 用户 ${tokenData.username} 刷新访问令牌`);
    res.json({ 
      success: true,
      token: accessToken,  // 客户端期望的字段名
      accessToken: accessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: '刷新令牌无效' });
  }
});

// ============================================
// 🆕 增强认证API
// ============================================

// 🆕 流程图API 1: /mail_verify - 邮箱验证（发送验证码）
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
      console.log('⚠️ SMTP服务未配置，使用开发环境模式');
    }
    
    // 🆕 检查邮箱和用户名是否已存在
    const conflicts = [];
    if (email) {
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        conflicts.push(`邮箱 ${email} 已被用户 "${existingUser.username}" 使用`);
      }
    }
    
    if (username) {
      const existingUsername = await db.getUserByUsername(username);
      if (existingUsername) {
        // 隐藏部分邮箱信息保护隐私
        const maskedEmail = existingUsername.email.replace(/(.{3}).*@/, '$1***@');
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
    
    // 内存存储token和邮箱、验证码的关系（5分钟有效期）
    const verifyData = {
      email,
      code,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      attempts: 0
    };
    
    sessionStore.set(`verify_token:${token}`, verifyData);
    sessionStore.set(`verify_email:${email}`, { token, code });
    
    // 5分钟后自动清理
    setTimeout(() => {
      sessionStore.delete(`verify_token:${token}`);
      sessionStore.delete(`verify_email:${email}`);
    }, 5 * 60 * 1000);
    
    // 发送邮件
    if (transporter) {
      const mailOptions = createVerificationEmail(code, email);
      await transporter.sendMail(mailOptions);
      console.log(`✅ 验证码已发送到 ${email}: ${code}, token: ${token.substring(0, 10)}...`);
    } else {
      console.log(`📧 开发环境模式 - 验证码: ${code}, 邮箱: ${email}, token: ${token.substring(0, 10)}...`);
    }
    
    res.json({
      success: true,
      message: transporter ? '验证码已发送，请查收邮件' : `开发环境模式 - 验证码: ${code}`,
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

// 🆕 流程图API - 验证验证码
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
    const verifyData = sessionStore.get(`verify_token:${token}`);
    if (!verifyData) {
      return res.status(400).json({
        success: false,
        message: '验证令牌无效或已过期'
      });
    }
    
    // 检查过期时间
    if (new Date() > new Date(verifyData.expiresAt)) {
      sessionStore.delete(`verify_token:${token}`);
      return res.status(400).json({
        success: false,
        message: '验证码已过期，请重新获取'
      });
    }
    
    // 验证验证码
    if (verifyData.code !== verify_code) {
      verifyData.attempts++;
      if (verifyData.attempts >= 5) {
        sessionStore.delete(`verify_token:${token}`);
        return res.status(400).json({
          success: false,
          message: '验证码错误次数过多，请重新获取'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `验证码错误，还剩 ${5 - verifyData.attempts} 次机会`
      });
    }
    
    // 标记为已验证
    verifyData.verified = true;
    sessionStore.set(`verify_token:${token}`, verifyData);
    
    console.log(`✅ 验证码验证成功: ${verifyData.email}`);
    
    res.json({
      success: true,
      message: '验证码验证成功',
      email: verifyData.email
    });
    
  } catch (error) {
    console.error('验证码验证失败:', error);
    res.status(500).json({
      success: false,
      message: '验证码验证失败，请稍后重试'
    });
  }
});

// 🆕 流程图API 2: /user_register - 增强用户注册
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
    const verifyData = sessionStore.get(`verify_token:${token}`);
    if (!verifyData) {
      return res.status(400).json({
        success: false,
        message: '验证令牌无效或已过期'
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
        sessionStore.delete(`verify_token:${token}`);
        return res.status(400).json({
          success: false,
          message: '验证码错误次数过多，请重新获取'
        });
      }
      
      sessionStore.set(`verify_token:${token}`, verifyData);
      return res.status(400).json({
        success: false,
        message: `验证码错误，还剩 ${5 - verifyData.attempts} 次机会`
      });
      }
    }
    
    const email = verifyData.email;
    
    // 检查用户名和邮箱是否已存在
    const existingUserByUsername = await db.getUserByUsername(username);
    const existingUserByEmail = await db.getUserByEmail(email);
    
    if (existingUserByUsername || existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已存在'
      });
    }
    
    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建用户
    const newUser = await db.createUser({
      username,
      email,
      password: hashedPassword
    });
    
    console.log(`✅ 用户注册成功: ${username} (${email}), ID: ${newUser.id}`);
    
    // 清理内存中的验证数据（失败不影响注册结果）
    try {
      sessionStore.delete(`verify_token:${token}`);
      sessionStore.delete(`verify_email:${email}`);
      console.log(`✅ 内存验证数据清理成功`);
    } catch (memoryError) {
      console.warn(`⚠️ 内存清理失败，但不影响注册结果:`, memoryError.message);
    }
    
    res.json({
      success: true,
      message: '注册成功',
      user: {
        id: newUser.id,
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
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '邮箱和密码不能为空'
      });
    }
    
    // 从数据库验证用户
    const user = await db.getUserByEmail(email);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '用户不存在'
      });
    }
    
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
    
    // 在内存中保存session和用户信息的关系
    const sessionData = {
      userId: user.id,
      username: user.username,
      email: user.email,
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    // 设置会话数据（7天有效期）
    sessionStore.set(`session:${sessionId}`, sessionData);
    
    console.log(`✅ 用户登录成功: ${user.username} (${email}), Session: ${sessionId}`);
    
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

// 额外API: 用户登出
app.post('/api/logout', async (req, res) => {
  try {
    // 🆕 支持从Cookie或请求头获取sessionId
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.json({
        success: true,
        message: '已登出'
      });
    }
    
    const sessionData = sessionStore.get(`session:${sessionId}`);
    
    if (sessionData) {
      // 删除会话数据
      sessionStore.delete(`session:${sessionId}`);
      
      console.log(`✅ 用户登出: ${sessionData.username}, Session: ${sessionId}`);
    }
    
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

// 额外API: 检查会话状态
app.get('/api/session_status', async (req, res) => {
  try {
    // 🆕 支持从Cookie或请求头获取sessionId
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }
    
    const sessionData = sessionStore.get(`session:${sessionId}`);
    
    if (!sessionData) {
      return res.status(401).json({
        success: false,
        message: '会话已过期'
      });
    }
    
    // 更新最后活动时间
    sessionData.lastActivity = new Date().toISOString();
    sessionStore.set(`session:${sessionId}`, sessionData);
    
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

// ============================================
// 传统认证API（保持兼容性）
// ============================================

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
}); 