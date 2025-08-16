// 详细调试Prisma客户端问题
const { PrismaClient } = require('@prisma/client');

console.log('🔍 开始详细调试...');

class DebugDatabase {
  constructor() {
    console.log('📝 DebugDatabase构造函数开始...');
    console.log('📦 PrismaClient类型:', typeof PrismaClient);
    
    try {
      this.prisma = new PrismaClient({
        log: ['error'],
      });
      console.log('✅ PrismaClient实例创建成功');
      console.log('🔍 this.prisma类型:', typeof this.prisma);
      console.log('🔍 this.prisma构造函数:', this.prisma.constructor.name);
      
      // 检查所有属性
      console.log('🔍 Prisma客户端属性:');
      const props = Object.getOwnPropertyNames(this.prisma);
      const relevantProps = props.filter(prop => 
        prop.startsWith('user') || 
        prop.startsWith('model') || 
        prop.startsWith('point') ||
        prop === '$connect' ||
        prop === '$disconnect'
      );
      relevantProps.forEach(prop => {
        console.log(`  - ${prop}: ${typeof this.prisma[prop]}`);
      });
      
    } catch (error) {
      console.error('❌ PrismaClient实例创建失败:', error);
      throw error;
    }
  }

  async testInit() {
    try {
      console.log('\n🔗 开始连接测试...');
      await this.prisma.$connect();
      console.log('✅ 数据库连接成功');
      
      // 重新检查属性（连接后）
      console.log('\n🔍 连接后的Prisma客户端属性:');
      console.log('🔍 this.prisma.user存在:', !!this.prisma.user);
      console.log('🔍 this.prisma.user类型:', typeof this.prisma.user);
      
      if (this.prisma.user) {
        console.log('🔍 this.prisma.user.findUnique存在:', !!this.prisma.user.findUnique);
        console.log('🔍 this.prisma.user.findUnique类型:', typeof this.prisma.user.findUnique);
      }
      
      console.log('🔍 this.prisma.userConfig存在:', !!this.prisma.userConfig);
      console.log('🔍 this.prisma.modelPointConfig存在:', !!this.prisma.modelPointConfig);
      
      // 尝试实际查询
      if (this.prisma.user && this.prisma.user.findUnique) {
        console.log('\n🧪 尝试查询用户...');
        const testUser = await this.prisma.user.findUnique({
          where: { username: '123456' }
        });
        console.log('✅ 查询成功，用户存在:', !!testUser);
      } else {
        console.log('❌ 无法执行用户查询，user模型不可用');
      }
      
    } catch (error) {
      console.error('❌ 初始化测试失败:', error);
      console.error('❌ 错误堆栈:', error.stack);
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

async function runDebug() {
  const debugDb = new DebugDatabase();
  await debugDb.testInit();
}

runDebug().catch(console.error);