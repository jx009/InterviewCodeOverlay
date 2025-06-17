import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { AuthUtils } from '../utils/auth';

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

  req.user = decoded;
  next();
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
      req.user = decoded;
    }
  }

  next();
}; 