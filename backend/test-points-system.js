const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPointsSystem() {
  console.log('🚀 开始测试积分系统...');
  
  try {
    // 1. 检查表是否存在
    console.log('\n📊 检查数据库表...');
    const tables = await prisma.$queryRaw`SHOW TABLES`;
    console.log('数据库表:', tables);
    
    // 2. 检查用户表是否有积分字段
    console.log('\n👤 检查用户表结构...');
    const userTableInfo = await prisma.$queryRaw`DESCRIBE users`;
    console.log('用户表结构:', userTableInfo);
    
    // 3. 检查是否有用户数据
    console.log('\n🔍 查找现有用户...');
    const users = await prisma.user.findMany();
    console.log(`找到 ${users.length} 个用户`);
    
    if (users.length > 0) {
      const user = users[0];
      console.log(`测试用户: ${user.username}, 积分: ${user.points || '未定义'}`);
      
      // 4. 尝试创建一个模型配置
      console.log('\n⚙️ 创建测试模型配置...');
      try {
        const config = await prisma.modelPointConfig.create({
          data: {
            modelName: 'test-gpt-4',
            questionType: 'MULTIPLE_CHOICE',
            cost: 2,
            description: '测试GPT-4配置',
            isActive: true
          }
        });
        console.log('✅ 成功创建模型配置:', config);
        
        // 5. 删除测试配置
        await prisma.modelPointConfig.delete({
          where: { id: config.id }
        });
        console.log('🗑️ 已删除测试配置');
        
      } catch (configError) {
        console.error('❌ 创建模型配置失败:', configError.message);
      }
    }
    
    console.log('\n🎉 积分系统测试完成!');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPointsSystem(); 