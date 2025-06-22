import { createClient, RedisClientType } from 'redis';
import { getConfig } from './database';

// Redis客户端实例
let redisClient: RedisClientType | null = null;

// Redis连接配置
const getRedisConfig = () => {
  const config = getConfig();
  return {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 300,
    maxRetriesPerRequest: 3,
  };
};

// 初始化Redis连接
export const initRedis = async (): Promise<RedisClientType> => {
  try {
    if (redisClient) {
      return redisClient;
    }

    const config = getRedisConfig();
    redisClient = createClient(config);

    redisClient.on('connect', () => {
      console.log('✅ Redis连接成功');
    });

    redisClient.on('error', (err: any) => {
      console.error('❌ Redis连接错误:', err);
    });

    redisClient.on('ready', () => {
      console.log('🚀 Redis已准备就绪');
    });

    // 连接Redis
    await redisClient.connect();
    
    // 测试连接
    await redisClient.ping();
    console.log('🔄 Redis连接测试成功');

    return redisClient;
  } catch (error) {
    console.error('❌ Redis初始化失败:', error);
    throw error;
  }
};

// 获取Redis客户端
export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis客户端未初始化，请先调用initRedis()');
  }
  return redisClient;
};

// 关闭Redis连接
export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('🔌 Redis连接已关闭');
  }
};

// Session管理工具类
export class SessionManager {
  private redis: RedisClientType;
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly SESSION_EXPIRE_TIME = 7 * 24 * 60 * 60; // 7天（秒）

  constructor() {
    this.redis = getRedisClient();
  }

  // 生成30位随机session_id
  private generateSessionId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 30; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 创建会话
  async createSession(userId: number, userAgent?: string, ipAddress?: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const sessionData = {
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      userAgent: userAgent || '',
      ipAddress: ipAddress || '',
    };

    // 存储会话数据
    await this.redis.setEx(
      `${this.SESSION_PREFIX}${sessionId}`,
      this.SESSION_EXPIRE_TIME,
      JSON.stringify(sessionData)
    );

    // 将session_id添加到用户的会话列表
    await this.redis.sAdd(`${this.USER_SESSIONS_PREFIX}${userId}`, sessionId);

    console.log(`✅ 为用户 ${userId} 创建会话: ${sessionId}`);
    return sessionId;
  }

  // 获取会话信息
  async getSession(sessionId: string): Promise<any> {
    const sessionData = await this.redis.get(`${this.SESSION_PREFIX}${sessionId}`);
    if (!sessionData) {
      return null;
    }

    const parsed = JSON.parse(sessionData);
    
    // 更新最后活动时间
    parsed.lastActivity = new Date().toISOString();
    await this.redis.setEx(
      `${this.SESSION_PREFIX}${sessionId}`,
      this.SESSION_EXPIRE_TIME,
      JSON.stringify(parsed)
    );

    return parsed;
  }

  // 删除会话
  async deleteSession(sessionId: string): Promise<void> {
    // 获取会话信息以便从用户会话列表中移除
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      await this.redis.sRem(`${this.USER_SESSIONS_PREFIX}${sessionData.userId}`, sessionId);
    }

    await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);
    console.log(`🗑️ 会话已删除: ${sessionId}`);
  }

  // 删除用户的所有会话
  async deleteUserSessions(userId: number): Promise<void> {
    const sessionIds = await this.redis.sMembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
    
    if (sessionIds.length > 0) {
      // 删除所有会话数据
      for (const sessionId of sessionIds) {
        await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);
      }
      
      // 删除用户会话列表
      await this.redis.del(`${this.USER_SESSIONS_PREFIX}${userId}`);
      
      console.log(`🗑️ 用户 ${userId} 的所有会话已删除`);
    }
  }

  // 验证会话
  async validateSession(sessionId: string): Promise<{ valid: boolean; userId?: number }> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: sessionData.userId,
    };
  }

  // 获取用户活跃会话数量
  async getUserSessionCount(userId: number): Promise<number> {
    return await this.redis.sCard(`${this.USER_SESSIONS_PREFIX}${userId}`);
  }
}

// 验证码管理工具类
export class VerificationManager {
  private redis: RedisClientType;
  private readonly CODE_PREFIX = 'verify_code:';
  private readonly TOKEN_PREFIX = 'verify_token:';
  private readonly CODE_EXPIRE_TIME = 5 * 60; // 5分钟（秒）
  private readonly TOKEN_EXPIRE_TIME = 30 * 60; // 30分钟（秒）

  constructor() {
    this.redis = getRedisClient();
  }

  // 生成6位数字验证码
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 生成验证token
  private generateVerificationToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 创建验证码
  async createVerificationCode(email: string): Promise<{ code: string; token: string }> {
    const code = this.generateVerificationCode();
    const token = this.generateVerificationToken();

    const codeData = {
      email,
      code,
      token,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };

    // 存储验证码（通过email查找）
    await this.redis.setex(
      `${this.CODE_PREFIX}${email}`,
      this.CODE_EXPIRE_TIME,
      JSON.stringify(codeData)
    );

    // 存储token关联（通过token查找）
    await this.redis.setex(
      `${this.TOKEN_PREFIX}${token}`,
      this.TOKEN_EXPIRE_TIME,
      JSON.stringify(codeData)
    );

    console.log(`📧 为邮箱 ${email} 生成验证码: ${code}`);
    return { code, token };
  }

  // 验证验证码
  async verifyCode(token: string, inputCode: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    try {
      const tokenData = await this.redis.get(`${this.TOKEN_PREFIX}${token}`);
      if (!tokenData) {
        return { valid: false, error: '验证码已过期或无效' };
      }

      const data = JSON.parse(tokenData);
      
      // 增加尝试次数
      data.attempts = (data.attempts || 0) + 1;

      // 检查尝试次数限制
      if (data.attempts > 5) {
        await this.redis.del(`${this.CODE_PREFIX}${data.email}`);
        await this.redis.del(`${this.TOKEN_PREFIX}${token}`);
        return { valid: false, error: '验证码尝试次数过多，请重新获取' };
      }

      // 验证码比对
      if (data.code !== inputCode) {
        // 更新尝试次数
        await this.redis.setex(
          `${this.TOKEN_PREFIX}${token}`,
          this.TOKEN_EXPIRE_TIME,
          JSON.stringify(data)
        );
        return { valid: false, error: `验证码错误，还可尝试 ${5 - data.attempts} 次` };
      }

      // 验证成功，删除验证码数据
      await this.redis.del(`${this.CODE_PREFIX}${data.email}`);
      await this.redis.del(`${this.TOKEN_PREFIX}${token}`);

      return { valid: true, email: data.email };

    } catch (error) {
      console.error('验证码验证错误:', error);
      return { valid: false, error: '验证过程中出现错误' };
    }
  }

  // 检查邮箱是否有未过期的验证码
  async hasValidCode(email: string): Promise<boolean> {
    const exists = await this.redis.exists(`${this.CODE_PREFIX}${email}`);
    return exists === 1;
  }

  // 获取验证码剩余时间
  async getCodeTTL(email: string): Promise<number> {
    return await this.redis.ttl(`${this.CODE_PREFIX}${email}`);
  }
} 