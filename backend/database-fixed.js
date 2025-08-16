const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class Database {
  constructor() {
    console.log('📝 Database构造函数开始...');
    try {
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
      console.log('✅ PrismaClient实例创建成功');
      console.log('🔍 this.prisma类型:', typeof this.prisma);
    } catch (error) {
      console.error('❌ PrismaClient实例创建失败:', error);
      throw error;
    }
  }

  async init() {
    try {
      await this.prisma.$connect();
      console.log('✅ MySQL数据库连接成功');
      
      // 验证模型可用性
      await this.validateModels();
      
      await this.seedDefaultData();
      await this.seedDefaultPointConfigs();
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    }
  }

  async validateModels() {
    console.log('🔍 验证Prisma模型可用性...');
    
    // 检查可能的模型名称变体
    const possibleUserModels = ['user', 'users', 'User', 'Users'];
    const possibleConfigModels = ['userConfig', 'user_config', 'user_configs', 'UserConfig'];
    const possiblePointModels = ['modelPointConfig', 'model_point_config', 'model_point_configs', 'ModelPointConfig'];
    
    let userModel = null;
    let configModel = null;
    let pointModel = null;
    
    // 查找用户模型
    for (const modelName of possibleUserModels) {
      if (this.prisma[modelName] && typeof this.prisma[modelName].findUnique === 'function') {
        userModel = modelName;
        console.log(`✅ 找到用户模型: ${modelName}`);
        break;
      }
    }
    
    // 查找配置模型
    for (const modelName of possibleConfigModels) {
      if (this.prisma[modelName] && typeof this.prisma[modelName].findUnique === 'function') {
        configModel = modelName;
        console.log(`✅ 找到配置模型: ${modelName}`);
        break;
      }
    }
    
    // 查找积分配置模型
    for (const modelName of possiblePointModels) {
      if (this.prisma[modelName] && typeof this.prisma[modelName].findMany === 'function') {
        pointModel = modelName;
        console.log(`✅ 找到积分配置模型: ${modelName}`);
        break;
      }
    }
    
    if (!userModel) {
      // 列出所有可用的模型
      console.log('🔍 可用的Prisma模型:');
      const allProps = Object.getOwnPropertyNames(this.prisma);
      const modelProps = allProps.filter(prop => 
        typeof this.prisma[prop] === 'object' && 
        this.prisma[prop] !== null &&
        typeof this.prisma[prop].findUnique === 'function'
      );
      modelProps.forEach(prop => console.log(`  - ${prop}`));
      
      throw new Error('未找到可用的用户模型，请检查Prisma schema和客户端生成');
    }
    
    // 保存找到的模型名称供后续使用
    this._userModel = userModel;
    this._configModel = configModel;
    this._pointModel = pointModel;
    
    console.log('🎉 模型验证完成');
  }

  async seedDefaultData() {
    console.log('🌱 开始创建默认数据...');
    
    try {
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
        // 确保测试用户有足够的积分进行测试
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
        if (existingAdmin.points < 100) {
          await this.updateUserCredits(existingAdmin.id, 100);
          console.log('💰 为管理员用户充值积分到100');
        }
      }
    } catch (error) {
      console.error('❌ 创建默认数据失败:', error);
      throw error;
    }
  }

  // 用户管理方法
  async createUser(userData) {
    try {
      const { username, email, password } = userData;
      
      const user = await this.prisma[this._userModel].create({
        data: {
          username,
          email,
          password,
          [this._configModel ? 'userConfig' : 'config']: {
            create: {
              // 创建默认配置
            }
          }
        },
        include: {
          [this._configModel ? 'userConfig' : 'config']: true
        }
      });
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      console.log('🔍 getUserByUsername调用，用户名:', username);
      console.log('🔍 使用模型:', this._userModel);
      
      if (!this._userModel) {
        throw new Error('用户模型未找到，请确保模型验证已完成');
      }
      
      return await this.prisma[this._userModel].findUnique({
        where: { username },
        include: {
          [this._configModel ? 'userConfig' : 'config']: true
        }
      });
    } catch (error) {
      console.error('❌ getUserByUsername错误:', error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      return await this.prisma[this._userModel].findUnique({
        where: { email },
        include: {
          [this._configModel ? 'userConfig' : 'config']: true
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id) {
    try {
      return await this.prisma[this._userModel].findUnique({
        where: { id: parseInt(id) },
        include: {
          [this._configModel ? 'userConfig' : 'config']: true
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async updateUserCredits(userId, newCredits) {
    try {
      const updatedUser = await this.prisma[this._userModel].update({
        where: { id: parseInt(userId) },
        data: { points: parseInt(newCredits) }
      });
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  // 初始化默认积分配置
  async seedDefaultPointConfigs() {
    try {
      if (!this._pointModel) {
        console.log('⚠️ 积分配置模型未找到，跳过初始化');
        return;
      }

      const existingConfigs = await this.prisma[this._pointModel].count();
      if (existingConfigs > 0) {
        console.log('💡 积分配置已存在，跳过初始化');
        return;
      }

      console.log('🌱 创建默认积分配置...');
      
      const defaultConfigs = [
        {
          modelName: 'gpt-4',
          questionType: 'multiple_choice',
          cost: 2,
          description: 'GPT-4模型处理选择题',
          isActive: true
        },
        {
          modelName: 'gpt-4',
          questionType: 'programming',
          cost: 5,
          description: 'GPT-4模型处理编程题',
          isActive: true
        },
        {
          modelName: 'claude-3-sonnet',
          questionType: 'multiple_choice',
          cost: 2,
          description: 'Claude-3模型处理选择题',
          isActive: true
        },
        {
          modelName: 'claude-3-sonnet',
          questionType: 'programming',
          cost: 4,
          description: 'Claude-3模型处理编程题',
          isActive: true
        }
      ];

      await this.prisma[this._pointModel].createMany({
        data: defaultConfigs,
        skipDuplicates: true
      });

      console.log('✅ 默认积分配置创建成功');
    } catch (error) {
      console.error('❌ 创建默认积分配置失败:', error);
      // 不抛出错误，因为积分配置不是核心功能
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