// 紧急数据库修复脚本 - 直接替换有问题的方法
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

class EmergencyDatabase {
  constructor() {
    console.log('🚨 紧急数据库修复启动...');
    this.prisma = new PrismaClient({
      log: ['error'],
    });
  }

  async init() {
    try {
      await this.prisma.$connect();
      console.log('✅ 数据库连接成功');
      
      // 直接查找可用的用户模型
      let userModel = null;
      const possibleNames = ['user', 'users'];
      
      for (const name of possibleNames) {
        if (this.prisma[name] && typeof this.prisma[name].findUnique === 'function') {
          userModel = this.prisma[name];
          this._userModelName = name;
          console.log(`✅ 找到用户模型: ${name}`);
          break;
        }
      }
      
      if (!userModel) {
        // 显示所有可用模型
        const allProps = Object.getOwnPropertyNames(this.prisma);
        const models = allProps.filter(prop => 
          this.prisma[prop] && 
          typeof this.prisma[prop] === 'object' && 
          typeof this.prisma[prop].findUnique === 'function'
        );
        console.log('📝 可用模型:', models);
        throw new Error('找不到可用的用户模型');
      }
      
      await this.seedUsers();
      await this.seedPointConfigs();
      
      console.log('🎉 紧急修复完成！');
      
    } catch (error) {
      console.error('❌ 紧急修复失败:', error);
      throw error;
    }
  }

  async seedUsers() {
    try {
      const userModel = this.prisma[this._userModelName];
      
      // 检查测试用户
      const testUser = await userModel.findUnique({
        where: { username: '123456' }
      });
      
      if (!testUser) {
        console.log('🌱 创建测试用户...');
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        await userModel.create({
          data: {
            username: '123456',
            email: '123456@test.com',
            password: hashedPassword,
            points: 100
          }
        });
        
        console.log('✅ 测试用户创建成功');
      } else {
        console.log('✅ 测试用户已存在');
        
        if (testUser.points < 100) {
          await userModel.update({
            where: { id: testUser.id },
            data: { points: 100 }
          });
          console.log('💰 测试用户积分已更新');
        }
      }
      
      // 检查管理员用户
      const adminUser = await userModel.findUnique({
        where: { username: 'admin' }
      });
      
      if (!adminUser) {
        console.log('🌱 创建管理员用户...');
        const hashedPassword = await bcrypt.hash('admin123456', 10);
        
        await userModel.create({
          data: {
            username: 'admin',
            email: 'admin@test.com',
            password: hashedPassword,
            points: 100
          }
        });
        
        console.log('✅ 管理员用户创建成功');
      } else {
        console.log('✅ 管理员用户已存在');
        
        if (adminUser.points < 100) {
          await userModel.update({
            where: { id: adminUser.id },
            data: { points: 100 }
          });
          console.log('💰 管理员用户积分已更新');
        }
      }
      
    } catch (error) {
      console.error('❌ 用户数据初始化失败:', error);
      throw error;
    }
  }

  async seedPointConfigs() {
    try {
      // 查找积分配置模型
      let pointModel = null;
      const possibleNames = ['modelPointConfig', 'model_point_configs'];
      
      for (const name of possibleNames) {
        if (this.prisma[name] && typeof this.prisma[name].count === 'function') {
          pointModel = this.prisma[name];
          console.log(`✅ 找到积分配置模型: ${name}`);
          break;
        }
      }
      
      if (!pointModel) {
        console.log('⚠️ 积分配置模型不可用，跳过');
        return;
      }
      
      const existingCount = await pointModel.count();
      if (existingCount > 0) {
        console.log('💡 积分配置已存在，跳过');
        return;
      }
      
      console.log('🌱 创建积分配置...');
      const configs = [
        {
          modelName: 'gpt-4',
          questionType: 'multiple_choice',
          cost: 2,
          description: 'GPT-4选择题',
          isActive: true
        },
        {
          modelName: 'claude-3-sonnet',
          questionType: 'programming',
          cost: 4,
          description: 'Claude编程题',
          isActive: true
        }
      ];
      
      await pointModel.createMany({
        data: configs,
        skipDuplicates: true
      });
      
      console.log('✅ 积分配置创建成功');
      
    } catch (error) {
      console.log('⚠️ 积分配置初始化失败，但不影响核心功能:', error.message);
    }
  }

  async close() {
    await this.prisma.$disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行紧急修复
async function runEmergencyFix() {
  const db = new EmergencyDatabase();
  try {
    await db.init();
    console.log('🎉 紧急修复成功完成！');
  } catch (error) {
    console.error('💥 紧急修复失败:', error);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  runEmergencyFix();
}

module.exports = EmergencyDatabase;