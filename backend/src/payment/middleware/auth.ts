// 支付模块身份验证中间件
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../../types';
import { validateSession } from '../../config/session';
import { getConfig } from '../../config/database';

// 定义API响应接口
interface ApiResponse {
  success: boolean;
  error?: string;
  message?: string;
  [key: string]: any;
}

/**
 * JWT身份验证中间件 - 支持sessionId和JWT token双重认证
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  console.log('🔒 支付模块认证检查...');
  
  try {
    // 首先检查req.user是否已经设置（通过上级中间件）
    if (req.user?.userId) {
      console.log('✅ 用户已通过上级中间件认证:', req.user.userId);
      next();
      return;
    }

    // 尝试JWT token认证
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const config = getConfig();
        const decoded = jwt.verify(token, config.security.jwtSecret) as { userId: number };
        
        req.user = { userId: decoded.userId };
        console.log(`✅ 支付模块JWT认证成功: userId=${decoded.userId}`);
        next();
        return;
      } catch (jwtError: any) {
        console.log('⚠️ JWT token验证失败，尝试sessionId认证:', jwtError.message);
      }
    }

    // 如果JWT认证失败，尝试sessionId认证
    const sessionId = req.headers['x-session-id'] as string || req.cookies?.session_id;
    
    if (!sessionId) {
      console.log('❌ 未找到sessionId和有效的JWT token');
      res.status(401).json({
        success: false,
        error: '未提供访问令牌'
      });
      return;
    }

    // 使用统一的会话验证服务
    console.log('🔄 验证会话...');
    const sessionData = await validateSession(sessionId);
    
    if (!sessionData) {
      console.log('❌ 会话验证失败或已过期');
      res.status(401).json({
        success: false,
        error: '会话已过期或无效'
      });
      return;
    }
    
    // 设置用户信息
    req.user = {
      userId: sessionData.userId
    };
    
    console.log(`✅ 支付模块会话认证成功: userId=${sessionData.userId}, username=${sessionData.username}`);
    next();
    
  } catch (error) {
    console.error('❌ 支付模块认证失败:', error);
    res.status(500).json({
      success: false,
      error: '认证服务异常'
    });
    return;
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
    return next();

  } catch (error: any) {
    console.error('❌ 管理员权限验证异常:', error);
    
    return res.status(500).json({
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
        return next();
      }
      
      if (clientData.count >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: '请求过于频繁，请稍后再试'
        });
      }
      
      clientData.count++;
      return next();

    } catch (error: any) {
      console.error('❌ 速率限制中间件异常:', error);
      return next(); // 出错时不阻止请求
    }
  };
};

export { AuthenticatedRequest }; 