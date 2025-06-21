import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma, getConfig } from '../config/database';
import { SessionManager, VerificationManager, getRedisClient } from '../config/redis-working';
import { initEmailTransporter, EmailService } from '../utils/email-service';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const router = Router();

// 初始化管理器
let sessionManager: SessionManager;
let verificationManager: VerificationManager;

// 初始化增强认证服务
export const initAuthEnhanced = async () => {
  try {
    // 确保Redis已连接
    const redis = getRedisClient();
    
    // 初始化管理器
    sessionManager = new SessionManager();
    verificationManager = new VerificationManager();
    
    // 初始化邮件服务
    await initEmailTransporter();
    
    console.log('✅ 增强认证服务初始化成功');
  } catch (error) {
    console.error('❌ 增强认证服务初始化失败:', error);
    throw error;
  }
};

// 验证规则
const emailValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail()
];

const verificationValidation = [
  body('token').notEmpty().withMessage('验证token不能为空'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('验证码必须是6位数字')
    .isNumeric()
    .withMessage('验证码只能包含数字')
];

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度应在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6个字符'),
  body('token').notEmpty().withMessage('验证token不能为空'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('验证码必须是6位数字')
    .isNumeric()
    .withMessage('验证码只能包含数字')
];

const loginValidation = [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
];

// 获取客户端IP地址
const getClientIP = (req: Request): string => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection as any)?.socket?.remoteAddress ||
         req.headers['x-forwarded-for'] as string ||
         req.headers['x-real-ip'] as string ||
         'unknown';
};

// 🚀 第一步：发送邮箱验证码
router.post('/send-verification-code', emailValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        error: '输入验证失败',
        details: errors.array()
      });
      return;
    }

    const { email } = req.body;

    // 检查邮箱是否已有未过期的验证码
    const hasValidCode = await verificationManager.hasValidCode(email);
    if (hasValidCode) {
      const ttl = await verificationManager.getCodeTTL(email);
      res.status(429).json({ 
        success: false,
        error: `验证码已发送，请等待 ${Math.ceil(ttl / 60)} 分钟后重试`,
        waitTime: ttl * 1000
      });
      return;
    }

    // 检查是否是已注册用户（用于不同提示）
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    // 生成验证码和Token
    const { code, token } = await verificationManager.createVerificationCode(email);
    
    // 发送邮件
    const emailSent = await EmailService.sendVerificationCode(email, code);
    
    if (!emailSent) {
      res.status(500).json({ 
        success: false,
        error: '验证码邮件发送失败，请稍后重试'
      });
      return;
    }

    res.json({
      success: true,
      message: '验证码已发送到您的邮箱',
      token, // 前端需要保存这个token用于后续验证
      expiresIn: 5 * 60, // 5分钟
      isExistingUser: !!existingUser
    });

  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 🔍 第二步：验证验证码（可选的预验证步骤）
