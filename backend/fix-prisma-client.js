// 修复Prisma客户端问题
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function fixPrismaClient() {
  console.log('🔧 开始修复Prisma客户端...');
  
  try {
    // 1. 重新生成Prisma客户端
    console.log('📦 重新生成Prisma客户端...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // 2. 测试新的客户端
    console.log('🧪 测试新生成的客户端...');
    const prisma = new PrismaClient({
      log: ['error'],
    });
    
    await prisma.$connect();
    console.log('✅ 数据库连接成功');
    
    // 验证模型可用性
    console.log('🔍 验证模型可用性...');
    console.log('  - user模型:', typeof prisma.user);
    console.log('  - userConfig模型:', typeof prisma.userConfig);
    console.log('  - modelPointConfig模型:', typeof prisma.modelPointConfig);
    
    if (prisma.user && prisma.user.findUnique) {
      console.log('✅ user模型可用');
      
      // 测试用户查询
      const userCount = await prisma.user.count();
      console.log(`📊 用户总数: ${userCount}`);
      
      // 测试具体用户查询
      const testUser = await prisma.user.findUnique({
        where: { username: '123456' },
        include: { userConfig: true }
      });
      console.log('👤 测试用户存在:', !!testUser);
      
    } else {
      console.error('❌ user模型不可用');
    }
    
    if (prisma.modelPointConfig && prisma.modelPointConfig.findMany) {
      console.log('✅ modelPointConfig模型可用');
      
      const configCount = await prisma.modelPointConfig.count();
      console.log(`⚙️ 积分配置总数: ${configCount}`);
    } else {
      console.error('❌ modelPointConfig模型不可用');
    }
    
    await prisma.$disconnect();
    console.log('🎉 Prisma客户端修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    throw error;
  }
}

if (require.main === module) {
  fixPrismaClient()
    .then(() => {
      console.log('✅ 修复脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 修复脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = fixPrismaClient;