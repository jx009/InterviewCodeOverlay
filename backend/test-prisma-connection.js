const { PrismaClient } = require('@prisma/client');

async function testPrismaConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('=== 测试Prisma连接 ===');
    console.log('使用的连接字符串:', process.env.DATABASE_URL);
    console.log('');
    
    // 测试基本连接
    await prisma.$connect();
    console.log('✅ Prisma连接成功');
    
    // 测试数据库查询
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ 数据库查询成功:', result);
    
    // 获取数据库版本
    const version = await prisma.$queryRaw`SELECT VERSION() as version`;
    console.log('✅ MySQL版本:', version);
    
    // 获取当前用户信息
    const user = await prisma.$queryRaw`SELECT USER() as current_user, CURRENT_USER() as current_user2`;
    console.log('✅ 当前用户:', user);
    
    // 获取连接信息
    const connectionInfo = await prisma.$queryRaw`SHOW VARIABLES LIKE 'port'`;
    console.log('✅ 连接信息:', connectionInfo);
    
    // 查看用户权限
    const privileges = await prisma.$queryRaw`SHOW GRANTS FOR CURRENT_USER()`;
    console.log('✅ 用户权限:', privileges);
    
  } catch (error) {
    console.error('❌ Prisma连接失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaConnection(); 