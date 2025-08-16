// Prisma 客户端调试脚本
const { PrismaClient } = require('@prisma/client');

async function debugPrismaClient() {
  console.log('🔍 开始调试 Prisma 客户端...');
  
  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });
  
  try {
    await prisma.$connect();
    console.log('✅ Prisma 客户端连接成功');
    
    // 检查可用的模型
    console.log('📋 可用的模型:', Object.keys(prisma));
    
    // 检查 announcement 模型是否存在
    if (!prisma.announcement) {
      console.log('❌ announcement 模型不存在');
      console.log('💡 请运行: npx prisma generate');
      return;
    }
    
    console.log('✅ announcement 模型存在');
    
    // 尝试查询 announcements 表
    const count = await prisma.announcement.count();
    console.log(`📊 announcements 表中有 ${count} 条记录`);
    
    // 尝试查询前3条记录
    const announcements = await prisma.announcement.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('📄 前3条公告记录:');
    announcements.forEach((ann, index) => {
      console.log(`  ${index + 1}. ${ann.title} (ID: ${ann.id})`);
    });
    
  } catch (error) {
    console.error('❌ Prisma 调试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPrismaClient();