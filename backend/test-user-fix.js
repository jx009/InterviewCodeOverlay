// 测试用户模型修复
const Database = require('./database');

async function testUserFix() {
  console.log('🚀 开始测试用户模型修复...');
  
  const db = new Database();
  
  try {
    await db.prisma.$connect();
    console.log('✅ 数据库连接成功');
    
    // 测试getUserByUsername
    console.log('🧪 测试getUserByUsername...');
    const testUser = await db.getUserByUsername('123456');
    console.log('✅ 查询成功，用户存在:', !!testUser);
    
    if (testUser) {
      console.log('👤 用户信息:');
      console.log('  - 用户名:', testUser.username);
      console.log('  - 邮箱:', testUser.email);
      console.log('  - 积分:', testUser.points);
      console.log('  - 配置存在:', !!testUser.user_configs);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await db.close();
  }
}

testUserFix().catch(console.error);