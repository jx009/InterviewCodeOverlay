// 加载环境变量
require('dotenv').config();

// 🔧 日期处理工具函数
function buildDateRange(startDate, endDate) {
  const dateWhere = {};
  
  if (startDate) {
    // 开始日期设置为当天的00:00:00
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    dateWhere.gte = startDateTime;
    console.log('🔍 日期处理 - 开始日期:', startDateTime.toISOString());
  }
  
  if (endDate) {
    // 结束日期设置为当天的23:59:59.999
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    dateWhere.lte = endDateTime;
    console.log('🔍 日期处理 - 结束日期:', endDateTime.toISOString());
  }
  
  return Object.keys(dateWhere).length > 0 ? dateWhere : null;
}

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const Database = require('./database');
// 注意：InviteService是TypeScript模块，需要使用编译后的版本
const InviteService = require('./dist/services/InviteService').InviteService;
const InviteConfigService = require('./src/services/InviteConfigService').InviteConfigService;

// 导入 Prisma 枚举 - 安全导入方式
let TransactionType;
try {
  const prismaModule = require('@prisma/client');
  console.log('🔍 Prisma 模块导入成功，可用属性:', Object.keys(prismaModule));
  TransactionType = prismaModule.point_transactions_transaction_type;
  console.log('🔍 TransactionType 枚举导入结果:', TransactionType);
} catch (error) {
  console.error('❌ TransactionType 枚举导入失败:', error);
}

// 确保 TransactionType 总是有值
if (!TransactionType) {
  console.log('⚠️ 使用回退的枚举定义');
  TransactionType = {
    consume: 'consume',
    recharge: 'recharge', 
    refund: 'refund',
    reward: 'reward'
  };
}

console.log('🔍 最终使用的 TransactionType:', TransactionType);

// 创建数据库实例
const db = new Database();

// 添加支付套餐列表方法 - 从数据库读取
db.getPaymentPackages = async function() {
  try {
    const packages = await this.prisma.paymentPackage.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { isRecommended: 'desc' }, // 推荐套餐排在前面
        { sortOrder: 'asc' },      // 按排序权重排序
        { id: 'asc' }              // 最后按ID排序
      ]
    });

    return packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      points: pkg.points,
      bonusPoints: pkg.bonusPoints,
      amount: parseFloat(pkg.amount),
      status: "active", // 兼容旧格式
      isRecommended: pkg.isRecommended,
      sortOrder: pkg.sortOrder,
      label: pkg.label,
      labelColor: pkg.labelColor,
      totalPoints: pkg.points + pkg.bonusPoints
    }));
  } catch (error) {
    console.error('从数据库获取套餐失败:', error);
    // 返回空数组而不是硬编码数据
    return [];
  }
};

const app = express();
const PORT = process.env.PORT || 3001;

// AI模型数据
const aiModels = [
  { id: 1, name: 'claude-sonnet-4-20250514', displayName: 'claude-4-sonnet', provider: 'anthropic', category: 'standard' },
  { id: 2, name: 'gemini-2.5-pro-nothinking', displayName: 'gemini-pro-2.5', provider: 'google', category: 'standard' },
  { id: 3, name: 'gemini-2.5-flash-nothinking', displayName: 'gemini-flash-2.5', provider: 'google', category: 'standard' },
  { id: 4, name: 'gpt-4o', displayName: 'gpt-4o', provider: 'openai', category: 'standard' },
  { id: 6, name: 'o4-mini-high-all', displayName: 'o4-mini-high', provider: 'openai', category: 'premium' },
  { id: 7, name: 'o4-mini-all', displayName: 'o4-mini', provider: 'openai', category: 'standard' },
];

// 🆕 增强认证相关配置
let transporter = null;
let redisClient = null;
let sessionStore = new Map(); // 内存存储作为fallback

// 加载配置文件
function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'config', 'database-config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.log('⚠️ 配置文件加载失败，使用默认配置');
    return null;
  }
}

// 初始化Redis连接
async function initRedis() {
  console.log('🔄 开始初始化Redis连接...');
  const config = loadConfig();

  if (!config) {
    console.log('⚠️ 配置文件加载失败，使用内存存储');
    return;
  }

  if (!config.redis) {
    console.log('⚠️ Redis配置不存在，使用内存存储');
    return;
  }

  console.log('📋 Redis配置:', {
    host: config.redis.host,
    port: config.redis.port,
    database: config.redis.database
  });

  try {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.database || 0,
      keyPrefix: config.redis.keyPrefix || 'interview_coder:',
      retryDelayOnFailover: config.redis.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.redis.maxRetriesPerRequest || 3,
      lazyConnect: config.redis.lazyConnect || true,
      keepAlive: config.redis.keepAlive || 30000
    });

    // 测试连接
    await redisClient.ping();
    console.log('✅ Redis连接成功');

    // 替换内存存储
    sessionStore = {
      get: async (key) => {
        try {
          const data = await redisClient.get(key);
          return data ? JSON.parse(data) : null;
        } catch (error) {
          console.error('Redis get error:', error);
          return null;
        }
      },
      set: async (key, value, ttl = 3600) => {
        try {
          await redisClient.setex(key, ttl, JSON.stringify(value));
          return true;
        } catch (error) {
          console.error('Redis set error:', error);
          return false;
        }
      },
      delete: async (key) => {
        try {
          await redisClient.del(key);
          return true;
        } catch (error) {
          console.error('Redis delete error:', error);
          return false;
        }
      }
    };

  } catch (error) {
    console.error('❌ Redis连接失败:', error.message);
    console.log('⚠️ 使用内存存储作为fallback');
  }
}

// 统一的会话存储助手函数
const SessionStore = {
  async get(key) {
    if (typeof sessionStore.get === 'function' && sessionStore.get.constructor.name === 'AsyncFunction') {
      return await sessionStore.get(key);
    } else {
      return sessionStore.get(key);
    }
  },

  async set(key, value, ttl = 3600) {
    if (typeof sessionStore.set === 'function' && sessionStore.set.constructor.name === 'AsyncFunction') {
      return await sessionStore.set(key, value, ttl);
    } else {
      return sessionStore.set(key, value);
    }
  },

  async delete(key) {
    if (typeof sessionStore.delete === 'function' && sessionStore.delete.constructor.name === 'AsyncFunction') {
      return await sessionStore.delete(key);
    } else {
      return sessionStore.delete(key);
    }
  }
};

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
  // 总是生成随机6位数字验证码
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
            您好！您正在注册 QuizCoze 账户，请使用以下验证码完成注册：
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

// 初始化服务
async function initializeServices() {
  initEmailService();
  await initRedis();
}

initializeServices();

// 中间件
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:54321',
    'http://quiz.playoffer.cn',
    'http://159.75.174.234:3000'
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Session-Id']
}));
app.use(express.json());

// 静态文件服务
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
const authenticateSession = async (req, res, next) => {
  try {
    console.log(`🔐 认证中间件检查 ${req.method} ${req.path}`);

    // 支持从Cookie或请求头获取sessionId
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
    console.log('📋 请求中的sessionId:', sessionId ? sessionId.substring(0, 10) + '...' : '无');

    if (!sessionId) {
      console.log('❌ 未找到sessionId');
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }

    const sessionData = await SessionStore.get(`session:${sessionId}`);
    console.log('🗄️ 从存储中获取会话数据:', sessionData ? '存在' : '不存在');

    if (!sessionData) {
      console.log('❌ 会话数据不存在或已过期');
      return res.status(401).json({
        success: false,
        message: '会话已过期'
      });
    }

    // 更新最后活动时间
    sessionData.lastActivity = new Date().toISOString();
    await SessionStore.set(`session:${sessionId}`, sessionData, 1209600); // 14天TTL (2周)

    // 将用户信息和sessionId添加到请求对象
    req.user = {
      userId: sessionData.userId,
      username: sessionData.username,
      email: sessionData.email
    };
    req.sessionId = sessionId; // 🆕 添加sessionId到请求对象

    console.log(`✅ 认证成功: ${sessionData.username} (${sessionData.email})`);
    next();
  } catch (error) {
    console.error('❌ 认证中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '认证服务异常'
    });
  }
};

// 验证token中间件
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    if (!token) {
      return res.status(401).json({ success: false, message: '未提供认证令牌' });
    }

    // 从会话存储中获取用户会话
    const session = await SessionStore.get(token);
    if (!session) {
      return res.status(401).json({ success: false, message: '无效的会话令牌' });
    }

    req.user = session.user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Token验证异常:', error);
    return res.status(401).json({ success: false, message: '认证失败' });
  }
};

// 可选验证token中间件（不强制需要登录）
const optionalVerifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    if (token) {
      // 从会话存储中获取用户会话
      const session = await SessionStore.get(token);
      if (session) {
        req.user = session.user;
        req.token = token;
      }
    }
    // 无论是否有有效令牌，都继续处理请求
    next();
  } catch (error) {
    console.error('可选Token验证异常:', error);
    // 出现异常时，仍然继续处理请求，但不设置用户信息
    next();
  }
};

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// 🆕 增强认证API（邮箱验证流程）
// ============================================

