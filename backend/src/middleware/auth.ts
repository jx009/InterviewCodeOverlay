import { Response, NextFunction, Request } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { AuthUtils } from '../utils/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// JWT认证中间件
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = AuthUtils.extractBearerToken(authHeader);

  if (!token) {
    res.status(401).json({
      success: false,
      error: '未提供访问令牌'
    });
    return;
  }

  const decoded = AuthUtils.verifyAccessToken(token);
  if (!decoded) {
    res.status(401).json({
      success: false,
      error: '访问令牌无效或已过期'
    });
    return;
  }

  // 转换为简化的用户信息格式
  req.user = { userId: decoded.id };
  next();
};

// 简化的认证中间件（Cursor式）
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供访问令牌' });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    res.status(401).json({ error: '访问令牌无效或已过期' });
    return;
  }
};

// 可选的JWT认证中间件（用于不强制要求登录的路由）
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = AuthUtils.extractBearerToken(authHeader);

  if (token) {
    const decoded = AuthUtils.verifyAccessToken(token);
    if (decoded) {
      // 转换为简化的用户信息格式
      req.user = { userId: decoded.id };
    }
  }

  next();
}; 