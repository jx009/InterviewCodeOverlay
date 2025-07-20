import { createClient, RedisClientType } from 'redis';

// Redis客户端实例
let redisClient: RedisClientType | null = null;

// 初始化Redis连接
export const initRedis = async (): Promise<RedisClientType> => {
  try {
    if (redisClient) {
      return redisClient;
    }

    // 创建Redis客户端
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

    // 连接Redis
    await redisClient.connect();
    
    // 测试连接
    await redisClient.ping();
    console.log('🔄 Redis连接测试成功');

    return redisClient;
  } catch (error) {
    console.error('❌ Redis初始化失败:', error);
    // 如果Redis连接失败，返回一个模拟客户端（用于开发）
    console.log('⚠️  使用内存模拟Redis客户端');
    return createMockRedisClient();
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

// 创建模拟Redis客户端（用于开发环境）
function createMockRedisClient(): any {
  const store = new Map<string, any>();
  
  return {
    async get(key: string) {
      const item = store.get(key);
      if (!item) return null;
      if (item.expires && Date.now() > item.expires) {
        store.delete(key);
        return null;
      }
      return item.value;
    },
    
    async set(key: string, value: string) {
      store.set(key, { value, expires: null });
      return 'OK';
    },
    
    async setEx(key: string, seconds: number, value: string) {
      store.set(key, { 
        value, 
        expires: Date.now() + seconds * 1000 
      });
      return 'OK';
    },
    
    async del(key: string) {
      return store.delete(key) ? 1 : 0;
    },
    
    async sAdd(key: string, member: string) {
      const set = store.get(key) || new Set();
      set.add(member);
      store.set(key, set);
      return 1;
    },
    
    async sMembers(key: string) {
      const set = store.get(key);
      return set ? Array.from(set) : [];
    },
    
    async sRem(key: string, member: string) {
      const set = store.get(key);
      if (set && set.has(member)) {
        set.delete(member);
        return 1;
      }
      return 0;
    },
    
    async sCard(key: string) {
      const set = store.get(key);
      return set ? set.size : 0;
    },
    
    async ping() {
      return 'PONG';
    },
    
    async quit() {
      store.clear();
      return 'OK';
    },
    
    on(event: string, callback: Function) {
      // Mock event handler
    }
  };
}

// 简化的Session管理
export class SessionManager {
  private redis: any;

  constructor() {
    this.redis = getRedisClient();
  }

  // 生成session ID
  private generateSessionId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 30; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 创建会话
  async createSession(userId: number): Promise<string> {
    const sessionId = this.generateSessionId();
    const sessionData = {
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    await this.redis.setEx(
      `session:${sessionId}`,
      7 * 24 * 60 * 60, // 7天
      JSON.stringify(sessionData)
    );

    return sessionId;
  }

  // 获取会话
  async getSession(sessionId: string): Promise<any> {
    // 尝试不同的键前缀格式
    let sessionData = await this.redis.get(`interview_coder:session:${sessionId}`);
    if (!sessionData) {
      sessionData = await this.redis.get(`session:${sessionId}`);
    }
    if (!sessionData) {
      return null;
    }
    return JSON.parse(sessionData);
  }

  // 删除会话
  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);
  }

  // 验证会话
  async validateSession(sessionId: string): Promise<{ valid: boolean; userId?: number }> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) {
      return { valid: false };
    }
    return { valid: true, userId: sessionData.userId };
  }
}

// 简化的验证码管理
export class VerificationManager {
  private redis: any;

  constructor() {
    this.redis = getRedisClient();
  }

  // 生成验证码
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 创建验证码
  async createVerificationCode(email: string): Promise<{ code: string; token: string }> {
    const code = this.generateVerificationCode();
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const data = {
      code,
      email,
      attempts: 0,
      createdAt: new Date().toISOString()
    };

    // 存储验证码（5分钟过期）
    await this.redis.setEx(`verify_code:${email}`, 5 * 60, JSON.stringify(data));
    await this.redis.setEx(`verify_token:${token}`, 30 * 60, JSON.stringify(data));

    return { code, token };
  }

  // 验证码
  async verifyCode(token: string, inputCode: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    const data = await this.redis.get(`verify_token:${token}`);
    if (!data) {
      return { valid: false, error: '验证码已过期' };
    }

    const parsed = JSON.parse(data);
    if (parsed.code !== inputCode) {
      return { valid: false, error: '验证码错误' };
    }

    return { valid: true, email: parsed.email };
  }
} 