// 修复数据库初始化问题的脚本
const { PrismaClient } = require('@prisma/client');

async function fixDatabaseIssue() {
  console.log('🔧 开始修复数据库初始化问题...');
  
  const prisma = new PrismaClient({
    log: ['error'],
  });

  try {
    // 先连接数据库
    await prisma.$connect();
    console.log('✅ Prisma客户端连接成功');

    // 测试基本查询
    const userCount = await prisma.user.count();
    console.log(`📊 当前用户数量: ${userCount}`);

    // 检查是否需要创建默认用户
    const bcrypt = require('bcryptjs');
    
    const existingUser = await prisma.user.findUnique({
      where: { username: '123456' }
    });

    if (!existingUser) {
      console.log('🌱 创建默认测试用户...');
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      await prisma.user.create({
        data: {
          username: '123456',
          email: '123456@test.com',
          password: hashedPassword,
          points: 100,
          config: {
            create: {}
          }
        }
      });
      
      console.log('✅ 默认测试用户创建成功');
    } else {
      console.log('✅ 测试用户已存在');
      
      // 确保测试用户有足够积分
      if (existingUser.points < 100) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { points: 100 }
        });
        console.log('💰 为测试用户充值积分到100');
      }
    }

    // 检查管理员用户
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (!existingAdmin) {
      console.log('🌱 创建默认管理员用户...');
      const hashedPassword = await bcrypt.hash('admin123456', 10);
      
      await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@test.com',
          password: hashedPassword,
          points: 100,
          config: {
            create: {}
          }
        }
      });
      
      console.log('✅ 默认管理员用户创建成功');
    } else {
      console.log('✅ 管理员用户已存在');
      
      if (existingAdmin.points < 100) {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { points: 100 }
        });
        console.log('💰 为管理员用户充值积分到100');
      }
    }

    // 检查积分配置
    const configCount = await prisma.modelPointConfig.count();
    if (configCount === 0) {
      console.log('🌱 创建默认积分配置...');
      
      const defaultConfigs = [
        {
          modelName: 'gpt-4',
          questionType: 'MULTIPLE_CHOICE',
          cost: 2,
          description: 'GPT-4模型处理选择题',
          isActive: true
        },
        {
          modelName: 'gpt-4',
          questionType: 'PROGRAMMING',
          cost: 5,
          description: 'GPT-4模型处理编程题',
          isActive: true
        },
        {
          modelName: 'claude-3-sonnet',
          questionType: 'MULTIPLE_CHOICE',
          cost: 2,
          description: 'Claude-3模型处理选择题',
          isActive: true
        },
        {
          modelName: 'claude-3-sonnet',
          questionType: 'PROGRAMMING',
          cost: 4,
          description: 'Claude-3模型处理编程题',
          isActive: true
        }
      ];

      await prisma.modelPointConfig.createMany({
        data: defaultConfigs,
        skipDuplicates: true
      });

      console.log('✅ 默认积分配置创建成功');
    } else {
      console.log('✅ 积分配置已存在');
    }

    console.log('🎉 数据库修复完成！');

  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行修复脚本
if (require.main === module) {
  fixDatabaseIssue()
    .then(() => {
      console.log('✅ 修复脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 修复脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = fixDatabaseIssue;