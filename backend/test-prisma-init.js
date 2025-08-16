// 测试Prisma客户端初始化问题
const { PrismaClient } = require('@prisma/client');

console.log('🔍 开始测试Prisma客户端初始化...');

class TestDatabase {
  constructor() {
    console.log('📝 构造函数开始...');
    console.log('📦 PrismaClient:', typeof PrismaClient);
    
    try {
      this.prisma = new PrismaClient({
        log: ['error'],
      });
      console.log('✅ PrismaClient实例创建成功');
      console.log('🔍 this.prisma类型:', typeof this.prisma);
      console.log('🔍 this.prisma.user类型:', typeof this.prisma?.user);
    } catch (error) {
      console.error('❌ PrismaClient实例创建失败:', error);
    }
  }

  async testConnection() {
    try {
      console.log('🔗 开始测试连接...');
      await this.prisma.$connect();
      console.log('✅ 数据库连接成功');
      
      console.log('🔍 测试基本查询...');
      const count = await this.prisma.user.count();
      console.log('📊 用户数量:', count);
      
      console.log('🔍 测试getUserByUsername逻辑...');
      console.log('🔍 this.prisma:', !!this.prisma);
      console.log('🔍 this.prisma.user:', !!this.prisma.user);
      console.log('🔍 this.prisma.user.findUnique:', typeof this.prisma.user?.findUnique);
      
      const testUser = await this.prisma.user.findUnique({
        where: { username: '123456' }
      });
      console.log('👤 测试用户查询结果:', !!testUser);
      
    } catch (error) {
      console.error('❌ 连接测试失败:', error);
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

async function runTest() {
  console.log('🚀 开始运行测试...');
  const db = new TestDatabase();
  await db.testConnection();
  console.log('✅ 测试完成');
}

runTest().catch(console.error);