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
      await this.seedDefaultPointConfigs();
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
    } else {
      // 🆕 确保测试用户有足够的积分进行测试
      if (existingUser.points < 100) {
        await this.updateUserCredits(existingUser.id, 100);
        console.log('💰 为测试用户充值积分到100');
      }
    }

    // 检查是否已有admin用户
    const existingAdmin = await this.getUserByUsername('admin');
    if (!existingAdmin) {
      console.log('🌱 创建默认管理员用户...');
      const hashedPassword = await bcrypt.hash('admin123456', 10);
      
      await this.createUser({
        username: 'admin',
        email: 'admin@test.com',
        password: hashedPassword
      });
      
      console.log('✅ 默认管理员用户创建成功 (用户名: admin, 邮箱: admin@test.com, 密码: admin123456)');
    } else {
      // 🆕 确保管理员用户有足够的积分
      if (existingAdmin.points < 100) {
        await this.updateUserCredits(existingAdmin.id, 100);
        console.log('💰 为管理员用户充值积分到100');
      }
    }
  }

  // 用户管理方法
  async createUser(userData) {
    try {
      const { username, email, password } = userData;
      
      const user = await this.prisma.users.create({
        data: {
          username,
          email,
          password,
          user_configs: {
            create: {
              // 创建默认配置
            }
          }
        },
        include: {
          user_configs: true
        }
      });
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      return await this.prisma.users.findUnique({
        where: { email },
        include: {
          user_configs: true
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      return await this.prisma.users.findUnique({
        where: { username },
        include: {
          user_configs: true
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id) {
    try {
      return await this.prisma.users.findUnique({
        where: { id: parseInt(id) },
        include: {
          user_configs: true
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserByUsernameOrEmail(identifier) {
    try {
      const user = await this.prisma.users.findFirst({
        where: {
          OR: [
            { username: identifier },
            { email: identifier }
          ]
        }
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // 🆕 更新用户密码
  async updateUserPassword(userId, hashedPassword) {
    try {
      const updatedUser = await this.prisma.users.update({
        where: { id: parseInt(userId) },
        data: { password: hashedPassword }
      });
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  // 🆕 更新用户积分
  async updateUserCredits(userId, newCredits) {
    try {
      const updatedUser = await this.prisma.users.update({
        where: { id: parseInt(userId) },
        data: { points: parseInt(newCredits) }
      });
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  // 🆕 记录积分交易
  async recordPointTransaction(transactionData) {
    try {
      const transaction = await this.prisma.point_transactions.create({
        data: {
          user_id: parseInt(transactionData.userId),
          transaction_type: transactionData.transactionType,
          amount: parseInt(transactionData.amount),
          balance_after: parseInt(transactionData.balanceAfter),
          model_name: transactionData.modelName || null,
          question_type: transactionData.questionType || null,
          description: transactionData.description || null,
          metadata: transactionData.metadata || null
        }
      });
      return transaction;
    } catch (error) {
      console.error('记录积分交易失败:', error);
      throw error;
    }
  }

  // 🆕 获取用户积分交易记录
  async getUserPointTransactions(userId, limit = 50, offset = 0) {
    try {
      const [transactions, total] = await Promise.all([
        this.prisma.point_transactions.findMany({
          where: { user_id: parseInt(userId) },
          orderBy: { created_at: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset),
          select: {
            id: true,
            transaction_type: true,
            amount: true,
            balance_after: true,
            model_name: true,
            question_type: true,
            description: true,
            created_at: true
          }
        }),
        this.prisma.point_transactions.count({
          where: { user_id: parseInt(userId) }
        })
      ]);
      
      return {
        transactions,
        total,
        hasMore: (offset + transactions.length) < total
      };
    } catch (error) {
      console.error('获取积分交易记录失败:', error);
      throw error;
    }
  }

  // 🆕 获取积分交易统计
  async getPointTransactionStats(userId) {
    try {
      const stats = await this.prisma.point_transactions.groupBy({
        by: ['transaction_type'],
        where: { user_id: parseInt(userId) },
        _sum: { amount: true },
        _count: { id: true }
      });
      return stats;
    } catch (error) {
      console.error('获取积分交易统计失败:', error);
      throw error;
    }
  }

  async getUserConfig(userId) {
    try {
      let config = await this.prisma.user_configs.findUnique({
        where: { user_id: parseInt(userId) }
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
      return await this.prisma.user_configs.create({
        data: {
          user_id: parseInt(userId)
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

      const result = await this.prisma.user_configs.upsert({
        where: { user_id: parseInt(userId) },
        update: processedUpdate,
        create: {
          user_id: parseInt(userId),
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
      return await this.prisma.user_sessions.create({
        data: {
          user_id: parseInt(userId),
          token: crypto.randomUUID(),
          refresh_token: token,
          expires_at: new Date(expiresAt)
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async validateRefreshToken(token) {
    try {
      const session = await this.prisma.user_sessions.findUnique({
        where: { 
          refresh_token: token,
          is_active: true
        },
        include: {
          users: true
        }
      });

      if (!session || session.expires_at < new Date()) {
        return null;
      }

      return session;
    } catch (error) {
      throw error;
    }
  }

  async deleteRefreshToken(token) {
    try {
      await this.prisma.user_sessions.updateMany({
        where: { refresh_token: token },
        data: { is_active: false }
      });
    } catch (error) {
      throw error;
    }
  }

  async cleanupExpiredTokens() {
    try {
      await this.prisma.user_sessions.updateMany({
        where: {
          expires_at: {
            lt: new Date()
          }
        },
        data: {
          is_active: false
        }
      });
    } catch (error) {
      console.error('清理过期令牌失败:', error);
    }
  }

  // 邮箱验证码相关方法
  async storeEmailVerificationCode(email, code, token, expiresAt) {
    try {
      return await this.prisma.email_verification_codes.create({
        data: {
          email,
          code,
          token,
          expires_at: new Date(expiresAt)
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async verifyEmailCode(token, code) {
    try {
      const verification = await this.prisma.email_verification_codes.findUnique({
        where: { 
          token,
          is_used: false
        }
      });

      if (!verification || verification.expires_at < new Date() || verification.code !== code) {
        return null;
      }

      // 标记为已使用
      await this.prisma.email_verification_codes.update({
        where: { id: verification.id },
        data: { is_used: true }
      });

      return verification;
    } catch (error) {
      throw error;
    }
  }

  // 🔥 积分系统相关方法
  
  // 获取所有模型积分配置
  async getAllModelPointConfigs() {
    try {
      return await this.prisma.model_point_configs.findMany({
        orderBy: [
          { model_name: 'asc' },
          { question_type: 'asc' }
        ]
      });
    } catch (error) {
      throw error;
    }
  }

  // 根据模型名称和题目类型获取配置
  async getModelPointConfig(modelName, questionType) {
    try {
      return await this.prisma.model_point_configs.findFirst({
        where: {
          model_name: modelName,
          question_type: questionType
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // 创建或更新模型积分配置
  async upsertModelPointConfig(configData) {
    try {
      const { modelName, questionType, cost, description, isActive = true } = configData;
      
      return await this.prisma.model_point_configs.upsert({
        where: {
          model_name_question_type: {
            model_name: modelName,
            question_type: questionType
          }
        },
        update: {
          cost: parseInt(cost),
          description,
          is_active: isActive,
          updated_at: new Date()
        },
        create: {
          model_name: modelName,
          question_type: questionType,
          cost: parseInt(cost),
          description: description || '',
          is_active: isActive
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // 删除模型积分配置
  async deleteModelPointConfig(modelName, questionType) {
    try {
      return await this.prisma.model_point_configs.delete({
        where: {
          model_name_question_type: {
            model_name: modelName,
            question_type: questionType
          }
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // 批量创建/更新模型积分配置
  async batchUpsertModelPointConfigs(configs) {
    try {
      const results = [];
      
      for (const config of configs) {
        const result = await this.upsertModelPointConfig(config);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      throw error;
    }
  }

  // 初始化默认积分配置
  async seedDefaultPointConfigs() {
    try {
      const existingConfigs = await this.prisma.model_point_configs.count();
      if (existingConfigs > 0) {
        console.log('💡 积分配置已存在，跳过初始化');
        return;
      }

      console.log('🌱 创建默认积分配置...');
      
      const defaultConfigs = [
        {
          model_name: 'gpt-4',
          question_type: 'multiple_choice',
          cost: 2,
          description: 'GPT-4模型处理选择题',
          is_active: true
        },
        {
          model_name: 'gpt-4',
          question_type: 'programming',
          cost: 5,
          description: 'GPT-4模型处理编程题',
          is_active: true
        },
        {
          model_name: 'gpt-3.5-turbo',
          question_type: 'multiple_choice',
          cost: 1,
          description: 'GPT-3.5模型处理选择题',
          is_active: true
        },
        {
          model_name: 'claude-3-sonnet',
          question_type: 'programming',
          cost: 4,
          description: 'Claude-3模型处理编程题',
          is_active: true
        },
        {
          model_name: 'claude-3-sonnet',
          question_type: 'multiple_choice',
          cost: 2,
          description: 'Claude-3模型处理选择题',
          is_active: true
        }
      ];

      await this.prisma.model_point_configs.createMany({
        data: defaultConfigs,
        skipDuplicates: true
      });

      console.log('✅ 默认积分配置创建成功');
    } catch (error) {
      console.error('❌ 创建默认积分配置失败:', error);
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