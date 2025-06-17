import { PrismaClient } from '@prisma/client';

// 创建Prisma客户端单例
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// 连接到数据库
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 断开数据库连接
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ 数据库连接已断开');
  } catch (error) {
    console.error('❌ 断开数据库连接时出错:', error);
  }
}

// 处理应用退出时的清理
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

export { prisma }; 