// 流程图API 1: /mail_verify - 发送邮箱验证码
app.post('/api/mail_verify', async (req, res) => {
  try {
    const { email, username } = req.body;

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

    // 检查邮箱是否已注册
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '该邮箱已注册，请直接登录'
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

    // 存储验证token和邮箱、验证码的关系（5分钟有效期）
    const verificationData = {
      email,
      code,
      username: username || email.split('@')[0],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      attempts: 0
    };

    await SessionStore.set(`verify_token:${token}`, verificationData, 300); // 5分钟TTL
    await SessionStore.set(`verify_email:${email}`, { token, code }, 300);

    // 5分钟后自动清理（Redis TTL会自动处理，这里保留作为fallback）
    setTimeout(async () => {
      await SessionStore.delete(`verify_token:${token}`);
      await SessionStore.delete(`verify_email:${email}`);
    }, 5 * 60 * 1000);

    // 发送邮件
    const mailOptions = createVerificationEmail(code, email);
    await transporter.sendMail(mailOptions);

    console.log(`✅ 验证码已发送到 ${email}: ${code}, token: ${token.substring(0, 10)}...`);

    res.json({
      success: true,
      message: '验证码已发送，请查收邮件',
      token, // 返回token用于后续验证步骤
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

// 流程图API 2: /verify_code - 验证邮箱验证码
app.post('/api/verify_code', async (req, res) => {
  try {
    const { token, verify_code } = req.body;

    if (!token || !verify_code) {
      return res.status(400).json({
        success: false,
        message: '验证令牌和验证码不能为空'
      });
    }

    // 从内存中获取验证数据
    const verificationData = await SessionStore.get(`verify_token:${token}`);

    if (!verificationData) {
      return res.status(400).json({
        success: false,
        message: '验证令牌无效或已过期'
      });
    }

    // 检查验证码是否正确
    if (verificationData.code !== verify_code) {
      // 增加尝试次数
      verificationData.attempts += 1;

      if (verificationData.attempts >= 3) {
        // 达到最大尝试次数，删除验证数据
        await SessionStore.delete(`verify_token:${token}`);
        await SessionStore.delete(`verify_email:${verificationData.email}`);

        return res.status(400).json({
          success: false,
          message: '验证码错误次数过多，请重新发送验证码'
        });
      }

      // 更新尝试次数
      await SessionStore.set(`verify_token:${token}`, verificationData, 300);

      return res.status(400).json({
        success: false,
        message: `验证码错误，还可尝试 ${3 - verificationData.attempts} 次`
      });
    }

    // 检查是否过期
    const now = new Date();
    const expiresAt = new Date(verificationData.expiresAt);
    if (now > expiresAt) {
      await SessionStore.delete(`verify_token:${token}`);
      await SessionStore.delete(`verify_email:${verificationData.email}`);

      return res.status(400).json({
        success: false,
        message: '验证码已过期，请重新发送'
      });
    }

    console.log(`✅ 邮箱验证成功: ${verificationData.email}`);

    res.json({
      success: true,
      message: '邮箱验证成功',
      email: verificationData.email,
      username: verificationData.username
    });

  } catch (error) {
    console.error('验证码验证失败:', error);
    res.status(500).json({
      success: false,
      message: '验证失败，请稍后重试',
      error: error.message
    });
  }
});

// 流程图API 3: /user_register - 用户注册
app.post('/api/user_register', async (req, res) => {
  try {
    const { token, verify_code, email, password, username, inviterId } = req.body;

    if (!token || !verify_code || !email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: '所有字段都不能为空'
      });
    }

    // 验证密码强度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少6位'
      });
    }

    // 验证用户名
    if (username.length < 2) {
      return res.status(400).json({
        success: false,
        message: '用户名长度至少2位'
      });
    }

    // 从内存中获取验证数据
    const verificationData = await SessionStore.get(`verify_token:${token}`);

    if (!verificationData) {
      return res.status(400).json({
        success: false,
        message: '验证令牌无效或已过期'
      });
    }

    // 验证验证码
    if (verificationData.code !== verify_code) {
      return res.status(400).json({
        success: false,
        message: '验证码错误'
      });
    }

    // 验证邮箱一致性
    if (verificationData.email !== email) {
      return res.status(400).json({
        success: false,
        message: '邮箱不一致'
      });
    }

    // 检查邮箱是否已被注册（双重检查）
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '该邮箱已注册'
      });
    }

    // 创建用户
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.createUser({
      username,
      email,
      password: hashedPassword
    });

    console.log(`✅ 用户注册成功: ${username} (${email}), ID: ${newUser.id}`);

    // 🎯 处理邀请关系（如果有邀请人ID）
    if (inviterId) {
      try {
        console.log('🎯 检测到邀请人ID，开始处理邀请关系:', inviterId);
        const inviteService = new InviteService();
        const inviteResult = await inviteService.handleInviteRegistration(inviterId, newUser.id);
        
        if (inviteResult) {
          console.log('✅ 邀请关系处理成功');
        } else {
          console.log('⚠️ 邀请关系处理失败，但不影响注册');
        }
      } catch (inviteError) {
        console.error('❌ 邀请关系处理异常，但不影响注册:', inviteError);
      }
    } else {
      console.log('📝 无邀请人ID，跳过邀请关系处理');
    }

    // 清理内存中的验证数据（失败不影响注册结果）
    try {
      await SessionStore.delete(`verify_token:${token}`);
      await SessionStore.delete(`verify_email:${email}`);
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

// 流程图API 4: /login - 用户登录
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
      role: user.role, // 添加角色信息
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // 设置会话数据（7天有效期）
    await SessionStore.set(`session:${sessionId}`, sessionData, 1209600); // 14天TTL (2周)

    console.log(`✅ 用户登录成功: ${user.username} (${email}), Session: ${sessionId}`);

    res.json({
      success: true,
      message: '登录成功',
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
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

    const sessionData = await SessionStore.get(`session:${sessionId}`);

    if (sessionData) {
      // 删除会话数据
      await SessionStore.delete(`session:${sessionId}`);

      console.log(`✅ 用户登出: ${sessionData.username}, Session: ${sessionId}`);
    }

    // 🔧 修复：删除共享会话文件
    try {
      const sharedSessionPath = path.join(__dirname, '..', 'shared-session.json');
      if (fs.existsSync(sharedSessionPath)) {
        fs.unlinkSync(sharedSessionPath);
        console.log('🗑️ 共享会话文件已删除');
      }
    } catch (error) {
      console.warn('⚠️ 删除共享会话文件失败:', error);
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
    console.log('🔍 检查会话状态，请求头:', req.headers['x-session-id'] ? 'x-session-id存在' : 'x-session-id不存在');
    console.log('🔍 检查会话状态，Cookie:', req.cookies?.session_id ? 'session_id存在' : 'session_id不存在');

    // 🆕 支持从Cookie或请求头获取sessionId
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'];

    if (!sessionId) {
      console.log('❌ 未找到sessionId');
      return res.status(401).json({
        success: false,
        message: '未登录'
      });
    }

    console.log('📋 使用sessionId:', sessionId.substring(0, 10) + '...');

    const sessionData = await SessionStore.get(`session:${sessionId}`);

    if (!sessionData) {
      console.log('❌ 会话数据不存在或已过期');
      return res.status(401).json({
        success: false,
        message: '会话已过期'
      });
    }

    console.log('✅ 找到会话数据:', sessionData.username);

    // 如果session中没有role信息，从数据库获取
    if (!sessionData.role) {
      try {
        const userWithRole = await db.getUserById(sessionData.userId);
        if (userWithRole && userWithRole.role) {
          sessionData.role = userWithRole.role;
          console.log(`🔄 为用户 ${sessionData.username} 更新session中的role: ${userWithRole.role}`);
        }
      } catch (error) {
        console.error('获取用户角色失败:', error);
      }
    }

    // 🆕 生成JWT token用于支付API认证
    const jwtToken = generateToken();

    // 🆕 将token和用户信息存储到会话存储中，供verifyToken中间件使用
    const tokenSessionData = {
      user: {
        id: sessionData.userId,
        username: sessionData.username,
        email: sessionData.email,
        role: sessionData.role
      },
      sessionId: sessionId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时
    };

    await SessionStore.set(jwtToken, tokenSessionData, 86400); // 24小时TTL

    console.log(`🔐 为用户 ${sessionData.username} 生成JWT token: ${jwtToken.substring(0, 10)}...`);

    // 更新最后活动时间
    sessionData.lastActivity = new Date().toISOString();
    await SessionStore.set(`session:${sessionId}`, sessionData, 1209600); // 14天TTL (2周)

    res.json({
      success: true,
      message: '会话有效',
      user: {
        id: sessionData.userId,
        username: sessionData.username,
        email: sessionData.email,
        role: sessionData.role
      },
      token: jwtToken, // 🆕 返回JWT token给前端
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

// 🆕 增强认证共享会话API
app.post('/api/create-shared-session', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    const username = req.user.username;
    const email = req.user.email;
    const sessionId = req.sessionId; // 🆕 获取当前会话ID

    console.log(`🔄 创建增强认证共享会话，用户: ${username}, 会话ID: ${sessionId}`);

    // 🆕 创建共享会话数据，包含sessionId
    const sharedSessionData = {
      sessionId, // 🆕 添加sessionId字段供Electron客户端使用
      userId,
      username,
      email,
      user: { // 🆕 添加完整的用户对象
        id: userId.toString(),
        username,
        email,
        createdAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14天 (2周)
    };

    // 写入共享文件
    const sharedSessionPath = path.join(__dirname, '..', 'shared-session.json');
    fs.writeFileSync(sharedSessionPath, JSON.stringify(sharedSessionData, null, 2));

    console.log(`✅ 增强认证共享会话已创建: ${sharedSessionPath}`);
    console.log(`📋 共享会话数据:`, {
      sessionId: sessionId.substring(0, 10) + '...',
      username,
      email
    });

    res.json({
      success: true,
      message: '共享会话已创建',
      expiresAt: sharedSessionData.expiresAt
    });

  } catch (error) {
    console.error('创建增强认证共享会话失败:', error);
    res.status(500).json({
      success: false,
      message: '创建共享会话失败',
      error: error.message
    });
  }
});

// ============================================
// 配置管理API
// ============================================

// 获取AI模型列表
app.get('/api/config/models', authenticateSession, (req, res) => {
  res.json(aiModels);
});

// 获取编程语言列表
app.get('/api/config/languages', authenticateSession, (req, res) => {
  const languages = [
    'python', 'javascript', 'java', 'cpp', 'c', 'csharp', 
    'go', 'rust', 'typescript', 'kotlin', 'swift', 'php', 
    'ruby', 'scala', 'shell', 'makefile', 'verilog'
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

// ============================================
// 🆕 密码重置API
// ============================================

// 密码重置邮件模板
function createPasswordResetEmail(code, email) {
  return {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'QuizCoze - 密码重置验证码',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">QuizCoze</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">面试代码助手</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #333; margin-top: 0;">密码重置验证码</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            您好！您正在重置 QuizCoze 账户密码，请使用以下验证码完成重置：
          </p>
          
          <div style="background: #fff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px dashed #ff6b6b;">
            <span style="font-size: 32px; font-weight: bold; color: #ff6b6b; letter-spacing: 8px;">${code}</span>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            验证码有效期为 5 分钟，请及时使用
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              这是一封自动发送的邮件，请勿回复<br>
              如果您没有申请密码重置，请忽略此邮件
            </p>
          </div>
        </div>
      </div>
    `
  };
}

// API 1: 发送密码重置验证码
app.post('/api/send_reset_code', async (req, res) => {
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

    // 检查邮箱是否已注册（重置密码必须是已注册用户）
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '该邮箱尚未注册，请先注册账户'
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

    // 存储重置token和邮箱、验证码的关系（5分钟有效期）
    const resetData = {
      email,
      code,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      attempts: 0,
      purpose: 'password_reset'
    };

    await SessionStore.set(`reset_token:${token}`, resetData, 300); // 5分钟TTL
    await SessionStore.set(`reset_email:${email}`, { token, code }, 300);

    // 5分钟后自动清理（Redis TTL会自动处理，这里保留作为fallback）
    setTimeout(async () => {
      await SessionStore.delete(`reset_token:${token}`);
      await SessionStore.delete(`reset_email:${email}`);
    }, 5 * 60 * 1000);

    // 发送邮件
    const mailOptions = createPasswordResetEmail(code, email);
    await transporter.sendMail(mailOptions);

    console.log(`✅ 密码重置验证码已发送到 ${email}: ${code}, token: ${token.substring(0, 10)}...`);

    res.json({
      success: true,
      message: '密码重置验证码已发送，请查收邮件',
      token, // 返回token用于后续重置步骤
      expiresIn: 300 // 5分钟，单位秒
    });

  } catch (error) {
    console.error('发送密码重置验证码失败:', error);
    res.status(500).json({
      success: false,
      message: '发送验证码失败，请稍后重试',
      error: error.message
    });
  }
});

// API 2: 验证密码重置验证码
app.post('/api/verify_reset_code', async (req, res) => {
  try {
    const { token, verify_code } = req.body;

    if (!token || !verify_code) {
      return res.status(400).json({
        success: false,
        message: 'token和验证码不能为空'
      });
    }

    // 验证token获取重置数据
    const resetData = await SessionStore.get(`reset_token:${token}`);
    if (!resetData) {
      return res.status(400).json({
        success: false,
        message: '重置令牌无效或已过期'
      });
    }

    // 检查过期时间
    if (new Date() > new Date(resetData.expiresAt)) {
      await SessionStore.delete(`reset_token:${token}`);
      await SessionStore.delete(`reset_email:${resetData.email}`);
      return res.status(400).json({
        success: false,
        message: '验证码已过期，请重新获取'
      });
    }

    // 验证验证码
    if (resetData.code !== verify_code) {
      resetData.attempts++;
      if (resetData.attempts >= 5) {
        await SessionStore.delete(`reset_token:${token}`);
        await SessionStore.delete(`reset_email:${resetData.email}`);
        return res.status(400).json({
          success: false,
          message: '验证码错误次数过多，请重新获取'
        });
      }

      await SessionStore.set(`reset_token:${token}`, resetData, 300);
      return res.status(400).json({
        success: false,
        message: `验证码错误，还剩 ${5 - resetData.attempts} 次机会`
      });
    }

    // 生成用于密码重置的特殊token
    const resetPasswordToken = generateToken();
    const resetPasswordData = {
      email: resetData.email,
      userId: resetData.userId,
      verified: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10分钟有效期
      purpose: 'password_reset_verified'
    };

    await SessionStore.set(`reset_password:${resetPasswordToken}`, resetPasswordData, 600); // 10分钟TTL

    // 清理验证码数据
    await SessionStore.delete(`reset_token:${token}`);
    await SessionStore.delete(`reset_email:${resetData.email}`);

    console.log(`✅ 密码重置验证码验证成功: ${resetData.email}`);

    res.json({
      success: true,
      message: '验证码验证成功，可以重置密码',
      resetToken: resetPasswordToken
    });

  } catch (error) {
    console.error('验证密码重置验证码失败:', error);
    res.status(500).json({
      success: false,
      message: '验证码验证失败，请稍后重试'
    });
  }
});

// API 3: 重置密码
app.post('/api/reset_password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: '重置令牌和新密码不能为空'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少6位'
      });
    }

    // 验证重置token
    const resetPasswordData = await SessionStore.get(`reset_password:${token}`);
    if (!resetPasswordData) {
      return res.status(400).json({
        success: false,
        message: '重置令牌无效或已过期'
      });
    }

    // 检查过期时间
    if (new Date() > new Date(resetPasswordData.expiresAt)) {
      await SessionStore.delete(`reset_password:${token}`);
      return res.status(400).json({
        success: false,
        message: '重置令牌已过期，请重新开始密码重置流程'
      });
    }

    // 检查是否已验证
    if (!resetPasswordData.verified) {
      return res.status(400).json({
        success: false,
        message: '请先完成验证码验证'
      });
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 更新用户密码
    await db.updateUserPassword(resetPasswordData.userId, hashedPassword);

    // 清理重置数据
    await SessionStore.delete(`reset_password:${token}`);

    console.log(`✅ 密码重置成功: ${resetPasswordData.email}, 用户ID: ${resetPasswordData.userId}`);

    res.json({
      success: true,
      message: '密码重置成功，请使用新密码登录'
    });

  } catch (error) {
    console.error('密码重置失败:', error);
    res.status(500).json({
      success: false,
      message: '密码重置失败，请稍后重试',
      error: error.message
    });
  }
});

// ======================
// 管理员API路由 - 积分配置管理
// ======================

// 管理员认证中间件
const adminAuthMiddleware = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'];

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: '未提供会话ID'
      });
    }

    const sessionData = await SessionStore.get(`session:${sessionId}`);

    if (!sessionData) {
      return res.status(401).json({
        success: false,
        message: '会话无效或已过期'
      });
    }

    // 查询用户角色来检查是否为管理员
    try {
      const user = await db.getUserById(sessionData.userId);

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: '权限不足，需要管理员权限'
        });
      }

      console.log(`✅ 管理员权限验证成功: ${user.username} (角色: ${user.role})`);
      req.user = { ...sessionData, role: user.role };
      next();
    } catch (dbError) {
      console.error('查询用户角色失败:', dbError);
      return res.status(500).json({
        success: false,
        message: '权限验证失败'
      });
    }
  } catch (error) {
    console.error('管理员认证失败:', error);
    res.status(500).json({
      success: false,
      message: '认证过程中出现错误'
    });
  }
};

// 🔥 积分配置现在存储在数据库中，不再使用内存数据

// 获取所有模型配置
app.get('/api/admin/model-configs', adminAuthMiddleware, async (req, res) => {
  try {
    const configs = await db.getAllModelPointConfigs();

    // 转换数据格式以匹配前端期望的格式
    const formattedConfigs = configs.map(config => ({
      id: config.id,
      modelName: config.modelName,
      questionType: config.questionType.toLowerCase(), // 转换为小写
      cost: config.cost,
      isActive: config.isActive,
      description: config.description,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString()
    }));

    res.json({
      success: true,
      data: {
        configs: formattedConfigs,
        total: formattedConfigs.length
      },
      message: '获取配置列表成功'
    });
  } catch (error) {
    console.error('获取模型配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
});

// 创建或更新模型配置
app.put('/api/admin/model-configs', adminAuthMiddleware, async (req, res) => {
  try {
    const { modelName, questionType, cost, description, isActive = true } = req.body;

    // 验证输入
    if (!modelName || !questionType || !cost) {
      return res.status(400).json({
        success: false,
        message: '模型名称、题目类型和积分消耗不能为空'
      });
    }

    if (!['multiple_choice', 'programming'].includes(questionType)) {
      return res.status(400).json({
        success: false,
        message: '题目类型必须是 multiple_choice 或 programming'
      });
    }

    if (cost <= 0) {
      return res.status(400).json({
        success: false,
        message: '积分消耗必须大于0'
      });
    }

    // 转换题目类型为数据库枚举格式
    const dbQuestionType = questionType.toUpperCase();

    // 使用数据库upsert操作
    const savedConfig = await db.upsertModelPointConfig({
      modelName,
      questionType: dbQuestionType,
      cost: parseInt(cost),
      description,
      isActive
    });

    // 转换返回格式
    const formattedConfig = {
      id: savedConfig.id,
      modelName: savedConfig.modelName,
      questionType: savedConfig.questionType.toLowerCase(),
      cost: savedConfig.cost,
      isActive: savedConfig.isActive,
      description: savedConfig.description,
      createdAt: savedConfig.createdAt.toISOString(),
      updatedAt: savedConfig.updatedAt.toISOString()
    };

    res.json({
      success: true,
      data: {
        config: formattedConfig
      },
      message: '配置保存成功'
    });
  } catch (error) {
    console.error('保存模型配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存配置失败'
    });
  }
});

// 删除模型配置
app.delete('/api/admin/model-configs', adminAuthMiddleware, async (req, res) => {
  try {
    const { modelName, questionType } = req.body;

    if (!modelName || !questionType) {
      return res.status(400).json({
        success: false,
        message: '模型名称和题目类型不能为空'
      });
    }

    // 转换题目类型为数据库枚举格式
    const dbQuestionType = questionType.toUpperCase();

    // 从数据库删除配置
    const deletedConfig = await db.deleteModelPointConfig(modelName, dbQuestionType);

    // 转换返回格式
    const formattedConfig = {
      id: deletedConfig.id,
      modelName: deletedConfig.modelName,
      questionType: deletedConfig.questionType.toLowerCase(),
      cost: deletedConfig.cost,
      isActive: deletedConfig.isActive,
      description: deletedConfig.description,
      createdAt: deletedConfig.createdAt.toISOString(),
      updatedAt: deletedConfig.updatedAt.toISOString()
    };

    res.json({
      success: true,
      data: {
        config: formattedConfig
      },
      message: '配置删除成功'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    console.error('删除模型配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除配置失败'
    });
  }
});

// 批量更新模型配置
app.post('/api/admin/model-configs/batch', adminAuthMiddleware, async (req, res) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        success: false,
        message: '配置列表不能为空'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      try {
        const { modelName, questionType, cost, description, isActive = true } = config;

        // 验证每个配置
        if (!modelName || !questionType || !cost) {
          errors.push(`配置 ${i + 1}: 模型名称、题目类型和积分消耗不能为空`);
          continue;
        }

        if (!['multiple_choice', 'programming'].includes(questionType)) {
          errors.push(`配置 ${i + 1}: 题目类型必须是 multiple_choice 或 programming`);
          continue;
        }

        if (cost <= 0) {
          errors.push(`配置 ${i + 1}: 积分消耗必须大于0`);
          continue;
        }

        // 转换题目类型为数据库枚举格式
        const dbQuestionType = questionType.toUpperCase();

        // 使用数据库upsert操作
        const savedConfig = await db.upsertModelPointConfig({
          modelName,
          questionType: dbQuestionType,
          cost: parseInt(cost),
          description,
          isActive
        });

        // 转换返回格式
        const formattedConfig = {
          id: savedConfig.id,
          modelName: savedConfig.modelName,
          questionType: savedConfig.questionType.toLowerCase(),
          cost: savedConfig.cost,
          isActive: savedConfig.isActive,
          description: savedConfig.description,
          createdAt: savedConfig.createdAt.toISOString(),
          updatedAt: savedConfig.updatedAt.toISOString()
        };

        results.push({
          action: 'upserted',
          config: formattedConfig
        });
      } catch (error) {
        errors.push(`配置 ${i + 1}: ${error.message}`);
      }
    }

    res.json({
      success: errors.length === 0,
      data: {
        results,
        processed: results.length,
        errors: errors.length,
        errorDetails: errors
      },
      message: `批量操作完成，成功处理 ${results.length} 个配置${errors.length > 0 ? `，${errors.length} 个错误` : ''}`
    });
  } catch (error) {
    console.error('批量更新模型配置失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新失败'
    });
  }
});

// 🆕 客户端积分API - 用于Electron客户端的积分管理
// 获取用户积分余额
app.get('/api/client/credits', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.userId
    console.log('🔍 获取积分余额 - 用户ID:', userId)
    console.log('📊 查询参数:', req.query)

    // 检查是否请求LLM配置
    if (req.query['llm-config'] === 'true') {
      console.log('📡 收到LLM配置请求（通过积分API）')
      
      try {
        // 检查表是否存在
        const tableExists = await db.prisma.$queryRaw`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_schema = DATABASE() AND table_name = 'llm_config'
        `
        console.log('📋 llm_config表检查结果:', tableExists)
        
        if (!tableExists[0] || tableExists[0].count === 0) {
          console.warn('⚠️ llm_config表不存在，返回默认配置')
          const defaultConfig = {
            baseUrl: 'https://ismaque.org/v1',
            apiKey: 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP',
            maxRetries: 2,
            timeout: 30000,
            provider: 'ismaque'
          }
          
          return res.json({
            success: true,
            data: {
              config: defaultConfig,
              source: 'default'
            },
            message: 'LLM配置获取成功（使用默认配置）'
          })
        }

        // 从数据库读取LLM配置
        const configs = await db.prisma.$queryRaw`
          SELECT config_key, config_value FROM llm_config WHERE is_active = 1
        `
        console.log('📦 数据库配置查询结果:', configs)
        
        if (!configs || configs.length === 0) {
          console.warn('⚠️ 数据库中未找到配置，返回默认配置')
          const defaultConfig = {
            baseUrl: 'https://ismaque.org/v1',
            apiKey: 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP',
            maxRetries: 2,
            timeout: 30000,
            provider: 'ismaque'
          }
          
          return res.json({
            success: true,
            data: {
              config: defaultConfig,
              source: 'default'
            },
            message: 'LLM配置获取成功（使用默认配置）'
          })
        }

        // 将配置转换为对象格式
        const configObj = {}
        configs.forEach(config => {
          configObj[config.config_key] = config.config_value
        })

        // 构建返回的配置对象
        const llmConfig = {
          baseUrl: configObj.base_url || 'https://ismaque.org/v1',
          apiKey: configObj.api_key || 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP',
          maxRetries: parseInt(configObj.max_retries || '2'),
          timeout: parseInt(configObj.timeout || '30000'),
          provider: configObj.provider || 'ismaque'
        }

        console.log('✅ 返回LLM配置:', { 
          provider: llmConfig.provider, 
          baseUrl: llmConfig.baseUrl,
          hasApiKey: !!llmConfig.apiKey
        })

        return res.json({
          success: true,
          data: {
            config: llmConfig,
            source: 'database'
          },
          message: 'LLM配置获取成功'
        })
      } catch (llmError) {
        console.error('❌ 获取LLM配置失败:', llmError)
        
        // 发生异常时返回默认配置
        const defaultConfig = {
          baseUrl: 'https://ismaque.org/v1',
          apiKey: 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP',
          maxRetries: 2,
          timeout: 30000,
          provider: 'ismaque'
        }
        
        return res.json({
          success: true,
          data: {
            config: defaultConfig,
            source: 'fallback'
          },
          message: 'LLM配置获取成功（降级配置）',
          error: llmError.message
        })
      }
    }

    // 正常的积分查询
    const user = await db.getUserById(userId)
    console.log('👤 用户数据:', user ? { id: user.id, username: user.username, points: user.points } : 'null')

    if (!user) {
      console.log('❌ 用户不存在')
      return res.status(404).json({ error: '用户不存在' })
    }

    const response = {
      success: true,
      data: {
        credits: user.points || 0
      },
      message: '获取积分余额成功'
    }

    console.log('📤 API响应:', response)
    res.json(response)
  } catch (error) {
    console.error('获取积分余额失败:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

// 检查积分是否足够（预检查）
app.post('/api/client/credits/check', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.userId
    const { modelName, questionType } = req.body

    if (!modelName || !questionType) {
      return res.status(400).json({ error: '缺少必需参数' })
    }

    // 获取用户当前积分
    const user = await db.getUserById(userId)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 获取积分配置
    const dbQuestionType = questionType.toUpperCase()
    const config = await db.getModelPointConfig(modelName, dbQuestionType)
    if (!config) {
      return res.status(404).json({ error: '未找到积分配置' })
    }

    const currentCredits = user.points || 0
    const requiredCredits = config.cost
    const sufficient = currentCredits >= requiredCredits

    res.json({
      sufficient,
      currentCredits,
      requiredCredits,
      modelName,
      questionType,
      configId: config.id
    })
  } catch (error) {
    console.error('积分检查失败:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

// 扣除积分（实际扣除）
app.post('/api/client/credits/deduct', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.userId
    const { modelName, questionType, operationId } = req.body

    if (!modelName || !questionType) {
      return res.status(400).json({ error: '缺少必需参数' })
    }

    // 获取用户当前积分
    const user = await db.getUserById(userId)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 获取积分配置
    const dbQuestionType = questionType.toUpperCase()
    const config = await db.getModelPointConfig(modelName, dbQuestionType)
    if (!config) {
      return res.status(404).json({ error: '未找到积分配置' })
    }

    const currentCredits = user.points || 0
    const requiredCredits = config.cost

    // 检查积分是否足够
    if (currentCredits < requiredCredits) {
      return res.status(400).json({
        error: '积分不足',
        currentCredits,
        requiredCredits
      })
    }

    // 扣除积分
    const newCredits = currentCredits - requiredCredits
    await db.updateUserCredits(userId, newCredits)

    // 创建积分交易记录到数据库
    console.log('💰 创建积分交易记录到数据库...')
    let transactionId = null;
    try {
      const transaction = await db.prisma.pointTransaction.create({
        data: {
          userId: userId,
          transactionType: 'CONSUME',
          amount: -requiredCredits,
          balanceAfter: newCredits,
          modelName: modelName,
          questionType: questionType.toUpperCase(),
          description: `搜题操作 [${operationId || `ai_call_${Date.now()}`}]: 使用${modelName}模型处理${questionType === 'multiple_choice' ? '选择题' : '编程题'}`,
        }
      });
      
      // 确保transactionId一定被设置
      if (transaction && transaction.id) {
        transactionId = transaction.id;
        console.log('✅ 积分交易记录创建成功 - 事务ID:', transaction.id, '已设置transactionId:', transactionId);
      } else {
        console.error('❌ 创建的交易对象异常:', transaction);
      }
    } catch (dbError) {
      console.error('❌ 创建积分交易记录失败:', dbError)
      // 注意：这里不抛出错误，避免影响积分扣除的主流程
    }

    // 记录积分交易（如果有相关表的话）
    const transactionData = {
      userId,
      type: 'deduct',
      amount: requiredCredits,
      modelName,
      questionType,
      operationId: operationId || `ai_call_${Date.now()}`,
      createdAt: new Date()
    }

    console.log('✅ 积分扣除成功:', transactionData)
    
    // 关键检查：确保transactionId正确设置
    console.log('🔍 最终检查transactionId值:', transactionId, '类型:', typeof transactionId);
    if (!transactionId) {
      console.error('❌ 警告：transactionId为空，这会导致end_time无法更新！');
    }

    const response = {
      success: true,
      previousCredits: currentCredits,
      newCredits,
      deductedAmount: requiredCredits,
      operationId: transactionData.operationId,
      transactionId: transactionId  // 添加事务ID - 这是关键字段！
    }
    
    console.log('📤 发送完整响应（重点检查transactionId）:', JSON.stringify(response, null, 2))
    res.json(response)
  } catch (error) {
    console.error('积分扣除失败:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

// 更新积分交易的操作结束时间
app.put('/api/client/credits/complete', authenticateSession, async (req, res) => {
  try {
    console.log('🎯 收到完成API请求')
    console.log('📋 请求体:', req.body)
    console.log('👤 用户信息:', req.user)
    
    const userId = req.user.userId
    const { transactionId } = req.body

    if (!transactionId) {
      console.log('❌ 缺少交易ID')
      return res.status(400).json({ error: '缺少交易ID' })
    }

    console.log('🔄 更新操作结束时间，用户ID:', userId, '交易ID:', transactionId)

    // 验证交易是否属于当前用户
    const transaction = await db.prisma.pointTransaction.findUnique({
      where: { id: transactionId },
      select: {
        userId: true,
        transactionType: true
      }
    })
    
    if (!transaction) {
      console.log('❌ 交易记录不存在:', transactionId)
      return res.status(404).json({ error: '交易记录不存在' })
    }
    
    if (transaction.userId !== userId) {
      console.log('❌ 用户权限验证失败:', { transactionUserId: transaction.userId, currentUserId: userId })
      return res.status(403).json({ error: '无权操作此交易' })
    }
    
    if (transaction.transactionType !== 'CONSUME') {
      console.log('❌ 交易类型验证失败:', transaction.transactionType)
      return res.status(400).json({ error: '只有消费类型的交易才能更新结束时间' })
    }

    // 更新结束时间 - 使用原生SQL
    await db.prisma.$executeRaw`
      UPDATE point_transactions SET end_time = NOW() WHERE id = ${transactionId}
    `

    console.log('✅ 操作结束时间更新成功，交易ID:', transactionId)

    res.json({
      success: true,
      transactionId,
      endTime: new Date().toISOString(),
      message: '操作结束时间更新成功'
    })
  } catch (error) {
    console.error('❌ 更新操作结束时间失败:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

// 退还积分（失败时退款）
app.post('/api/client/credits/refund', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.userId
    const { operationId, amount, reason } = req.body

    if (!operationId || !amount) {
      return res.status(400).json({ error: '缺少必需参数' })
    }

    // 获取用户当前积分
    const user = await db.getUserById(userId)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 退还积分
    const currentCredits = user.points || 0
    const newCredits = currentCredits + amount
    await db.updateUserCredits(userId, newCredits)

    // 🆕 记录退款交易到数据库
    try {
      const description = `积分退款 [${operationId}]: ${reason || 'AI调用失败'}`
      await db.recordPointTransaction({
        userId,
        transactionType: 'REFUND',
        amount: parseInt(amount),
        balanceAfter: newCredits,
        description
      })
      console.log('✅ 退款交易记录已保存到数据库')
    } catch (recordError) {
      console.error('❌ 记录退款交易失败:', recordError)
      // 不中断主流程，只记录错误
    }

    console.log('✅ 积分退还成功:', {
      userId,
      amount,
      newBalance: newCredits,
      operationId
    })

    res.json({
      success: true,
      previousCredits: currentCredits,
      newCredits,
      refundedAmount: amount,
      operationId
    })
  } catch (error) {
    console.error('积分退还失败:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

// 检查并扣除积分（合并操作，减少网络请求）
app.post('/api/client/credits/check-and-deduct', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.userId
    const { modelName, questionType, operationId } = req.body

    if (!modelName || !questionType || !operationId) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: modelName, questionType, operationId'
      })
    }

    console.time('credits-check-and-deduct')

    // 获取用户当前积分
    const user = await db.getUserById(userId)
    if (!user) {
      console.timeEnd('credits-check-and-deduct')
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    // 获取积分配置
    const dbQuestionType = questionType.toUpperCase()
    const config = await db.getModelPointConfig(modelName, dbQuestionType)
    if (!config) {
      console.timeEnd('credits-check-and-deduct')
      return res.status(404).json({
        success: false,
        error: `未找到模型 ${modelName} 的 ${questionType} 类型配置`
      })
    }

    const currentCredits = user.points || 0
    const requiredCredits = config.cost
    const sufficient = currentCredits >= requiredCredits

    // 检查积分是否充足
    if (!sufficient) {
      console.timeEnd('credits-check-and-deduct')
      return res.status(400).json({
        success: false,
        sufficient: false,
        currentPoints: currentCredits,
        requiredPoints: requiredCredits,
        message: `积分不足。本次操作需要 ${requiredCredits} 积分，您当前拥有 ${currentCredits} 积分。`
      })
    }

    // 扣除积分
    const newCredits = currentCredits - requiredCredits
    await db.updateUserCredits(userId, newCredits)

    // 🆕 记录积分交易到数据库
    let transactionId = null;
    try {
      const description = `搜题操作 [${operationId}]: 使用${modelName}模型处理${questionType === 'multiple_choice' ? '选择题' : '编程题'}`
      const transaction = await db.recordPointTransaction({
        userId,
        transactionType: 'CONSUME',
        amount: -requiredCredits,
        balanceAfter: newCredits,
        modelName,
        questionType: questionType.toUpperCase(),
        description
      })
      console.log('🔍 数据库返回的transaction对象:', transaction);
      console.log('🔍 transaction.id值:', transaction.id, '类型:', typeof transaction.id);
      transactionId = transaction.id;
      console.log('🔍 赋值后的transactionId:', transactionId, '类型:', typeof transactionId);
      console.log('✅ 积分交易记录已保存到数据库，交易ID:', transactionId)
    } catch (recordError) {
      console.error('❌ 记录积分交易失败:', recordError)
      // 不中断主流程，只记录错误
    }

    console.log('✅ 积分检查和扣除成功:', {
      userId,
      amount: -requiredCredits,
      newBalance: newCredits,
      operationId
    })
    console.timeEnd('credits-check-and-deduct')

    console.log('🔍 检查transactionId值:', transactionId, '类型:', typeof transactionId);
    
    const response = {
      success: true,
      sufficient: true,
      currentPoints: currentCredits,
      newBalance: newCredits,
      deductedAmount: requiredCredits,
      operationId,
      transactionId: transactionId,
      message: `成功扣除 ${requiredCredits} 积分，余额: ${newCredits}`
    };
    
    console.log('🔧 添加transactionId到响应:', transactionId);
    console.log('📤 发送完整响应:', JSON.stringify(response, null, 2));
    
    res.json(response)
  } catch (error) {
    console.error('检查并扣除积分失败:', error)
    console.timeEnd('credits-check-and-deduct')
    res.status(500).json({
      success: false,
      error: '服务器错误'
    })
  }
})

// 🆕 获取用户积分交易记录
app.get('/api/client/credits/transactions', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.userId
    const limit = Math.min(parseInt(req.query.limit) || 50, 100) // 最多100条
    const offset = parseInt(req.query.offset) || 0

    const result = await db.getUserPointTransactions(userId, limit, offset)

    // 格式化交易记录，便于前端显示
    const formattedTransactions = result.transactions.map(transaction => ({
      id: transaction.id,
      type: transaction.transactionType,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
      modelName: transaction.modelName,
      questionType: transaction.questionType,
      description: transaction.description,
      createdAt: transaction.createdAt,
      // 添加格式化的显示文本
      displayText: formatTransactionDisplay(transaction)
    }))

    // 计算分页信息
    const totalPages = Math.ceil(result.total / limit)
    const currentPage = Math.floor(offset / limit) + 1

    res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          limit,
          offset,
          currentPage,
          totalPages: Math.min(totalPages, 100), // 最多100页
          total: result.total,
          hasMore: result.hasMore
        }
      },
      message: '获取交易记录成功'
    })
  } catch (error) {
    console.error('获取积分交易记录失败:', error)
    res.status(500).json({
      success: false,
      error: '获取交易记录失败'
    })
  }
})

// 🆕 获取用户积分交易统计
app.get('/api/client/credits/stats', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.userId
    const stats = await db.getPointTransactionStats(userId)

    // 格式化统计数据
    const formattedStats = {
      totalConsumed: 0,
      totalRecharged: 0,
      totalRefunded: 0,
      consumeCount: 0,
      rechargeCount: 0,
      refundCount: 0
    }

    stats.forEach(stat => {
      switch (stat.transactionType) {
        case 'CONSUME':
          formattedStats.totalConsumed = Math.abs(stat._sum.amount || 0)
          formattedStats.consumeCount = stat._count.id
          break
        case 'RECHARGE':
          formattedStats.totalRecharged = stat._sum.amount || 0
          formattedStats.rechargeCount = stat._count.id
          break
        case 'REFUND':
          formattedStats.totalRefunded = stat._sum.amount || 0
          formattedStats.refundCount = stat._count.id
          break
      }
    })

    res.json({
      success: true,
      data: formattedStats,
      message: '获取积分统计成功'
    })
  } catch (error) {
    console.error('获取积分统计失败:', error)
    res.status(500).json({
      success: false,
      error: '获取积分统计失败'
    })
  }
})

// 🆕 格式化交易记录显示文本的辅助函数
function formatTransactionDisplay(transaction) {
  const time = new Date(transaction.createdAt).toLocaleString('zh-CN')
  const amount = transaction.amount
  const absAmount = Math.abs(amount)

  switch (transaction.transactionType) {
    case 'CONSUME':
      const questionTypeText = transaction.questionType === 'MULTIPLE_CHOICE' ? '选择题' : '编程题'
      return `${time}，${questionTypeText}使用${transaction.modelName}模型，-${absAmount}积分`
    case 'RECHARGE':
      return `${time}，充值，+${amount}积分`
    case 'REFUND':
      return `${time}，退款，+${amount}积分`
    case 'REWARD':
      return `${time}，奖励，+${amount}积分`
    default:
      return `${time}，${transaction.description || '积分变动'}，${amount > 0 ? '+' : ''}${amount}积分`
  }
}

// 🆕 充值积分API (用于管理员或测试)
app.post('/api/client/credits/recharge', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.userId
    const { amount, description } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: '充值金额必须大于0'
      })
    }

    // 获取用户当前积分
    const user = await db.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    const currentCredits = user.points || 0
    const newCredits = currentCredits + parseInt(amount)

    // 更新用户积分
    await db.updateUserCredits(userId, newCredits)

    // 🆕 记录充值交易到数据库
    try {
      const rechargeDescription = description || `手动充值 +${amount}积分`
      await db.recordPointTransaction({
        userId,
        transactionType: 'RECHARGE',
        amount: parseInt(amount),
        balanceAfter: newCredits,
        description: rechargeDescription
      })
      console.log('✅ 充值交易记录已保存到数据库')
    } catch (recordError) {
      console.error('❌ 记录充值交易失败:', recordError)
      // 不中断主流程，只记录错误
    }

    console.log('✅ 积分充值成功:', {
      userId,
      amount: parseInt(amount),
      newBalance: newCredits
    })

    res.json({
      success: true,
      previousCredits: currentCredits,
      newCredits,
      rechargedAmount: parseInt(amount),
      message: `成功充值 ${amount} 积分，余额: ${newCredits}`
    })
  } catch (error) {
    console.error('充值积分失败:', error)
    res.status(500).json({
      success: false,
      error: '充值积分失败'
    })
  }
})

// 支付套餐API
app.get('/api/payment/packages', optionalVerifyToken, async (req, res) => {
  try {
    console.log('🔍 前端请求 /api/payment/packages');
    // 获取支付套餐列表
    const packages = await db.getPaymentPackages();

    console.log('📦 返回套餐数据:', packages);

    res.json({
      success: true,
      data: packages,
      message: '获取套餐列表成功'
    });
  } catch (error) {
    console.error('获取支付套餐列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支付套餐列表失败: ' + error.message
    });
  }
});

// 创建支付订单API
app.post('/api/payment/orders', verifyToken, (req, res) => {
  try {
    const { packageId, paymentMethod = 'WECHAT_PAY' } = req.body;

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: packageId'
      });
    }

    // 查找套餐
    const packages = db.getPaymentPackages();
    const packageData = packages.find(pkg => pkg.id === packageId);

    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的套餐'
      });
    }

    // 生成订单编号
    const orderNo = 'PAY' + Date.now() + Math.floor(Math.random() * 1000);
    const outTradeNo = 'OUT' + Date.now() + Math.floor(Math.random() * 1000);

    // 生成支付二维码URL (模拟)
    const codeUrl = `https://example.com/pay/${orderNo}`;

    // 返回订单信息
    res.json({
      success: true,
      data: {
        orderNo,
        paymentData: {
          codeUrl,
          outTradeNo,
          amount: packageData.amount
        },
        expireTime: new Date(Date.now() + 30 * 60 * 1000) // 30分钟后过期
      },
      message: '创建订单成功'
    });

  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建订单失败: ' + error.message
    });
  }
});

// 查询订单状态API
app.get('/api/payment/orders/:orderNo', verifyToken, (req, res) => {
  try {
    const { orderNo } = req.params;

    if (!orderNo) {
      return res.status(400).json({
        success: false,
        message: '缺少订单编号'
      });
    }

    // 模拟订单数据
    const order = {
      id: 1,
      orderNo,
      outTradeNo: 'OUT' + orderNo.substring(3),
      userId: req.user.id,
      packageId: 1,
      amount: 10.00,
      points: 100,
      bonusPoints: 0,
      paymentMethod: 'WECHAT_PAY',
      paymentStatus: 'PENDING',
      expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.json({
      success: true,
      data: {
        order,
        tradeState: 'NOTPAY',
        tradeStateDesc: '未支付'
      },
      message: '查询订单状态成功'
    });

  } catch (error) {
    console.error('查询订单状态失败:', error);
    res.status(500).json({
      success: false,
      message: '查询订单状态失败: ' + error.message
    });
  }
});

// 获取用户订单列表API
app.get('/api/payment/orders', verifyToken, (req, res) => {
  try {
    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 模拟订单列表
    const orders = [
      {
        id: 1,
        orderNo: 'PAY1656789012345',
        outTradeNo: 'OUT1656789012345',
        userId: req.user.id,
        packageId: 2,
        amount: 45.00,
        points: 500,
        bonusPoints: 50,
        paymentMethod: 'WECHAT_PAY',
        paymentStatus: 'PAID',
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        orderNo: 'PAY1656789054321',
        outTradeNo: 'OUT1656789054321',
        userId: req.user.id,
        packageId: 1,
        amount: 10.00,
        points: 100,
        bonusPoints: 0,
        paymentMethod: 'WECHAT_PAY',
        paymentStatus: 'PENDING',
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];

    res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total: 2,
        pages: 1
      },
      message: '获取订单列表成功'
    });

  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败: ' + error.message
    });
  }
});

// =====================================
// 邀请系统API路由
// =====================================

// 简单的用户ID提取中间件
const getUserId = (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.query.userId;
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: '请提供用户ID'
    });
  }
  req.userId = parseInt(userId);
  next();
};

