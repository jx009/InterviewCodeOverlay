// 支付模块身份验证中间件
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../../types';

// 定义API响应接口
interface ApiResponse {
  success: boolean;
  error?: string;
  message?: string;
  [key: string]: any;
}

/**
 * JWT身份验证中间件
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  console.log('🔒 支付模块认证检查...');
  
  // 检查Session ID
  const sessionId = req.headers['x-session-id'] as string;
  if (sessionId) {
    console.log('📝 存在会话ID，尝试获取会话状态');
    // 从SessionManager获取userId，使用内存会话中心验证
    try {
      // 导入SessionManager
      const { getRedisClient } = require('../../config/redis-working');
      const { SessionManager } = require('../../config/redis-working');
      
      // 尝试初始化Redis连接
      try {
        const { initRedis } = require('../../config/redis-working');
        await initRedis();
        console.log('✅ Redis连接已初始化');
      } catch (redisError) {
        console.error('⚠️ Redis连接初始化失败，尝试使用现有连接:', redisError);
      }
      
      const sessionManager = new SessionManager();
      
      // 验证会话有效性
      const sessionValidation = await sessionManager.validateSession(sessionId);
      if (sessionValidation.valid) {
        // 设置用户信息
        req.user = { userId: sessionValidation.userId };
        console.log('✅ 会话验证成功:', { userId: sessionValidation.userId, sessionId });
        next();
        return;
      } else {
        console.log('❌ 会话无效，尝试其他认证方式');
      }
    } catch (error) {
      console.error('❌ 会话验证异常:', error);
    }
  }
  
  // 检查Authorization头
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  console.log('🔑 认证头信息:', { 
    hasAuthHeader: !!authHeader, 
    hasToken: !!token 
  });

  if (!token) {
    console.log('❌ 未提供访问令牌');
    res.status(401).json({
      success: false,
      error: '未提供访问令牌'
    });
    return;
  }

  try {
    // 从token中提取用户ID
    const decoded = verifyAccessToken(token);
    
    if (!decoded || !decoded.userId) {
      console.log('❌ 无效的访问令牌');
      res.status(401).json({
        success: false,
        error: '访问令牌无效或已过期'
      });
      return;
    }
    
    console.log('✅ 用户认证成功:', { userId: decoded.userId });
    // 设置用户信息
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    console.error('❌ 令牌验证失败:', error);
    res.status(401).json({
      success: false,
      error: '访问令牌无效或已过期'
    });
  }
};

// 提取Bearer令牌
function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // 移除'Bearer '前缀
}

// 验证访问令牌
function verifyAccessToken(token: string): { userId: number } | null {
  try {
    // 实际JWT验证逻辑，使用正确的密钥
    const jwtSecret = process.env.JWT_SECRET || 'default_secret_key_for_interview_overlay';
    // 提取信息并转换为标准格式
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // 兼容不同的JWT格式，有的用id字段，有的用userId字段
    return { 
      userId: decoded.userId || decoded.id || 0
    };
  } catch (error) {
    console.error('访问令牌验证失败:', error);
    return null;
  }
}

/**
 * 可选的身份验证中间件（允许匿名访问）
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // 没有令牌，允许匿名访问
      next();
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    
    jwt.verify(token, jwtSecret, (err: any, decoded: any) => {
      if (err) {
        // 令牌无效，但允许匿名访问
        console.warn('⚠️ 可选身份验证失败，允许匿名访问:', err.message);
        next();
        return;
      }

      // 设置符合类型的用户信息
      req.user = {
        userId: decoded.userId || decoded.id || 0
      };

      console.log('✅ 可选身份验证成功:', req.user.userId);
      next();
    });

  } catch (error: any) {
    console.error('❌ 可选身份验证中间件异常:', error);
    // 异常情况下也允许匿名访问
    next();
  }
};

/**
 * 管理员权限验证中间件
 */
export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    // 查询用户角色来确定是否为管理员
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    }) as any;

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    console.log(`✅ 管理员权限验证成功: ${user.username} (角色: ${user.role})`);
    next();

  } catch (error: any) {
    console.error('❌ 管理员权限验证异常:', error);
    
    res.status(500).json({
      success: false,
      message: '权限验证失败'
    });
  }
};

/**
 * 速率限制中间件（简单实现）
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      
      const clientData = requestCounts.get(clientId);
      
      if (!clientData || now > clientData.resetTime) {
        // 重置计数器
        requestCounts.set(clientId, {
          count: 1,
          resetTime: now + windowMs
        });
        next();
        return;
      }
      
      if (clientData.count >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: '请求过于频繁，请稍后再试'
        });
      }
      
      clientData.count++;
      next();

    } catch (error: any) {
      console.error('❌ 速率限制中间件异常:', error);
      next(); // 出错时不阻止请求
    }
  };
};

export { AuthenticatedRequest }; 