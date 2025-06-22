const db = require('./database');

async function testDatabase() {
  try {
    console.log('🔍 测试数据库连接...');
    
    // 测试查找用户
    const user = await db.getUserByUsernameOrEmail('123456');
    console.log('用户查询结果:', user ? '✅ 找到用户' : '❌ 未找到用户');
    
    if (user) {
      console.log('用户信息:', {
        id: user.id,
        username: user.username,
        email: user.email,
        hasPassword: !!user.password
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库错误:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

testDatabase(); 