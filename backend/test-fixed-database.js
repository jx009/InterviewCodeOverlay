// 测试修复的Database类
const Database = require('./database-fixed');

async function testFixedDatabase() {
  console.log('🚀 开始测试修复的Database类...');
  
  const db = new Database();
  
  try {
    console.log('📝 调用init方法...');
    await db.init();
    console.log('✅ Database初始化完成');
  } catch (error) {
    console.error('❌ Database初始化失败:', error);
  } finally {
    await db.close();
  }
}

testFixedDatabase().catch(console.error);