/**
 * 获取邀请注册记录
 * GET /api/invite/registrations?userId=8&page=1&limit=10&startDate=2023-01-01&endDate=2023-12-31&email=test@example.com
 */
app.get('/api/invite/registrations', getUserId, async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const email = req.query.email;

    console.log('🎯 获取邀请注册记录:', { userId, page, limit, startDate, endDate, email });

    // 构建查询条件
    const whereCondition = {
      inviterId: userId // 查找被当前用户邀请的用户
    };

    // 日期范围筛选
    if (startDate || endDate) {
      whereCondition.createdAt = {};
      if (startDate) {
        whereCondition.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 包含结束日期的整天，所以设置为下一天的开始
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        whereCondition.createdAt.lt = endDateTime;
      }
    }

    // 邮箱搜索
    if (email) {
      whereCondition.email = {
        contains: email
      };
    }

    // 直接查询数据库：查找被该用户邀请的用户
    const invitedUsers = await db.prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    // 获取总数
    const total = await db.prisma.user.count({
      where: whereCondition
    });

    const totalPages = Math.ceil(total / limit);

    console.log('✅ 邀请注册记录获取成功:', { total, page, records: invitedUsers.length });

    res.json({
      success: true,
      data: {
        registrations: invitedUsers,
        total,
        page,
        limit,
        totalPages
      },
      message: '获取邀请注册记录成功'
    });
  } catch (error) {
    console.error('❌ 获取邀请注册记录失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取邀请注册记录失败'
    });
  }
});

