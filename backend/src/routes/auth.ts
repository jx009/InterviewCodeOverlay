import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma, getConfig } from '../config/database';
import { AuthUtils } from '../utils/auth';
import { ResponseUtils } from '../utils/response';
import { LoginRequest, RegisterRequest, AuthenticatedRequest } from '../types';
import { authenticateToken } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { authMiddleware } from '../middleware/auth';
// import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 健康检查路由
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'InterviewCodeOverlay API' 
  });
});

// 注册验证规则
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度应在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6个字符'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式不正确')
];

// 登录验证规则
const loginValidation = [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
];

// 用户注册
router.post('/register', registerValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        error: '输入验证失败',
        details: errors.array()
      });
      return;
    }

    const { username, email, password } = req.body;
    const config = getConfig();

    // 检查用户是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      res.status(400).json({ error: '用户名或邮箱已存在' });
      return;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword
      }
    });

    // 创建用户配置
    await prisma.userConfig.create({
      data: {
        userId: user.id,
        aiModel: 'claude-3-5-sonnet-20241022',
        language: 'python',
        theme: 'system'
      }
    });

    // 生成JWT token
    const token = jwt.sign({ userId: user.id }, config.security.jwtSecret, { expiresIn: '7d' });

    res.status(201).json({
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 用户登录
router.post('/login', loginValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        error: '输入验证失败',
        details: errors.array()
      });
      return;
    }

    const { username, password } = req.body;
    const config = getConfig();

    // 查找用户
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ]
      }
    });

    if (!user) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    // 生成JWT token
    const token = jwt.sign({ userId: user.id }, config.security.jwtSecret, { expiresIn: '7d' });

    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// OAuth登录回调处理（简化版）
router.post('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, provider = 'github' } = req.body;
    const config = getConfig();
    
    // 这里简化处理，实际项目中需要与OAuth提供商交换token
    // 为了演示，我们创建一个临时用户
    let user = await prisma.user.findFirst({
      where: { email: `demo@${provider}.com` }
    });

    if (!user) {
      // 创建演示用户
      user = await prisma.user.create({
        data: {
          username: `demo_${provider}_user`,
          email: `demo@${provider}.com`,
          password: await bcrypt.hash('demo_password', config.security.bcryptRounds)
        }
      });

      // 创建用户配置
      await prisma.userConfig.create({
        data: {
          userId: user.id,
          aiModel: 'claude-3-5-sonnet-20241022',
          language: 'python',
          theme: 'system'
        }
      });
    }

    // 生成JWT token
    const token = jwt.sign({ userId: user.id }, config.security.jwtSecret, { expiresIn: '7d' });

    res.json({
      message: 'OAuth登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('OAuth登录错误:', error);
    res.status(500).json({ error: 'OAuth登录失败' });
  }
});

// Token验证接口
router.get('/verify', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: '用户未认证' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        isActive: true
      }
    });

    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ error: '用户账户已被禁用' });
      return;
    }

    res.json({
      message: 'Token验证成功',
      user
    });
  } catch (error) {
    console.error('Token验证错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: '用户未认证' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        isActive: true
      }
    });

    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 用户登出
router.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  // 在实际项目中，这里可能需要将token加入黑名单
  // 或者处理refresh token的撤销
  res.json({ message: '登出成功' });
});

// 刷新token
router.post('/refresh', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: '用户未认证' });
      return;
    }

    const config = getConfig();

    // 生成新的token
    const newToken = jwt.sign({ userId: req.user.userId }, config.security.jwtSecret, { expiresIn: '7d' });
    
    res.json({
      message: 'Token刷新成功',
      token: newToken
    });
  } catch (error) {
    console.error('Token刷新错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router; 