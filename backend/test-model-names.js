// 测试Prisma模型名称
const { PrismaClient } = require('@prisma/client');

async function testModelNames() {
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    
    console.log('🔍 检查可用的模型：');
    console.log('prisma.user:', typeof prisma.user);
    console.log('prisma.users:', typeof prisma.users);
    console.log('prisma.userConfig:', typeof prisma.userConfig);
    console.log('prisma.user_configs:', typeof prisma.user_configs);
    console.log('prisma.userConfigs:', typeof prisma.userConfigs);
    console.log('prisma.modelPointConfig:', typeof prisma.modelPointConfig);
    console.log('prisma.model_point_configs:', typeof prisma.model_point_configs);
    console.log('prisma.modelPointConfigs:', typeof prisma.modelPointConfigs);
    
    // 测试实际查询
    if (prisma.users) {
      console.log('\n✅ 使用 prisma.users 查询：');
      const count = await prisma.users.count();
      console.log('用户总数:', count);
    }
    
    if (prisma.user_configs) {
      console.log('\n✅ 使用 prisma.user_configs 查询：');
      const configCount = await prisma.user_configs.count();
      console.log('配置总数:', configCount);
    }
    
    if (prisma.model_point_configs) {
      console.log('\n✅ 使用 prisma.model_point_configs 查询：');
      const pointConfigCount = await prisma.model_point_configs.count();
      console.log('积分配置总数:', pointConfigCount);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testModelNames().catch(console.error);