/**
 * 获取邀请用户充值记录
 * GET /api/invite/recharges?userId=8&page=1&limit=10&startDate=2023-01-01&endDate=2023-12-31&email=test@example.com
 */
app.get('/api/invite/recharges', getUserId, async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const email = req.query.email;

    console.log('🎯 获取邀请用户充值记录:', { userId, page, limit, startDate, endDate, email });

    // 构建用户筛选条件
    const userWhereCondition = {
      inviterId: userId
    };

    // 如果有邮箱搜索，添加到用户查询条件
    if (email) {
      userWhereCondition.email = {
        contains: email
      };
    }

    // 查找被该用户邀请的用户列表
    const invitedUserIds = await db.prisma.user.findMany({
      where: userWhereCondition,
      select: {
        id: true
      }
    });

    const invitedIds = invitedUserIds.map(u => u.id);

    // 如果没有找到符合条件的用户，返回空结果
    if (invitedIds.length === 0) {
      return res.json({
        success: true,
        data: {
          recharges: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        },
        message: '获取邀请用户充值记录成功'
      });
    }

    // 构建充值记录查询条件
    const rechargeWhereCondition = {
      userId: {
        in: invitedIds
      },
      paymentStatus: 'PAID' // 只查询已支付的订单
    };

    // 日期范围筛选
    if (startDate || endDate) {
      rechargeWhereCondition.createdAt = {};
      if (startDate) {
        rechargeWhereCondition.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 包含结束日期的整天，所以设置为下一天的开始
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        rechargeWhereCondition.createdAt.lt = endDateTime;
      }
    }

    // 查找这些用户的充值记录
    const rechargeRecords = await db.prisma.paymentOrder.findMany({
      where: rechargeWhereCondition,
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    // 获取总数
    const total = await db.prisma.paymentOrder.count({
      where: rechargeWhereCondition
    });

    const totalPages = Math.ceil(total / limit);

    console.log('✅ 邀请用户充值记录获取成功:', { total, page, records: rechargeRecords.length });

    res.json({
      success: true,
      data: {
        recharges: rechargeRecords,
        total,
        page,
        limit,
        totalPages
      },
      message: '获取邀请用户充值记录成功'
    });
  } catch (error) {
    console.error('❌ 获取邀请用户充值记录失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取邀请用户充值记录失败'
    });
  }
});

