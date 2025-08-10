import { createClient, RedisClientType } from 'redis';

// Redis客户端实例
let redisClient: RedisClientType | null = null;

// 初始化Redis连接
export const initRedis = async (): Promise<RedisClientType> => {
  try {
    if (redisClient) {
      return redisClient;
    }

    // 创建Redis客户端 - 使用用户指定的6379端口
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000
      }
    });

    // 连接事件
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
    try {
      await redisClient.quit();
    } catch (error) {
      console.log('Redis连接关闭时出现错误，忽略');
    }
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
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // 创建验证码
  async createVerificationCode(email: string): Promise<{ code: string; token: string }> {
    const code = this.generateVerificationCode();
    const token = this.generateVerificationToken();
    
    const codeData = {
      code,
      email,
      attempts: 0,
      createdAt: new Date().toISOString(),
      token
    };

    // 存储验证码数据（双重存储便于查找）
    await this.redis.setEx(
      `${this.CODE_PREFIX}${email}`,
      this.CODE_EXPIRE_TIME,
      JSON.stringify(codeData)
    );

    await this.redis.setEx(
      `${this.TOKEN_PREFIX}${token}`,
      this.TOKEN_EXPIRE_TIME,
      JSON.stringify(codeData)
    );

    console.log(`✅ 为邮箱 ${email} 创建验证码: ${code}`);
    return { code, token };
  }

  // 验证验证码
  async verifyCode(token: string, inputCode: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    try {
      const tokenData = await this.redis.get(`${this.TOKEN_PREFIX}${token}`);
      if (!tokenData) {
        return { valid: false, error: '验证码已过期或不存在' };
      }

      const data = JSON.parse(tokenData);
      
      // 检查尝试次数
      if (data.attempts >= 5) {
        return { valid: false, error: '验证尝试次数过多，请重新获取验证码' };
      }

      // 验证码不匹配
      if (data.code !== inputCode) {
        // 增加尝试次数
        data.attempts++;
        await this.redis.setEx(
          `${this.TOKEN_PREFIX}${token}`,
          this.TOKEN_EXPIRE_TIME,
          JSON.stringify(data)
        );
        
        return { 
          valid: false, 
          error: `验证码错误，还可以尝试 ${5 - data.attempts} 次` 
        };
      }

      // 验证成功，删除验证码
      await this.redis.del(`${this.CODE_PREFIX}${data.email}`);
      await this.redis.del(`${this.TOKEN_PREFIX}${token}`);

      console.log(`✅ 邮箱 ${data.email} 验证码验证成功`);
      return { valid: true, email: data.email };

    } catch (error) {
      console.error('验证码验证过程出错:', error);
      return { valid: false, error: '验证过程出现错误' };
    }
  }

  // 检查邮箱是否有有效验证码
  async hasValidCode(email: string): Promise<boolean> {
    const codeData = await this.redis.get(`${this.CODE_PREFIX}${email}`);
    return !!codeData;
  }

  // 获取验证码剩余有效时间
  async getCodeTTL(email: string): Promise<number> {
    return await this.redis.ttl(`${this.CODE_PREFIX}${email}`);
  }
} 