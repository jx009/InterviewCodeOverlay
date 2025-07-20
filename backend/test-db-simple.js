/**
 * 简单数据库连接测试
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('🔍 测试数据库连接...');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`);

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('✅ 数据库连接成功！');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ 查询成功:', result);
    
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    console.error('错误代码:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();