/**
 * 获取邀请统计数据
 * GET /api/invite/stats?userId=8&startDate=2023-01-01&endDate=2023-12-31
 */
app.get('/api/invite/stats', getUserId, async (req, res) => {
  try {
    const userId = req.userId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    console.log('🎯 获取邀请统计数据:', { userId, startDate, endDate });

    // 构建用户查询条件
    const userWhereCondition = {
      inviterId: userId
    };

    // 日期范围筛选 - 针对用户注册时间
    if (startDate || endDate) {
      userWhereCondition.createdAt = {};
      if (startDate) {
        userWhereCondition.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 包含结束日期的整天，所以设置为下一天的开始
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        userWhereCondition.createdAt.lt = endDateTime;
      }
    }

    // 1. 统计邀请注册人数
    const totalInvitedUsers = await db.prisma.user.count({
      where: userWhereCondition
    });

    // 2. 获取被邀请用户的ID列表
    const invitedUserIds = await db.prisma.user.findMany({
      where: userWhereCondition,
      select: {
        id: true
      }
    });

    const invitedIds = invitedUserIds.map(u => u.id);

    // 构建充值记录查询条件
    const rechargeWhereCondition = {
      userId: {
        in: invitedIds
      },
      paymentStatus: 'PAID'
    };

    // 日期范围筛选 - 针对充值时间
    if (startDate || endDate) {
      rechargeWhereCondition.createdAt = {};
      if (startDate) {
        rechargeWhereCondition.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 包含结束日期的整天，所以设置为下一天的开始
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        rechargeWhereCondition.createdAt.lt = endDateTime;
      }
    }

    // 3. 统计充值用户数量
    const totalRechargeUsers = await db.prisma.paymentOrder.groupBy({
      by: ['userId'],
      where: rechargeWhereCondition
    });

    // 4. 统计累计充值金额
    const totalRechargeAmount = await db.prisma.paymentOrder.aggregate({
      where: rechargeWhereCondition,
      _sum: {
        amount: true
      }
    });

    // 5. 统计充值次数
    const totalRechargeCount = await db.prisma.paymentOrder.count({
      where: rechargeWhereCondition
    });

    const stats = {
      totalInvitedUsers,
      totalRechargeUsers: totalRechargeUsers.length,
      totalRechargeAmount: Number(totalRechargeAmount._sum.amount) || 0,
      totalRechargeCount
    };

    console.log('✅ 邀请统计数据获取成功:', stats);

    res.json({
      success: true,
      data: stats,
      message: '获取邀请统计数据成功'
    });
  } catch (error) {
    console.error('❌ 获取邀请统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取邀请统计数据失败'
    });
  }
});

// =====================================
// 管理员API路由
// =====================================

// 获取所有用户列表API - 添加这个新的API端点
app.get('/api/admin/users', adminAuthMiddleware, async (req, res) => {
  try {
    console.log('🔍 获取用户列表...');

    // 查询所有用户
    const users = await db.prisma.user.findMany({
      orderBy: [
        { createdAt: 'desc' } // 创建时间倒序
      ],
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        points: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`✅ 获取用户列表成功，共 ${users.length} 个用户`);

    // 返回用户列表
    res.json({
      success: true,
      data: {
        users,
        total: users.length
      },
      message: '获取用户列表成功'
    });
  } catch (error) {
    console.error('❌ 获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: `获取用户列表失败: ${error.message}`
    });
  }
});

// 更新用户角色API - 添加这个新的API端点
app.put('/api/admin/users/role', adminAuthMiddleware, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const currentUserId = req.user?.userId;

    console.log('🔄 更新用户角色:', { userId, role, currentUserId });

    // 验证输入
    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        message: '用户ID和角色不能为空'
      });
    }

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '角色必须是 USER 或 ADMIN'
      });
    }

    // 防止用户修改自己的角色
    if (parseInt(userId) === parseInt(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: '不能修改自己的角色'
      });
    }

    // 查询目标用户
    const targetUser = await db.getUserById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '目标用户不存在'
      });
    }

    // 检查是否是最后一个管理员
    if (targetUser.role === 'ADMIN' && role === 'USER') {
      const adminCount = await db.prisma.user.count({
        where: { role: 'ADMIN' }
      });

      if (adminCount <= 1) {
        return res.status(403).json({
          success: false,
          message: '系统至少需要保留一个管理员账号'
        });
      }
    }

    // 更新用户角色
    const updatedUser = await db.prisma.user.update({
      where: { id: parseInt(userId) },
      data: { role }
    });

    console.log(`✅ 用户角色更新成功: ${updatedUser.username} -> ${role}`);

    res.json({
      success: true,
      data: {
        user: updatedUser
      },
      message: `用户 ${updatedUser.username} 的角色已更新为 ${role === 'ADMIN' ? '管理员' : '普通用户'}`
    });

  } catch (error) {
    console.error('❌ 更新用户角色失败:', error);
    res.status(500).json({
      success: false,
      message: `更新用户角色失败: ${error.message}`
    });
  }
});

/**
 * 管理员更新用户积分
 * PUT /api/admin/users/credits
 * Body: { userId: number, operation: 'add' | 'set', amount: number, description?: string }
 */
app.put('/api/admin/users/credits', adminAuthMiddleware, async (req, res) => {
  try {
    console.log('🔄 管理员积分更新请求:', {
      body: req.body,
      adminUserId: req.user?.userId,
      sessionId: req.headers['x-session-id']
    });

    const { userId, operation, amount, description } = req.body;
    const adminUserId = req.user?.userId;

    // 参数验证
    if (!userId || isNaN(parseInt(userId))) {
      console.log('❌ 用户ID无效:', userId);
      return res.status(400).json({
        success: false,
        message: '用户ID无效'
      });
    }

    if (!operation || !['add', 'set'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: '操作类型必须是 add 或 set'
      });
    }

    if (amount === undefined || isNaN(parseInt(amount)) || amount < 0) {
      return res.status(400).json({
        success: false,
        message: '积分数量必须是非负数'
      });
    }

    const targetUserId = parseInt(userId);
    const creditAmount = parseInt(amount);

    // 检查目标用户是否存在
    const targetUser = await db.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, email: true, points: true }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '目标用户不存在'
      });
    }

    // 获取管理员信息
    const adminUser = await db.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { username: true, email: true }
    });

    let newPoints;
    let transactionDescription;

    if (operation === 'add') {
      newPoints = (targetUser.points || 0) + creditAmount;
      transactionDescription = description || `管理员 ${adminUser?.username || adminUserId} 增加积分`;
    } else { // operation === 'set'
      newPoints = creditAmount;
      transactionDescription = description || `管理员 ${adminUser?.username || adminUserId} 设置积分`;
    }

    // 使用事务确保数据一致性
    const result = await db.prisma.$transaction(async (tx) => {
      // 更新用户积分
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: { points: newPoints },
        select: { id: true, username: true, email: true, points: true }
      });

      // 记录积分交易
      await tx.pointTransaction.create({
        data: {
          userId: targetUserId,
          transactionType: 'REWARD', // 管理员修改积分记录为奖励类型，在前端显示为"积分补偿"
          amount: operation === 'add' ? creditAmount : (newPoints - (targetUser.points || 0)),
          balanceAfter: newPoints,
          description: transactionDescription,
        }
      });

      return updatedUser;
    });

    console.log(`✅ 管理员积分操作成功: ${adminUser?.username} ${operation} ${creditAmount} 积分给用户 ${targetUser.username}`);

    res.json({
      success: true,
      data: {
        user: result,
        operation,
        amount: creditAmount,
        newBalance: newPoints
      },
      message: `成功${operation === 'add' ? '增加' : '设置'}用户积分`
    });
  } catch (error) {
    console.error('❌ 更新用户积分失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户积分失败'
    });
  }
});

/**
 * 管理员 - 获取所有用户的邀请注册记录
 * GET /api/admin/invites/registrations?startDate=2023-01-01&endDate=2023-12-31&inviterEmail=test@example.com&inviteeEmail=user@example.com
 */
app.get('/api/admin/invites/registrations', adminAuthMiddleware, async (req, res) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const inviterEmail = req.query.inviterEmail;
    const inviteeEmail = req.query.inviteeEmail;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    console.log('🎯 管理员获取所有邀请注册记录:', { startDate, endDate, inviterEmail, inviteeEmail, page, limit });

    // 构建查询条件
    const whereCondition = {
      inviterId: {
        not: null // 确保有邀请人
      }
    };

    // 日期范围筛选
    if (startDate || endDate) {
      whereCondition.createdAt = {};
      if (startDate) {
        whereCondition.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        whereCondition.createdAt.lt = endDateTime;
      }
    }

    // 被邀请人邮箱筛选
    if (inviteeEmail) {
      whereCondition.email = {
        contains: inviteeEmail
      };
    }

    // 如果有邀请人邮箱筛选，先获取符合条件的邀请人ID
    let allowedInviterIds = null;
    if (inviterEmail) {
      const inviters = await db.prisma.user.findMany({
        where: {
          email: {
            contains: inviterEmail
          }
        },
        select: {
          id: true
        }
      });
      allowedInviterIds = inviters.map(u => u.id);

      if (allowedInviterIds.length === 0) {
        return res.json({
          success: true,
          data: {
            registrations: [],
            page,
            limit,
            totalPages: 0,
            total: 0
          },
          message: '获取邀请注册记录成功'
        });
      }

      // 添加到查询条件中
      whereCondition.inviterId = {
        in: allowedInviterIds
      };
    }

    // 获取总数
    const total = await db.prisma.user.count({
      where: whereCondition
    });

    // 获取分页的被邀请用户
    const invitedUsers = await db.prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        inviterId: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    // 获取邀请人信息
    const inviterIds = [...new Set(invitedUsers.map(u => u.inviterId))];
    const inviters = await db.prisma.user.findMany({
      where: {
        id: {
          in: inviterIds
        }
      },
      select: {
        id: true,
        email: true,
        username: true
      }
    });

    const inviterMap = inviters.reduce((acc, inviter) => {
      acc[inviter.id] = inviter;
      return acc;
    }, {});

    // 格式化数据
    const registrations = invitedUsers.map(user => ({
      id: user.id,
      inviterEmail: inviterMap[user.inviterId]?.email || '',
      inviterUsername: inviterMap[user.inviterId]?.username || '',
      inviteeEmail: user.email,
      inviteeUsername: user.username,
      createdAt: user.createdAt
    }));

    const totalPages = Math.ceil(total / limit);

    console.log('✅ 管理员邀请注册记录获取成功:', { total, page, totalPages, registrations: registrations.length });

    res.json({
      success: true,
      data: {
        registrations,
        page,
        limit,
        totalPages,
        total
      },
      message: '获取邀请注册记录成功'
    });
  } catch (error) {
    console.error('❌ 管理员获取邀请注册记录失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取邀请注册记录失败'
    });
  }
});

/**
 * 管理员 - 获取所有用户的邀请充值记录
 * GET /api/admin/invites/recharges?startDate=2023-01-01&endDate=2023-12-31&inviterEmail=test@example.com&inviteeEmail=user@example.com
 */
app.get('/api/admin/invites/recharges', adminAuthMiddleware, async (req, res) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const inviterEmail = req.query.inviterEmail;
    const inviteeEmail = req.query.inviteeEmail;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    console.log('🎯 管理员获取所有邀请充值记录:', { startDate, endDate, inviterEmail, inviteeEmail, page, limit });

    // 构建充值记录查询条件（使用嵌套查询）
    const rechargeWhereCondition = {
      paymentStatus: 'PAID',
      user: {
        inviterId: {
          not: null
        }
      }
    };

    // 被邀请人邮箱筛选
    if (inviteeEmail) {
      rechargeWhereCondition.user.email = {
        contains: inviteeEmail
      };
    }

    // 邀请人邮箱筛选
    if (inviterEmail) {
      // 先获取符合条件的邀请人ID
      const inviters = await db.prisma.user.findMany({
        where: {
          email: {
            contains: inviterEmail
          }
        },
        select: {
          id: true
        }
      });

      const allowedInviterIds = inviters.map(u => u.id);
      if (allowedInviterIds.length === 0) {
        return res.json({
          success: true,
          data: {
            recharges: [],
            page,
            limit,
            totalPages: 0,
            total: 0
          },
          message: '获取邀请充值记录成功'
        });
      }

      rechargeWhereCondition.user.inviterId = {
        in: allowedInviterIds
      };
    }

    // 日期范围筛选
    if (startDate || endDate) {
      rechargeWhereCondition.createdAt = {};
      if (startDate) {
        rechargeWhereCondition.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        rechargeWhereCondition.createdAt.lt = endDateTime;
      }
    }

    // 获取总数
    const total = await db.prisma.paymentOrder.count({
      where: rechargeWhereCondition
    });

    // 获取分页的充值记录
    const rechargeRecords = await db.prisma.paymentOrder.findMany({
      where: rechargeWhereCondition,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            inviterId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    // 获取所有邀请人信息
    const inviterIds = [...new Set(rechargeRecords.map(r => r.user.inviterId))];
    const inviters = await db.prisma.user.findMany({
      where: {
        id: {
          in: inviterIds
        }
      },
      select: {
        id: true,
        email: true,
        username: true
      }
    });

    const inviterMap = inviters.reduce((acc, inviter) => {
      acc[inviter.id] = inviter;
      return acc;
    }, {});

    // 格式化数据
    const recharges = rechargeRecords.map(record => ({
      id: record.id,
      inviterEmail: inviterMap[record.user.inviterId]?.email || '',
      inviterUsername: inviterMap[record.user.inviterId]?.username || '',
      inviteeEmail: record.user.email,
      inviteeUsername: record.user.username,
      amount: parseFloat(record.amount),
      createdAt: record.createdAt
    }));

    const totalPages = Math.ceil(total / limit);

    console.log('✅ 管理员邀请充值记录获取成功:', { total, page, totalPages, recharges: recharges.length });

    res.json({
      success: true,
      data: {
        recharges,
        page,
        limit,
        totalPages,
        total
      },
      message: '获取邀请充值记录成功'
    });
  } catch (error) {
    console.error('❌ 管理员获取邀请充值记录失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取邀请充值记录失败'
    });
  }
});

