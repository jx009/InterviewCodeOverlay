import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { AuthUtils } from '../utils/auth';
import { ResponseUtils } from '../utils/response';
import { LoginRequest, RegisterRequest, AuthenticatedRequest } from '../types';
import { authenticateToken } from '../middleware/auth';
// import { v4 as uuidv4 } from 'uuid';

const router = Router();

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
router.post('/register', registerValidation, async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtils.validationError(res, errors.array().map(err => err.msg));
    }

    const { username, password, email } = req.body;

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return ResponseUtils.error(res, '用户名已存在', 409);
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      });

      if (existingEmail) {
        return ResponseUtils.error(res, '邮箱已被使用', 409);
      }
    }

    // 创建新用户
    const hashedPassword = await AuthUtils.hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null
      }
    });

    // 创建用户默认配置
    await prisma.userConfig.create({
      data: {
        userId: user.id,
        selectedProvider: 'claude',
        extractionModel: 'claude-3-7-sonnet-20250219',
        solutionModel: 'claude-3-7-sonnet-20250219',
        debuggingModel: 'claude-3-7-sonnet-20250219',
        language: 'python'
      }
    });

    ResponseUtils.success(res, {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    }, '用户注册成功');

  } catch (error) {
    console.error('注册错误:', error);
    ResponseUtils.internalError(res);
  }
});

// 用户登录
router.post('/login', loginValidation, async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtils.validationError(res, errors.array().map(err => err.msg));
    }

    const { username, password } = req.body;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || !user.isActive) {
      return ResponseUtils.unauthorized(res, '用户名或密码错误');
    }

    // 验证密码
    const isValidPassword = await AuthUtils.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return ResponseUtils.unauthorized(res, '用户名或密码错误');
    }

    // 生成tokens
    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    const accessToken = AuthUtils.generateAccessToken(userPayload);
    const refreshToken = AuthUtils.generateRefreshToken(userPayload);

    // 保存session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: AuthUtils.getTokenExpirationDate()
      }
    });

    ResponseUtils.success(res, {
      token: accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      user: userPayload
    }, '登录成功');

  } catch (error) {
    console.error('登录错误:', error);
    ResponseUtils.internalError(res);
  }
});

// 刷新token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ResponseUtils.error(res, '未提供刷新令牌', 400);
    }

    // 验证刷新token
    const decoded = AuthUtils.verifyRefreshToken(refreshToken);
    if (!decoded) {
      return ResponseUtils.unauthorized(res, '刷新令牌无效');
    }

    // 查找session
    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: true }
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return ResponseUtils.unauthorized(res, '刷新令牌已过期');
    }

    // 生成新的tokens
    const userPayload = {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email
    };

    const newAccessToken = AuthUtils.generateAccessToken(userPayload);
    const newRefreshToken = AuthUtils.generateRefreshToken(userPayload);

    // 更新session
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: AuthUtils.getTokenExpirationDate()
      }
    });

    ResponseUtils.success(res, {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      user: userPayload
    });

  } catch (error) {
    console.error('刷新token错误:', error);
    ResponseUtils.internalError(res);
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return ResponseUtils.notFound(res, '用户不存在');
    }

    ResponseUtils.success(res, user);

  } catch (error) {
    console.error('获取用户信息错误:', error);
    ResponseUtils.internalError(res);
  }
});

// 用户登出
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractBearerToken(authHeader);

    if (token) {
      // 标记session为非活跃状态
      await prisma.userSession.updateMany({
        where: { 
          userId: req.user!.id,
          token: token
        },
        data: {
          isActive: false
        }
      });
    }

    ResponseUtils.success(res, null, '登出成功');

  } catch (error) {
    console.error('登出错误:', error);
    ResponseUtils.internalError(res);
  }
});

export default router; 