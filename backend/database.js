const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class Database {
  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    this.init();
  }

  async init() {
    try {
      await this.prisma.$connect();
      console.log('✅ MySQL数据库连接成功');
      await this.seedDefaultData();
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    }
  }

  async seedDefaultData() {
    // 检查是否已有测试用户
    const existingUser = await this.getUserByUsername('123456');
    if (!existingUser) {
      console.log('🌱 创建默认测试用户...');
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      await this.createUser({
        username: '123456',
        email: '123456@test.com',
        password: hashedPassword
      });
      
      console.log('✅ 默认测试用户创建成功 (用户名/密码: 123456)');
    }
  }

  // 用户管理方法
  async createUser(userData) {
    try {
      const { username, email, password } = userData;
      
      const user = await this.prisma.user.create({
        data: {
          username,
          email,
          password,
          config: {
            create: {
              // 创建默认配置
            }
          }
        },
        include: {
          config: true
        }
      });
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      return await this.prisma.user.findUnique({
        where: { email },
        include: {
          config: true
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      return await this.prisma.user.findUnique({
        where: { username },
        include: {
          config: true
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id) {
    try {
      return await this.prisma.user.findUnique({
        where: { id: parseInt(id) },
        include: {
          config: true
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserByUsernameOrEmail(identifier) {
    try {
      return await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: identifier },
            { email: identifier }
          ]
        },
        include: {
          config: true
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserConfig(userId) {
    try {
      let config = await this.prisma.userConfig.findUnique({
        where: { userId: parseInt(userId) }
      });

      if (!config) {
        config = await this.createDefaultConfig(parseInt(userId));
      }

      // 转换JSON字符串为对象
      return {
        ...config,
        shortcuts: config.shortcuts ? JSON.parse(config.shortcuts) : {
          takeScreenshot: 'F1',
          openQueue: 'F2',
          openSettings: 'F3'
        },
        display: config.display ? JSON.parse(config.display) : {
          opacity: 1.0,
          position: 'top-right',
          autoHide: false,
          hideDelay: 3000
        },
        processing: config.processing ? JSON.parse(config.processing) : {
          autoProcess: true,
          saveScreenshots: false,
          compressionLevel: 0.8
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async createDefaultConfig(userId) {
    try {
      return await this.prisma.userConfig.create({
        data: {
          userId: parseInt(userId)
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async updateUserConfig(userId, configUpdate) {
    try {
      // 将对象字段转换为JSON字符串
      const processedUpdate = { ...configUpdate };
      if (processedUpdate.shortcuts && typeof processedUpdate.shortcuts === 'object') {
        processedUpdate.shortcuts = JSON.stringify(processedUpdate.shortcuts);
      }
      if (processedUpdate.display && typeof processedUpdate.display === 'object') {
        processedUpdate.display = JSON.stringify(processedUpdate.display);
      }
      if (processedUpdate.processing && typeof processedUpdate.processing === 'object') {
        processedUpdate.processing = JSON.stringify(processedUpdate.processing);
      }

      const result = await this.prisma.userConfig.upsert({
        where: { userId: parseInt(userId) },
        update: processedUpdate,
        create: {
          userId: parseInt(userId),
          ...processedUpdate
        }
      });

      // 返回时重新解析JSON字段
      return {
        ...result,
        shortcuts: result.shortcuts ? JSON.parse(result.shortcuts) : {
          takeScreenshot: 'F1',
          openQueue: 'F2',
          openSettings: 'F3'
        },
        display: result.display ? JSON.parse(result.display) : {
          opacity: 1.0,
          position: 'top-right',
          autoHide: false,
          hideDelay: 3000
        },
        processing: result.processing ? JSON.parse(result.processing) : {
          autoProcess: true,
          saveScreenshots: false,
          compressionLevel: 0.8
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async storeRefreshToken(userId, token, expiresAt) {
    try {
      return await this.prisma.userSession.create({
        data: {
          userId: parseInt(userId),
          token: crypto.randomUUID(),
          refreshToken: token,
          expiresAt: new Date(expiresAt)
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async validateRefreshToken(token) {
    try {
      const session = await this.prisma.userSession.findUnique({
        where: { 
          refreshToken: token,
          isActive: true
        },
        include: {
          user: true
        }
      });

      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      return session;
    } catch (error) {
      throw error;
    }
  }

  async deleteRefreshToken(token) {
    try {
      await this.prisma.userSession.updateMany({
        where: { refreshToken: token },
        data: { isActive: false }
      });
    } catch (error) {
      throw error;
    }
  }

  async cleanupExpiredTokens() {
    try {
      await this.prisma.userSession.updateMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        },
        data: {
          isActive: false
        }
      });
    } catch (error) {
      console.error('清理过期令牌失败:', error);
    }
  }

  // 邮箱验证码相关方法
  async storeEmailVerificationCode(email, code, token, expiresAt) {
    try {
      return await this.prisma.emailVerificationCode.create({
        data: {
          email,
          code,
          token,
          expiresAt: new Date(expiresAt)
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async verifyEmailCode(token, code) {
    try {
      const verification = await this.prisma.emailVerificationCode.findUnique({
        where: { 
          token,
          isUsed: false
        }
      });

      if (!verification || verification.expiresAt < new Date() || verification.code !== code) {
        return null;
      }

      // 标记为已使用
      await this.prisma.emailVerificationCode.update({
        where: { id: verification.id },
        data: { isUsed: true }
      });

      return verification;
    } catch (error) {
      throw error;
    }
  }

  async close() {
    try {
      await this.prisma.$disconnect();
      console.log('✅ 数据库连接已关闭');
    } catch (error) {
      console.error('❌ 关闭数据库连接失败:', error);
    }
  }
}

module.exports = Database; 