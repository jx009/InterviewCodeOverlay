import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserPayload } from '../types';

// 🔒 安全修复：确保JWT密钥必须从环境变量获取，不允许默认值
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// 🔒 安全检查：如果JWT密钥未配置，抛出错误
if (!JWT_SECRET) {
  throw new Error('🔒 安全错误: JWT_SECRET 环境变量未配置！请在 .env 文件中设置强随机密钥');
}

if (!JWT_REFRESH_SECRET) {
  throw new Error('🔒 安全错误: JWT_REFRESH_SECRET 环境变量未配置！请在 .env 文件中设置强随机密钥');
}

console.log('✅ JWT密钥配置检查通过');

export class AuthUtils {
  // 生成访问token
  static generateAccessToken(payload: UserPayload): string {
    return jwt.sign(payload as any, JWT_SECRET as string, {
      expiresIn: JWT_EXPIRES_IN,
    } as any);
  }

  // 生成刷新token
  static generateRefreshToken(payload: UserPayload): string {
    return jwt.sign(payload as any, JWT_REFRESH_SECRET as string, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    } as any);
  }

  // 验证访问token
  static verifyAccessToken(token: string): UserPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET as string) as UserPayload;
    } catch (error) {
      return null;
    }
  }

  // 验证刷新token
  static verifyRefreshToken(token: string): UserPayload | null {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET as string) as UserPayload;
    } catch (error) {
      return null;
    }
  }

  // 哈希密码
  static async hashPassword(password: string): Promise<string> {
    // 🔒 安全增强：使用12轮bcrypt加密（高强度）
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // 验证密码
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // 生成token过期时间
  static getTokenExpirationDate(): Date {
    const now = new Date();
    const expirationTime = JWT_EXPIRES_IN;
    
    if (expirationTime.endsWith('h')) {
      const hours = parseInt(expirationTime.slice(0, -1));
      now.setHours(now.getHours() + hours);
    } else if (expirationTime.endsWith('d')) {
      const days = parseInt(expirationTime.slice(0, -1));
      now.setDate(now.getDate() + days);
    } else if (expirationTime.endsWith('m')) {
      const minutes = parseInt(expirationTime.slice(0, -1));
      now.setMinutes(now.getMinutes() + minutes);
    }
    
    return now;
  }

  // 生成刷新token过期时间
  static getRefreshTokenExpirationDate(): Date {
    const now = new Date();
    const expirationTime = JWT_REFRESH_EXPIRES_IN;
    
    if (expirationTime.endsWith('h')) {
      const hours = parseInt(expirationTime.slice(0, -1));
      now.setHours(now.getHours() + hours);
    } else if (expirationTime.endsWith('d')) {
      const days = parseInt(expirationTime.slice(0, -1));
      now.setDate(now.getDate() + days);
    } else if (expirationTime.endsWith('m')) {
      const minutes = parseInt(expirationTime.slice(0, -1));
      now.setMinutes(now.getMinutes() + minutes);
    }
    
    return now;
  }

  // 从Bearer token中提取token
  static extractBearerToken(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
} 