// 测试修改后的Database类
const Database = require('./database');

async function testDatabase() {
  console.log('🚀 开始测试Database类...');
  
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

testDatabase().catch(console.error);