/**
 * 管理员 - 获取所有用户的邀请汇总统计
 * GET /api/admin/invites/summary?startDate=2023-01-01&endDate=2023-12-31&inviterEmail=test@example.com
 */
app.get('/api/admin/invites/summary', adminAuthMiddleware, async (req, res) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const inviterEmail = req.query.inviterEmail;

    console.log('🎯 管理员获取所有邀请汇总统计:', { startDate, endDate, inviterEmail });

    // 构建邀请人查询条件
    const inviterWhereCondition = {};

    // 邀请人邮箱筛选
    if (inviterEmail) {
      inviterWhereCondition.email = {
        contains: inviterEmail
      };
    }

    // 先获取所有被邀请的用户，找出他们的邀请人ID
    const invitedUsers = await db.prisma.user.findMany({
      where: {
        inviterId: {
          not: null
        }
      },
      select: {
        inviterId: true
      },
      distinct: ['inviterId']
    });

    const inviterIds = [...new Set(invitedUsers.map(u => u.inviterId).filter(id => id !== null))];

    // 然后根据邮箱筛选条件查询邀请人信息
    const inviterFinalWhereCondition = {
      id: {
        in: inviterIds
      },
      ...inviterWhereCondition
    };

    const inviters = await db.prisma.user.findMany({
      where: inviterFinalWhereCondition,
      select: {
        id: true,
        email: true,
        username: true
      }
    });

    console.log('📊 找到邀请人数量:', inviters.length);

    // 为每个邀请人计算统计数据
    const summaryPromises = inviters.map(async (inviter) => {
      // 构建被邀请用户查询条件
      const invitedUserWhereCondition = {
        inviterId: inviter.id
      };

      // 日期范围筛选 - 针对用户注册时间
      if (startDate || endDate) {
        invitedUserWhereCondition.createdAt = {};
        if (startDate) {
          invitedUserWhereCondition.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setDate(endDateTime.getDate() + 1);
          invitedUserWhereCondition.createdAt.lt = endDateTime;
        }
      }

      // 1. 统计邀请注册人数
      const totalInvitedUsers = await db.prisma.user.count({
        where: invitedUserWhereCondition
      });

      // 2. 获取被邀请用户ID列表
      const invitedUserIds = await db.prisma.user.findMany({
        where: invitedUserWhereCondition,
        select: {
          id: true
        }
      });

      const invitedIds = invitedUserIds.map(u => u.id);

      if (invitedIds.length === 0) {
        return {
          inviterId: inviter.id,
          inviterEmail: inviter.email,
          inviterUsername: inviter.username,
          totalInvitedUsers: 0,
          totalRechargeUsers: 0,
          totalRechargeAmount: 0,
          totalRechargeCount: 0
        };
      }

      // 构建充值记录查询条件
      const rechargeWhereCondition = {
        userId: {
          in: invitedIds
        },
        paymentStatus: 'PAID'
      };

      // 日期范围筛选 - 针对充值时间
      if (startDate || endDate) {
        rechargeWhereCondition.createdAt = {};
        if (startDate) {
          rechargeWhereCondition.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setDate(endDateTime.getDate() + 1);
          rechargeWhereCondition.createdAt.lt = endDateTime;
        }
      }

      // 3. 统计充值用户数量
      const totalRechargeUsers = await db.prisma.paymentOrder.groupBy({
        by: ['userId'],
        where: rechargeWhereCondition
      });

      // 4. 统计累计充值金额
      const totalRechargeAmount = await db.prisma.paymentOrder.aggregate({
        where: rechargeWhereCondition,
        _sum: {
          amount: true
        }
      });

      // 5. 统计充值次数
      const totalRechargeCount = await db.prisma.paymentOrder.count({
        where: rechargeWhereCondition
      });

      return {
        inviterId: inviter.id,
        inviterEmail: inviter.email,
        inviterUsername: inviter.username,
        totalInvitedUsers,
        totalRechargeUsers: totalRechargeUsers.length,
        totalRechargeAmount: Number(totalRechargeAmount._sum.amount) || 0,
        totalRechargeCount
      };
    });

    const summary = await Promise.all(summaryPromises);

    // 按邀请注册人数降序排列
    summary.sort((a, b) => b.totalInvitedUsers - a.totalInvitedUsers);

    console.log('✅ 管理员邀请汇总统计获取成功:', { total: summary.length });

    res.json({
      success: true,
      data: {
        summary
      },
      message: '获取邀请汇总统计成功'
    });
  } catch (error) {
    console.error('❌ 管理员获取邀请汇总统计失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取邀请汇总统计失败'
    });
  }
});

// =====================================
// 管理员用户角色管理API
// =====================================

/**
 * 管理员 - 获取流量手列表
 * GET /api/admin/users/traffic-agents
 */
app.get('/api/admin/users/traffic-agents', adminAuthMiddleware, async (req, res) => {
  try {
    console.log('🎯 管理员获取流量手列表');

    const trafficAgents = await db.prisma.user.findMany({
      where: { isTrafficAgent: true },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        points: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // 为每个流量手获取邀请统计数据
    const inviteService = new InviteService();
    const trafficAgentsWithStats = await Promise.all(
      trafficAgents.map(async (agent) => {
        const summary = await inviteService.getUserInviteSummary(agent.id);
        return {
          ...agent,
          inviteStats: summary
        };
      })
    );

    console.log('✅ 流量手列表获取成功:', { count: trafficAgentsWithStats.length });

    res.json({
      success: true,
      data: {
        trafficAgents: trafficAgentsWithStats,
        total: trafficAgentsWithStats.length
      },
      message: '获取流量手列表成功'
    });
  } catch (error) {
    console.error('❌ 获取流量手列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取流量手列表失败'
    });
  }
});

/**
 * 管理员 - 设置/取消用户流量手身份
 * PUT /api/admin/users/:id/traffic-agent
 */
app.put('/api/admin/users/:id/traffic-agent', adminAuthMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { isTrafficAgent } = req.body;

    console.log('🎯 管理员设置流量手身份:', { userId, isTrafficAgent });

    if (typeof isTrafficAgent !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isTrafficAgent 参数必须是布尔值'
      });
    }

    // 检查用户是否存在
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, isTrafficAgent: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新用户流量手身份
    const updatedUser = await db.prisma.user.update({
      where: { id: userId },
      data: { isTrafficAgent },
      select: {
        id: true,
        username: true,
        email: true,
        isTrafficAgent: true
      }
    });

    console.log('✅ 流量手身份更新成功:', { 
      userId, 
      username: updatedUser.username,
      isTrafficAgent: updatedUser.isTrafficAgent 
    });

    res.json({
      success: true,
      data: { user: updatedUser },
      message: `${isTrafficAgent ? '设置' : '取消'}流量手身份成功`
    });
  } catch (error) {
    console.error('❌ 设置流量手身份失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '设置流量手身份失败'
    });
  }
});

// =====================================
// 管理员邀请配置管理API
// =====================================

/**
 * 管理员 - 获取邀请配置
 * GET /api/admin/invite/configs
 */
app.get('/api/admin/invite/configs', adminAuthMiddleware, async (req, res) => {
  try {
    console.log('🎯 管理员获取邀请配置');

    const inviteConfigService = new InviteConfigService();
    const configs = await inviteConfigService.getAllConfigs();

    console.log('✅ 邀请配置获取成功:', { count: configs.length });

    res.json({
      success: true,
      data: { configs },
      message: '获取邀请配置成功'
    });
  } catch (error) {
    console.error('❌ 获取邀请配置失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取邀请配置失败'
    });
  }
});

/**
 * 管理员 - 更新邀请配置
 * PUT /api/admin/invite/configs
 */
app.put('/api/admin/invite/configs', adminAuthMiddleware, async (req, res) => {
  try {
    const { configs } = req.body;

    console.log('🎯 管理员更新邀请配置:', { count: configs?.length });

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        success: false,
        message: '配置参数格式错误'
      });
    }

    // 验证配置格式
    for (const config of configs) {
      if (!config.configKey || typeof config.configValue !== 'number') {
        return res.status(400).json({
          success: false,
          message: '配置项格式错误，需要 configKey 和 configValue'
        });
      }
    }

    const inviteConfigService = new InviteConfigService();
    await inviteConfigService.updateConfigs(configs);

    console.log('✅ 邀请配置更新成功');

    res.json({
      success: true,
      message: '邀请配置更新成功'
    });
  } catch (error) {
    console.error('❌ 更新邀请配置失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新邀请配置失败'
    });
  }
});

/**
 * 用户 - 获取邀请数据汇总（区分角色）
 * GET /api/invite/summary
 */
app.get('/api/invite/summary', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🎯 用户获取邀请数据汇总:', { userId });

    const inviteService = new InviteService();
    const summary = await inviteService.getUserInviteSummary(userId);

    console.log('✅ 用户邀请数据汇总获取成功:', { 
      userId,
      isTrafficAgent: summary.userInfo?.isTrafficAgent 
    });

    res.json({
      success: true,
      data: summary,
      message: '获取邀请数据汇总成功'
    });
  } catch (error) {
    console.error('❌ 获取邀请数据汇总失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取邀请数据汇总失败'
    });
  }
});

// =====================================
// 充值相关API路由
// =====================================

// 将数据库实例提供给路由使用
app.locals.db = db;
global.db = db; // 备用方式

// 引入充值路由和微信支付回调路由
const rechargeRoutes = require('./src/routes/recharge');
const wechatCallbackRoutes = require('./src/routes/wechat-callback');

// =====================================
// 管理员充值套餐API
// =====================================

// X-Session-Id 认证中间件（专门处理前端的会话ID）
const verifySessionId = async (req, res, next) => {
  try {
    console.log('🔐 verifySessionId中间件 - 开始验证');
    console.log('请求路径:', req.path);

    const sessionId = req.headers['x-session-id'];
    console.log('会话ID:', sessionId);

    if (!sessionId) {
      console.log('❌ 未提供会话ID');
      return res.status(401).json({ success: false, message: '未提供会话ID' });
    }

    // 从会话存储中获取用户会话（使用正确的key格式）
    console.log('🔍 查询会话数据...');
    const sessionData = await SessionStore.get(`session:${sessionId}`);
    console.log('会话数据:', sessionData);

    if (!sessionData) {
      console.log('❌ 会话已过期或无效');
      return res.status(401).json({ success: false, message: '会话已过期或无效' });
    }

    // 检查会话是否有效
    console.log('⏰ 检查会话过期时间...');
    if (sessionData.expiresAt && new Date() > new Date(sessionData.expiresAt)) {
      console.log('❌ 会话已过期');
      return res.status(401).json({ success: false, message: '会话已过期' });
    }

    // 更新最后活动时间
    console.log('🔄 更新会话活动时间...');
    sessionData.lastActivity = new Date().toISOString();
    await SessionStore.set(`session:${sessionId}`, sessionData, 1209600); // 14天TTL

    console.log('✅ 会话验证成功，用户信息:', { userId: sessionData.userId, username: sessionData.username });

    // 将用户信息添加到请求对象（使用与现有代码相同的格式）
    req.user = {
      userId: sessionData.userId,
      username: sessionData.username,
      email: sessionData.email
    };
    req.sessionId = sessionId;
    next();
  } catch (error) {
    console.error('会话验证异常:', error);
    return res.status(401).json({ success: false, message: '认证失败' });
  }
};

// 测试端点 - 用于确认代码是否已更新
app.get('/api/test/code-updated', (req, res) => {
  console.log('🧪 测试端点被调用 - 代码已更新！时间:', new Date().toISOString());
  res.json({
    success: true,
    message: '代码已更新！',
    timestamp: new Date().toISOString(),
    version: 'v2024-updated'
  });
});

// 临时测试路由 - 绕过session验证，直接查询数据库
app.get('/api/admin/payment-packages-bypass', async (req, res) => {
  console.log('🔧 临时测试路由 - 绕过session验证');
  try {
    const packages = await db.prisma.paymentPackage.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        amount: true,
        points: true,
        bonusPoints: true,
        isActive: true,
        sortOrder: true,
        icon: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    console.log(`✅ 查询成功，找到 ${packages.length} 个套餐`);

    res.json({
      success: true,
      packages,
      total: packages.length,
      message: '获取充值套餐成功（绕过验证）'
    });
  } catch (error) {
    console.error('❌ 查询失败:', error);
    res.status(500).json({
      success: false,
      message: '查询失败: ' + error.message
    });
  }
});

// 获取充值套餐（管理员）
app.get('/api/admin/payment-packages', verifySessionId, async (req, res) => {
  console.log('⭐ 进入 payment-packages 路由处理函数');
  try {
    console.log('🔍 管理员请求充值套餐列表');
    console.log('请求头:', req.headers);
    console.log('用户信息:', req.user);

    // 检查管理员权限
    const userId = req.user.userId;
    console.log('用户ID:', userId);

    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, username: true }
    });

    console.log('查询到的用户:', user);

    if (!user || user.role !== 'ADMIN') {
      console.log('❌ 权限检查失败:', { user: user?.username, role: user?.role });
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    console.log('✅ 管理员权限验证通过:', user.username);

    console.log('🔍 开始查询数据库...');
    const packages = await db.prisma.paymentPackage.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        amount: true,
        points: true,
        bonusPoints: true,
        isActive: true,
        sortOrder: true,
        icon: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    console.log(`✅ 数据库查询成功，找到 ${packages.length} 个套餐`);
    console.log('套餐数据:', packages);

    res.json({
      success: true,
      packages,
      total: packages.length,
      message: '获取充值套餐成功'
    });
  } catch (error) {
    console.error('❌ 获取充值套餐失败:', error);
    console.error('错误详情:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: '获取充值套餐失败'
    });
  }
});

