import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import configLoader, { dbConfig } from './config-loader';

// 获取配置
const config = dbConfig;

// Prisma客户端实例，使用配置文件中的连接字符串
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: configLoader.getMySQLConnectionString()
    }
  },
  log: config.app.debug ? ['query', 'error', 'warn'] : ['error'],
});

// Redis客户端配置
const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  db: config.redis.database,
  keyPrefix: config.redis.keyPrefix,
  retryDelayOnFailover: config.redis.retryDelayOnFailover,
  maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
  lazyConnect: config.redis.lazyConnect,
  keepAlive: config.redis.keepAlive,
};

// Redis客户端实例
export const redis = createClient({
  url: configLoader.getRedisConnectionString(),
  ...redisConfig
});

// Redis连接管理
export const connectRedis = async () => {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }
    console.log(`✅ Redis连接成功 (${config.redis.host}:${config.redis.port})`);
    return true;
  } catch (error) {
    console.warn('⚠️ Redis连接失败，将在无Redis模式下运行:', (error as Error).message);
    return false;
  }
};

// 数据库连接管理
export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log(`✅ MySQL数据库连接成功 (${config.mysql.host}:${config.mysql.port}/${config.mysql.database})`);
  } catch (error) {
    console.error('❌ MySQL数据库连接失败:', error);
    throw error;
  }
};

// 关闭数据库连接
export const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    if (redis.isOpen) {
      await redis.quit();
    }
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 关闭数据库连接失败:', error);
  }
};

// 数据库健康检查
export const checkDatabaseHealth = async () => {
  let mysqlStatus = false;
  let redisStatus = false;
  
  try {
    // 检查MySQL连接
    await prisma.$queryRaw`SELECT 1`;
    mysqlStatus = true;
  } catch (error) {
    console.error('MySQL健康检查失败:', error);
  }
  
  try {
    // 检查Redis连接
    if (!redis.isOpen) {
      await redis.connect();
    }
    await redis.ping();
    redisStatus = true;
  } catch (error) {
    console.warn('Redis健康检查失败:', (error as Error).message);
  }
  
  return { 
    mysql: mysqlStatus, 
    redis: redisStatus,
    config: {
      mysqlHost: config.mysql.host,
      mysqlDatabase: config.mysql.database,
      redisHost: config.redis.host,
      redisDatabase: config.redis.database
    }
  };
};

// Session管理工具 (使用配置文件中的会话设置)
export const sessionManager = {
  // 设置会话
  async setSession(sessionId: string, userId: number, expiresIn: number = config.session.expiresIn) {
    try {
      const sessionData = {
        userId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      };
      
      if (!redis.isOpen) {
        await redis.connect();
      }
      
      await redis.setEx(`${config.redis.keyPrefix}session:${sessionId}`, expiresIn, JSON.stringify(sessionData));
      return sessionData;
    } catch (error) {
      console.warn('Redis会话设置失败，使用数据库存储:', (error as Error).message);
      // 可以在这里实现数据库存储的fallback
      throw new Error('会话存储失败');
    }
  },

  // 获取会话
  async getSession(sessionId: string) {
    try {
      if (!redis.isOpen) {
        await redis.connect();
      }
      
      const sessionData = await redis.get(`${config.redis.keyPrefix}session:${sessionId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.warn('Redis会话获取失败:', (error as Error).message);
      return null;
    }
  },

  // 删除会话
  async deleteSession(sessionId: string) {
    try {
      if (!redis.isOpen) {
        await redis.connect();
      }
      
      await redis.del(`${config.redis.keyPrefix}session:${sessionId}`);
    } catch (error) {
      console.warn('Redis会话删除失败:', (error as Error).message);
    }
  },

  // 设置验证码 (使用配置文件中的验证码设置)
  async setVerificationCode(email: string, code: string, expiresIn: number = config.email.verification.expiresMinutes * 60) {
    if (!redis.isOpen) {
      await redis.connect();
    }
    
    await redis.setEx(`${config.redis.keyPrefix}verify:${email}`, expiresIn, code);
  },

  // 获取验证码
  async getVerificationCode(email: string) {
    if (!redis.isOpen) {
      await redis.connect();
    }
    
    return await redis.get(`${config.redis.keyPrefix}verify:${email}`);
  },

  // 删除验证码
  async deleteVerificationCode(email: string) {
    if (!redis.isOpen) {
      await redis.connect();
    }
    
    await redis.del(`${config.redis.keyPrefix}verify:${email}`);
  }
};

// 配置工具函数
export const getConfig = () => config;
export const reloadConfig = () => configLoader.reloadConfig();

// 初始化所有连接
export const initializeDatabase = async () => {
  try {
    await connectDatabase();
    const redisConnected = await connectRedis();
    
    // 运行健康检查
    const health = await checkDatabaseHealth();
    if (health.mysql) {
      console.log('🎉 数据库系统初始化完成');
      console.log(`📊 配置信息:`, health.config);
      if (redisConnected && health.redis) {
        console.log('✅ Redis已连接，缓存功能可用');
      } else {
        console.log('⚠️ Redis未连接，某些功能可能受限（如会话管理、验证码）');
      }
    } else {
      throw new Error('MySQL数据库连接失败');
    }
  } catch (error) {
    console.error('❌ 数据库系统初始化失败:', error);
    throw error;
  }
};

export default { 
  prisma, 
  redis, 
  connectDatabase, 
  connectRedis, 
  disconnectDatabase, 
  checkDatabaseHealth, 
  sessionManager,
  getConfig,
  reloadConfig,
  initializeDatabase
}; 