router.post('/verify-code', verificationValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        error: '输入验证失败',
        details: errors.array()
      });
      return;
    }

    const { token, code } = req.body;

    const verifyResult = await verificationManager.verifyCode(token, code);
    
    if (!verifyResult.valid) {
      res.status(400).json({ 
        success: false,
        error: verifyResult.error
      });
      return;
    }

    res.json({
      success: true,
      message: '验证码验证成功',
      email: verifyResult.email
    });

  } catch (error) {
    console.error('验证码验证失败:', error);
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 📝 第三步：完整注册流程
router.post('/register', registerValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        error: '输入验证失败',
        details: errors.array()
      });
      return;
    }

    const { email, username, password, token, code } = req.body;
    const config = getConfig();

    // 1. 验证邮箱验证码
    const verifyResult = await verificationManager.verifyCode(token, code);
    if (!verifyResult.valid) {
      res.status(400).json({ 
        success: false,
        error: verifyResult.error || '验证码验证失败'
      });
      return;
    }

    if (verifyResult.email !== email) {
      res.status(400).json({ 
        success: false,
        error: '邮箱与验证码不匹配'
      });
      return;
    }

    // 2. 检查用户是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      res.status(400).json({ 
        success: false,
        error: existingUser.email === email ? '该邮箱已被注册' : '用户名已被使用'
      });
      return;
    }

    // 3. 创建用户
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword
      }
    });

    // 4. 创建用户配置
    await prisma.userConfig.create({
      data: {
        userId: user.id,
        aiModel: 'claude-3-5-sonnet-20241022',
        language: 'python',
        theme: 'system'
      }
    });

    // 5. 创建会话
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = getClientIP(req);
    const sessionId = await sessionManager.createSession(user.id, userAgent, ipAddress);

    // 6. 生成JWT token
    const jwtToken = jwt.sign({ userId: user.id }, config.security.jwtSecret, { expiresIn: '7d' });

    // 7. 发送欢迎邮件（异步，不影响注册结果）
    EmailService.sendWelcomeEmail(email, username).catch(error => {
      console.error('发送欢迎邮件失败:', error);
    });

    res.status(201).json({
      success: true,
      message: '注册成功！',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      },
      token: jwtToken,
      sessionId
    });

  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 🔐 增强登录流程
router.post('/login', loginValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false,
        error: '输入验证失败',
        details: errors.array()
      });
      return;
    }

    const { username, password } = req.body;
    const config = getConfig();

    // 1. 查找用户
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ]
      }
    });

    if (!user) {
      res.status(401).json({ 
        success: false,
        error: '用户名或密码错误'
      });
      return;
    }

    // 2. 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ 
        success: false,
        error: '用户名或密码错误'
      });
      return;
    }

    // 3. 创建会话（30位随机字符串）
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = getClientIP(req);
    const sessionId = await sessionManager.createSession(user.id, userAgent, ipAddress);

    // 4. 生成JWT token
    const jwtToken = jwt.sign({ userId: user.id }, config.security.jwtSecret, { expiresIn: '7d' });

    // 5. 设置Cookie（可选）
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
    });

    res.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      },
      token: jwtToken,
      sessionId
    });

  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 🚪 增强登出流程
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.body.sessionId || req.cookies.session_id;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (sessionId) {
      await sessionManager.deleteSession(sessionId);
    }

    // 清除Cookie
    res.clearCookie('session_id');

    res.json({
      success: true,
      message: '登出成功'
    });

  } catch (error) {
    console.error('登出失败:', error);
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 🔍 检查会话状态
router.get('/session-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.query.sessionId as string || req.cookies.session_id;
    
    if (!sessionId) {
      res.json({
        authenticated: false,
        message: '未找到会话ID'
      });
      return;
    }

    const sessionValidation = await sessionManager.validateSession(sessionId);
    
    if (!sessionValidation.valid) {
      res.json({
        authenticated: false,
        message: '会话已过期或无效'
      });
      return;
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: sessionValidation.userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      }
    });

    if (!user) {
      res.json({
        authenticated: false,
        message: '用户不存在'
      });
      return;
    }

    res.json({
      authenticated: true,
      user,
      sessionId
    });

  } catch (error) {
    console.error('检查会话状态失败:', error);
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 🔄 刷新会话
router.post('/refresh-session', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      res.status(400).json({ 
        success: false,
        error: '会话ID不能为空'
      });
      return;
    }

    const sessionData = await sessionManager.getSession(sessionId);
    
    if (!sessionData) {
      res.status(401).json({ 
        success: false,
        error: '会话已过期或无效'
      });
      return;
    }

    res.json({
      success: true,
      message: '会话已刷新',
      sessionData: {
        userId: sessionData.userId,
        lastActivity: sessionData.lastActivity
      }
    });

  } catch (error) {
    console.error('刷新会话失败:', error);
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误'
    });
  }
});

export default router; 