// 创建充值套餐（管理员）
app.post('/api/admin/payment-packages', verifySessionId, async (req, res) => {
  try {
    console.log('🆕 管理员创建充值套餐');

    // 检查管理员权限
    const userId = req.user.userId;
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { name, description, amount, points, bonusPoints } = req.body;

    // 参数验证
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: '套餐名称不能为空'
      });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: '套餐价格必须是大于0的数字'
      });
    }

    if (!points || isNaN(parseInt(points)) || parseInt(points) <= 0) {
      return res.status(400).json({
        success: false,
        message: '积分数量必须是大于0的整数'
      });
    }

    const bonusPointsValue = bonusPoints ? parseInt(bonusPoints) : 0;
    if (bonusPointsValue < 0) {
      return res.status(400).json({
        success: false,
        message: '奖励积分不能为负数'
      });
    }

    // 创建套餐
    const newPackage = await db.prisma.paymentPackage.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        amount: parseFloat(amount),
        points: parseInt(points),
        bonusPoints: bonusPointsValue,
        isActive: true,
        sortOrder: 0
      },
      select: {
        id: true,
        name: true,
        description: true,
        amount: true,
        points: true,
        bonusPoints: true,
        isActive: true,
        sortOrder: true,
        icon: true,
        isRecommended: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      package: newPackage,
      message: '创建充值套餐成功'
    });
  } catch (error) {
    console.error('创建充值套餐失败:', error);
    res.status(500).json({
      success: false,
      message: '创建充值套餐失败'
    });
  }
});

// 更新充值套餐（管理员）
app.put('/api/admin/payment-packages/:id', verifySessionId, async (req, res) => {
  try {
    console.log('✏️ 管理员更新充值套餐');

    // 检查管理员权限
    const userId = req.user.userId;
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const packageId = parseInt(req.params.id);
    const { name, description, amount, points, bonusPoints } = req.body;

    if (isNaN(packageId)) {
      return res.status(400).json({
        success: false,
        message: '套餐ID无效'
      });
    }

    // 参数验证
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: '套餐名称不能为空'
      });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: '套餐价格必须是大于0的数字'
      });
    }

    if (!points || isNaN(parseInt(points)) || parseInt(points) <= 0) {
      return res.status(400).json({
        success: false,
        message: '积分数量必须是大于0的整数'
      });
    }

    const bonusPointsValue = bonusPoints ? parseInt(bonusPoints) : 0;
    if (bonusPointsValue < 0) {
      return res.status(400).json({
        success: false,
        message: '奖励积分不能为负数'
      });
    }

    // 检查套餐是否存在
    const existingPackage = await db.prisma.paymentPackage.findUnique({
      where: { id: packageId },
      select: {
        id: true,
        name: true,
        description: true,
        amount: true,
        points: true,
        bonusPoints: true,
        isActive: true,
        sortOrder: true,
        icon: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!existingPackage) {
      return res.status(404).json({
        success: false,
        message: '套餐不存在'
      });
    }

    // 更新套餐
    const updatedPackage = await db.prisma.paymentPackage.update({
      where: { id: packageId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        amount: parseFloat(amount),
        points: parseInt(points),
        bonusPoints: bonusPointsValue
      },
      select: {
        id: true,
        name: true,
        description: true,
        amount: true,
        points: true,
        bonusPoints: true,
        isActive: true,
        sortOrder: true,
        icon: true,
        isRecommended: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      package: updatedPackage,
      message: '更新充值套餐成功'
    });
  } catch (error) {
    console.error('更新充值套餐失败:', error);
    res.status(500).json({
      success: false,
      message: '更新充值套餐失败'
    });
  }
});

// 删除充值套餐（管理员）
app.delete('/api/admin/payment-packages/:id', verifySessionId, async (req, res) => {
  try {
    console.log('🗑️ 管理员删除充值套餐');

    // 检查管理员权限
    const userId = req.user.userId;
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const packageId = parseInt(req.params.id);

    if (isNaN(packageId)) {
      return res.status(400).json({
        success: false,
        message: '套餐ID无效'
      });
    }

    // 检查套餐是否存在
    const existingPackage = await db.prisma.paymentPackage.findUnique({
      where: { id: packageId },
      select: {
        id: true,
        name: true,
        description: true,
        amount: true,
        points: true,
        bonusPoints: true,
        isActive: true,
        sortOrder: true,
        icon: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!existingPackage) {
      return res.status(404).json({
        success: false,
        message: '套餐不存在'
      });
    }

    // 检查是否有关联的订单
    const orderCount = await db.prisma.paymentOrder.count({
      where: { packageId: packageId }
    });

    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: '该套餐已有订单记录，无法删除'
      });
    }

    // 删除套餐
    await db.prisma.paymentPackage.delete({
      where: { id: packageId }
    });

    res.json({
      success: true,
      message: '删除充值套餐成功'
    });
  } catch (error) {
    console.error('删除充值套餐失败:', error);
    res.status(500).json({
      success: false,
      message: '删除充值套餐失败'
    });
  }
});

// =====================================
// 管理员使用情况统计API
// =====================================

// 获取使用情况统计 - 交易记录
app.get('/api/admin/usage-stats/transactions', verifySessionId, async (req, res) => {
  console.log('⭐ 进入 usage-stats/transactions 路由');
  try {
    console.log('📊 管理员请求交易记录');
    console.log('查询参数:', req.query);

    // 检查管理员权限
    const userId = req.user.userId;
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { page = 1, limit = 20, transactionType, userEmail, startDate, endDate } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // 构建查询条件
    const where = {};

    if (transactionType && transactionType !== 'all') {
      console.log('🔍 调试信息 - 原始交易类型:', transactionType, '类型:', typeof transactionType);
      
      // 将前端传递的字符串转换为数据库枚举值（小写）
      const transactionTypeMap = {
        'consume': 'consume',
        'recharge': 'recharge', 
        'refund': 'refund',
        'reward': 'reward',
        'CONSUME': 'consume',
        'RECHARGE': 'recharge', 
        'REFUND': 'refund',
        'REWARD': 'reward'
      };
      
      const mappedType = transactionTypeMap[transactionType];
      console.log('🔍 调试信息 - 映射后的类型:', mappedType);
      
      // 尝试不同的枚举值格式
      const possibleValues = ['consume', 'CONSUME', 'Consume'];
      console.log('🔍 调试信息 - 尝试的枚举值:', possibleValues);
      
      // 尝试不同格式的枚举值
      const possibleFormats = [
        mappedType,           // 'consume'
        mappedType.toUpperCase(), // 'CONSUME'
        mappedType.charAt(0).toUpperCase() + mappedType.slice(1) // 'Consume'
      ];
      
      console.log('🔍 调试信息 - 尝试的格式:', possibleFormats);
      
      // 先尝试大写格式（基于其他代码中的用法）
      where.transactionType = mappedType.toUpperCase();
      console.log('🔍 调试信息 - 最终where条件:', JSON.stringify(where, null, 2));
      
      // 如果映射失败，记录日志并跳过筛选
      if (!where.transactionType) {
        console.log('⚠️ 未知的交易类型:', transactionType);
        delete where.transactionType;
      }
    }

    // 使用统一的日期处理函数
    const dateRange = buildDateRange(startDate, endDate);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    // 如果有用户邮箱筛选，需要通过用户表关联查询
    let userWhere = {};
    if (userEmail) {
      userWhere = {
        email: { contains: userEmail }
      };
    }

    console.log('🔍 查询交易记录，条件:', { where, userWhere, skip, take });

    // 添加调试：检查Prisma客户端的枚举
    try {
      const { PrismaClient } = require('@prisma/client');
      const testClient = new PrismaClient();
      console.log('🔍 调试信息 - 尝试访问不同的枚举路径...');
      console.log('🔍 调试信息 - testClient.transactionType:', testClient.transactionType);
      console.log('🔍 调试信息 - testClient.$enums:', testClient.$enums);
      
      // 尝试直接导入枚举
      const { TransactionType } = require('@prisma/client');
      console.log('🔍 调试信息 - 直接导入的TransactionType:', TransactionType);
      
      // 查看所有可用的枚举
      if (testClient.$enums) {
        console.log('🔍 调试信息 - 所有枚举:', Object.keys(testClient.$enums));
        console.log('🔍 调试信息 - TransactionType枚举值:', testClient.$enums.TransactionType);
      }
    } catch (e) {
      console.log('🔍 调试信息 - 枚举访问失败:', e.message);
    }

    // 使用原生SQL查询以确保包含end_time字段
    let sqlQuery = `
      SELECT 
        pt.id, pt.user_id as userId, pt.transaction_type as transactionType,
        pt.amount, pt.balance_after as balanceAfter, pt.model_name as modelName,
        pt.question_type as questionType, pt.description, pt.metadata,
        pt.created_at as createdAt, pt.end_time as endTime,
        u.username, u.email
      FROM point_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (transactionType && transactionType !== 'all') {
      const dbTransactionType = transactionType.toUpperCase();
      sqlQuery += ` AND pt.transaction_type = ?`;
      queryParams.push(dbTransactionType);
    }
    
    if (startDate) {
      sqlQuery += ` AND pt.created_at >= ?`;
      queryParams.push(new Date(startDate));
    }
    
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      sqlQuery += ` AND pt.created_at <= ?`;
      queryParams.push(endDateTime);
    }
    
    if (userEmail) {
      sqlQuery += ` AND u.email LIKE ?`;
      queryParams.push(`%${userEmail}%`);
    }
    
    sqlQuery += ` ORDER BY pt.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(take, skip);
    
    const transactions = await db.prisma.$queryRawUnsafe(sqlQuery, ...queryParams);
    
    console.log(`✅ 查询到 ${transactions.length} 条交易记录`);
    console.log('交易记录样本:', transactions[0]);
    
    // 计算总数
    let countQuery = `
      SELECT COUNT(*) as total
      FROM point_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (transactionType && transactionType !== 'all') {
      const dbTransactionType = transactionType.toUpperCase();
      countQuery += ` AND pt.transaction_type = ?`;
      countParams.push(dbTransactionType);
    }
    
    if (startDate) {
      countQuery += ` AND pt.created_at >= ?`;
      countParams.push(new Date(startDate));
    }
    
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      countQuery += ` AND pt.created_at <= ?`;
      countParams.push(endDateTime);
    }
    
    if (userEmail) {
      countQuery += ` AND u.email LIKE ?`;
      countParams.push(`%${userEmail}%`);
    }
    
    const countResult = await db.prisma.$queryRawUnsafe(countQuery, ...countParams);
    const total = Number(countResult[0].total);

    // 转换字段名为前端期望的格式
    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      userId: tx.userId,
      transaction_type: tx.transactionType,
      amount: tx.amount,
      balance_after: tx.balanceAfter,
      model_name: tx.modelName,
      question_type: tx.questionType,
      description: tx.description,
      metadata: tx.metadata,
      created_at: tx.createdAt,
      end_time: tx.endTime, // 从原生SQL查询直接获取
      username: tx.username || '',
      email: tx.email || '',
      operationType: tx.transactionType === 'CONSUME' && tx.questionType === 'PROGRAMMING' ? '编程题' :
          tx.transactionType === 'CONSUME' && tx.questionType === 'MULTIPLE_CHOICE' ? '选择题' :
              tx.transactionType === 'CONSUME' ? '消费' :
                  tx.transactionType === 'RECHARGE' ? '充值' :
                      tx.transactionType === 'REWARD' ? '奖励' :
                          tx.transactionType === 'REFUND' ? '退款' : 
                          // 处理小写的情况
                          tx.transactionType === 'consume' && tx.questionType === 'programming' ? '编程题' :
                          tx.transactionType === 'consume' && tx.questionType === 'multiple_choice' ? '选择题' :
                          tx.transactionType === 'consume' ? '消费' :
                          tx.transactionType === 'recharge' ? '充值' :
                          tx.transactionType === 'reward' ? '奖励' :
                          tx.transactionType === 'refund' ? '退款' : tx.transactionType
    }));

    console.log('格式化后的交易记录样本:', formattedTransactions[0]);

    res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      },
      message: '获取交易记录成功'
    });
  } catch (error) {
    console.error('获取交易记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取交易记录失败'
    });
  }
});

// 获取使用情况统计 - 摘要信息
app.get('/api/admin/usage-stats/summary', verifySessionId, async (req, res) => {
  try {
    console.log('📈 管理员请求使用统计摘要');

    // 检查管理员权限
    const userId = req.user.userId;
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { startDate, endDate, userEmail } = req.query;

    // 构建时间范围条件
    const dateWhere = {};
    const dateRange = buildDateRange(startDate, endDate);
    if (dateRange) {
      dateWhere.createdAt = dateRange;
    }

    // 用户筛选条件
    let userWhere = {};
    if (userEmail) {
      userWhere = {
        email: { contains: userEmail }
      };
    }

    // 获取总用户数
    const totalUsers = await db.prisma.user.count({
      where: userEmail ? userWhere : {}
    });

    // 获取活跃用户数（有积分交易的用户）
    const activeUsers = await db.prisma.pointTransaction.groupBy({
      by: ['userId'],
      where: {
        ...dateWhere,
        ...(userEmail ? { user: userWhere } : {})
      }
    });

    // 获取交易统计
    const transactionStats = await db.prisma.pointTransaction.aggregate({
      where: {
        ...dateWhere,
        ...(userEmail ? { user: userWhere } : {})
      },
      _count: { id: true },
      _sum: { amount: true }
    });

    // 按交易类型统计
    const transactionByType = await db.prisma.pointTransaction.groupBy({
      by: ['transactionType'],
      where: {
        ...dateWhere,
        ...(userEmail ? { user: userWhere } : {})
      },
      _count: { id: true },
      _sum: { amount: true }
    });

    // 获取所有类型的用户交易记录进行详细统计
    const allUserTransactions = await db.prisma.pointTransaction.findMany({
      where: {
        ...dateWhere,
        ...(userEmail ? { user: userWhere } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 按用户进行详细统计
    const userDetailedSummary = {};
    allUserTransactions.forEach(tx => {
      const userKey = `${tx.user.username} (${tx.user.email})`;

      if (!userDetailedSummary[userKey]) {
        userDetailedSummary[userKey] = {
          userId: tx.userId,
          username: tx.user.username,
          email: tx.user.email,
          totalConsumed: 0,     // 总消费积分
          totalRecharged: 0,    // 总充值积分  
          totalRewarded: 0,     // 总奖励积分
          programmingCount: 0,  // 编程题次数
          multipleChoiceCount: 0, // 选择题次数
          rechargeCount: 0,     // 充值次数
          operations: {}        // 保留原有的操作详情
        };
      }

      const user = userDetailedSummary[userKey];
      const amount = Math.abs(tx.amount);

      // 统计不同类型的操作
      if (tx.transactionType === 'CONSUME') {
        user.totalConsumed += amount;
        if (tx.questionType === 'PROGRAMMING') {
          user.programmingCount += 1;
        } else if (tx.questionType === 'MULTIPLE_CHOICE') {
          user.multipleChoiceCount += 1;
        }
      } else if (tx.transactionType === 'RECHARGE') {
        user.totalRecharged += amount;
        user.rechargeCount += 1;
      } else if (tx.transactionType === 'REWARD') {
        user.totalRewarded += amount;
      }

      // 保留原有的操作详情格式
      const operationType = tx.transactionType;
      if (!user.operations[operationType]) {
        user.operations[operationType] = {
          count: 0,
          totalAmount: 0
        };
      }
      user.operations[operationType].count += 1;
      user.operations[operationType].totalAmount += amount;
    });

    // 转换为数组格式，按总消费排序
    const userSpendingArray = Object.values(userDetailedSummary)
        .sort((a, b) => b.totalConsumed - a.totalConsumed);

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          activeUsers: activeUsers.length,
          totalTransactions: transactionStats._count.id || 0,
          totalAmount: transactionStats._sum.amount || 0,
          transactionsByType: transactionByType.map(item => ({
            type: item.transactionType,
            count: item._count.id,
            amount: item._sum.amount || 0
          }))
        },
        userSpending: userSpendingArray
      },
      message: '获取使用统计成功'
    });
  } catch (error) {
    console.error('获取使用统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取使用统计失败'
    });
  }
});

// =====================================
// 管理员公告管理API  
// =====================================

// 获取公告列表
app.get('/api/admin/announcements', verifySessionId, async (req, res) => {
  try {
    console.log('📢 管理员请求公告列表');

    // 检查管理员权限
    const userId = req.user.userId;
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    console.log('🔍 开始查询公告数据...');

    let announcements;

    // 检查 announcement 模型是否存在，如果不存在则使用原始SQL查询
    if (!db.prisma.announcement) {
      console.log('⚠️ Announcement模型不存在，使用原始SQL查询');

      // 使用原始SQL查询作为临时解决方案
      announcements = await db.prisma.$queryRaw`
        SELECT
          id,
          title,
          content,
          is_active as isActive,
          priority,
          show_style as showStyle,
          start_time as startTime,
          end_time as endTime,
          created_by as createdBy,
          created_at as createdAt,
          updated_at as updatedAt
        FROM announcements
        ORDER BY created_at DESC
      `;

      console.log(`✅ 通过原始SQL查询到 ${announcements.length} 条公告记录`);
    } else {
      console.log('✅ 使用Prisma模型查询');
      announcements = await db.prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' }
      });
      console.log(`✅ 成功查询到 ${announcements.length} 条公告记录`);
    }

    res.json({
      success: true,
      data: {
        announcements,
        total: announcements.length
      },
      message: '获取公告列表成功'
    });
  } catch (error) {
    console.error('获取公告列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取公告列表失败'
    });
  }
});

// 创建公告
app.post('/api/admin/announcements', verifySessionId, async (req, res) => {
  try {
    console.log('🆕 管理员创建公告');

    // 检查管理员权限
    const userId = req.user.userId;
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { title, content, showStyle = 'info', isActive = true, priority = 0, startTime, endTime } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: '标题和内容不能为空'
      });
    }

    let announcement;

    if (!db.prisma.announcement) {
      console.log('⚠️ 使用原始SQL创建公告');

      // 使用原始SQL插入
      const result = await db.prisma.$executeRaw`
        INSERT INTO announcements (title, content, show_style, is_active, priority, start_time, end_time, created_at, updated_at)
        VALUES (${title}, ${content}, ${showStyle}, ${isActive}, ${parseInt(priority) || 0},
                ${startTime ? new Date(startTime) : null}, ${endTime ? new Date(endTime) : null},
                NOW(), NOW())
      `;

      // 获取插入的记录
      const [newAnnouncement] = await db.prisma.$queryRaw`
        SELECT
          id, title, content, is_active as isActive, priority, show_style as showStyle,
          start_time as startTime, end_time as endTime, created_by as createdBy,
          created_at as createdAt, updated_at as updatedAt
        FROM announcements
        ORDER BY id DESC
          LIMIT 1
      `;

      announcement = newAnnouncement;
    } else {
      announcement = await db.prisma.announcement.create({
        data: {
          title,
          content,
          showStyle,
          isActive,
          priority: parseInt(priority) || 0,
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null
        }
      });
    }

    res.json({
      success: true,
      data: {
        announcement
      },
      message: '创建公告成功'
    });
  } catch (error) {
    console.error('创建公告失败:', error);
    res.status(500).json({
      success: false,
      message: '创建公告失败'
    });
  }
});

// 更新公告
app.put('/api/admin/announcements/:id', verifySessionId, async (req, res) => {
  try {
    console.log('✏️ 管理员更新公告');

    // 检查管理员权限
    const userId = req.user.userId;
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const announcementId = parseInt(req.params.id);
    const { title, content, showStyle, isActive, priority, startTime, endTime } = req.body;

    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        message: '公告ID无效'
      });
    }

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: '标题和内容不能为空'
      });
    }

    let existingAnnouncement;
    let announcement;

    if (!db.prisma.announcement) {
      console.log('⚠️ 使用原始SQL查询和更新公告');

      // 检查公告是否存在
      const [existing] = await db.prisma.$queryRaw`
        SELECT id FROM announcements WHERE id = ${announcementId}
      `;

      existingAnnouncement = existing;

      if (!existingAnnouncement) {
        return res.status(404).json({
          success: false,
          message: '公告不存在'
        });
      }

      // 更新公告
      await db.prisma.$executeRaw`
        UPDATE announcements
        SET title = ${title}, content = ${content}, show_style = ${showStyle},
            is_active = ${isActive}, priority = ${priority !== undefined ? parseInt(priority) : 0},
            start_time = ${startTime ? new Date(startTime) : null},
            end_time = ${endTime ? new Date(endTime) : null},
            updated_at = NOW()
        WHERE id = ${announcementId}
      `;

      // 获取更新后的记录
      const [updated] = await db.prisma.$queryRaw`
        SELECT
          id, title, content, is_active as isActive, priority, show_style as showStyle,
          start_time as startTime, end_time as endTime, created_by as createdBy,
          created_at as createdAt, updated_at as updatedAt
        FROM announcements
        WHERE id = ${announcementId}
      `;

      announcement = updated;
    } else {
      // 检查公告是否存在
      existingAnnouncement = await db.prisma.announcement.findUnique({
        where: { id: announcementId }
      });

      if (!existingAnnouncement) {
        return res.status(404).json({
          success: false,
          message: '公告不存在'
        });
      }

      announcement = await db.prisma.announcement.update({
        where: { id: announcementId },
        data: {
          title,
          content,
          showStyle,
          isActive,
          priority: priority !== undefined ? parseInt(priority) : undefined,
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null
        }
      });
    }

    res.json({
      success: true,
      data: {
        announcement
      },
      message: '更新公告成功'
    });
  } catch (error) {
    console.error('更新公告失败:', error);
    res.status(500).json({
      success: false,
      message: '更新公告失败'
    });
  }
});

// 删除公告
app.delete('/api/admin/announcements/:id', verifySessionId, async (req, res) => {
  try {
    console.log('🗑️ 管理员删除公告');

    // 检查管理员权限
    const userId = req.user.userId;
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const announcementId = parseInt(req.params.id);

    if (isNaN(announcementId)) {
      return res.status(400).json({
        success: false,
        message: '公告ID无效'
      });
    }

    let existingAnnouncement;

    if (!db.prisma.announcement) {
      console.log('⚠️ 使用原始SQL查询和删除公告');

      // 检查公告是否存在
      const [existing] = await db.prisma.$queryRaw`
        SELECT id FROM announcements WHERE id = ${announcementId}
      `;

      existingAnnouncement = existing;

      if (!existingAnnouncement) {
        return res.status(404).json({
          success: false,
          message: '公告不存在'
        });
      }

      // 删除公告
      await db.prisma.$executeRaw`
        DELETE FROM announcements WHERE id = ${announcementId}
      `;
    } else {
      // 检查公告是否存在
      existingAnnouncement = await db.prisma.announcement.findUnique({
        where: { id: announcementId }
      });

      if (!existingAnnouncement) {
        return res.status(404).json({
          success: false,
          message: '公告不存在'
        });
      }

      await db.prisma.announcement.delete({
        where: { id: announcementId }
      });
    }

    res.json({
      success: true,
      message: '删除公告成功'
    });
  } catch (error) {
    console.error('删除公告失败:', error);
    res.status(500).json({
      success: false,
      message: '删除公告失败'
    });
  }
});

// 获取当前有效的公告（首页展示用）
app.get('/api/announcements/current', async (req, res) => {
  try {
    console.log('📢 获取当前有效公告');

    const now = new Date();
    let announcement = null;

    if (!db.prisma.announcement) {
      console.log('⚠️ 使用原始SQL查询当前公告');

      // 使用原始SQL查询当前有效的公告
      const [currentAnnouncement] = await db.prisma.$queryRaw`
        SELECT
          id,
          title,
          content,
          is_active as isActive,
          priority,
          show_style as showStyle,
          start_time as startTime,
          end_time as endTime,
          created_by as createdBy,
          created_at as createdAt,
          updated_at as updatedAt
        FROM announcements
        WHERE is_active = true
          AND (start_time IS NULL OR start_time <= ${now})
          AND (end_time IS NULL OR end_time >= ${now})
        ORDER BY priority DESC, created_at DESC
          LIMIT 1
      `;

      announcement = currentAnnouncement;
    } else {
      // 使用Prisma模型查询
      announcement = await db.prisma.announcement.findFirst({
        where: {
          isActive: true,
          OR: [
            { startTime: null },
            { startTime: { lte: now } }
          ],
          AND: [
            {
              OR: [
                { endTime: null },
                { endTime: { gte: now } }
              ]
            }
          ]
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    }

    console.log(`📋 找到当前公告: ${announcement ? announcement.title : '无'}`);

    res.json({
      success: true,
      data: {
        announcement
      },
      message: announcement ? '获取当前公告成功' : '暂无有效公告'
    });
  } catch (error) {
    console.error('获取当前公告失败:', error);
    res.status(500).json({
      success: false,
      message: '获取当前公告失败'
    });
  }
});

// ======================
// 管理员LLM配置API路由
// ======================

// 获取LLM配置
app.get('/api/admin/llm-config', verifySessionId, async (req, res) => {
  try {
    console.log('📡 管理员请求LLM配置');

    // 检查管理员权限
    const userId = req.user.userId;
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, username: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    console.log('✅ 管理员权限验证通过:', user.username);

    // 检查表是否存在
    const tableExists = await db.prisma.$queryRaw`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'llm_config'
    `;

    if (!tableExists[0] || tableExists[0].count === 0) {
      console.warn('⚠️ llm_config表不存在');
      return res.json({
        success: true,
        data: {
          configs: [],
          tableExists: false
        },
        message: 'llm_config表不存在，需要先创建表'
      });
    }

    // 从数据库读取所有LLM配置
    const configs = await db.prisma.$queryRaw`
      SELECT config_key, config_value, is_active, created_at, updated_at 
      FROM llm_config 
      ORDER BY config_key
    `;

    console.log('📦 数据库配置查询结果:', configs);

    // 将数组格式转换为对象格式
    const configObj = {};
    configs.forEach(config => {
      configObj[config.config_key] = {
        value: config.config_value,
        isActive: config.is_active,
        createdAt: config.created_at,
        updatedAt: config.updated_at
      };
    });

    res.json({
      success: true,
      data: {
        configs: configObj,
        tableExists: true,
        rawConfigs: configs
      },
      message: 'LLM配置获取成功'
    });
  } catch (error) {
    console.error('❌ 获取LLM配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取LLM配置失败',
      error: error.message
    });
  }
});

// 更新LLM配置
app.put('/api/admin/llm-config', verifySessionId, async (req, res) => {
  try {
    console.log('🔄 管理员更新LLM配置:', req.body);

    // 检查管理员权限
    const userId = req.user.userId;
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, username: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const { base_url, api_key } = req.body;

    // 验证输入
    if (!base_url || !api_key) {
      return res.status(400).json({
        success: false,
        message: 'base_url和api_key不能为空'
      });
    }

    // 验证URL格式
    try {
      new URL(base_url);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        message: 'base_url格式无效，请输入有效的URL'
      });
    }

    console.log('✅ 管理员权限验证通过:', user.username);

    // 检查表是否存在
    const tableExists = await db.prisma.$queryRaw`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'llm_config'
    `;

    if (!tableExists[0] || tableExists[0].count === 0) {
      console.warn('⚠️ llm_config表不存在，需要先创建表');
      return res.status(400).json({
        success: false,
        message: 'llm_config表不存在，请联系管理员创建表'
      });
    }

    // 使用事务更新配置
    const result = await db.prisma.$transaction(async (tx) => {
      // 更新base_url
      await tx.$executeRaw`
        INSERT INTO llm_config (config_key, config_value, is_active, created_at, updated_at)
        VALUES ('base_url', ${base_url}, 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
          config_value = ${base_url},
          updated_at = NOW()
      `;

      // 更新api_key
      await tx.$executeRaw`
        INSERT INTO llm_config (config_key, config_value, is_active, created_at, updated_at)
        VALUES ('api_key', ${api_key}, 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
          config_value = ${api_key},
          updated_at = NOW()
      `;

      // 查询更新后的配置
      const updatedConfigs = await tx.$queryRaw`
        SELECT config_key, config_value, is_active, updated_at 
        FROM llm_config 
        WHERE config_key IN ('base_url', 'api_key')
      `;

      return updatedConfigs;
    });

    console.log('✅ LLM配置更新成功:', result);

    res.json({
      success: true,
      data: {
        updatedConfigs: result,
        message: 'LLM配置更新成功'
      },
      message: `LLM配置更新成功 - base_url: ${base_url}`
    });
  } catch (error) {
    console.error('❌ 更新LLM配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新LLM配置失败',
      error: error.message
    });
  }
});

// 使用充值路由
app.use('/api/recharge', rechargeRoutes);
app.use('/api/payment/wechat', wechatCallbackRoutes);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});