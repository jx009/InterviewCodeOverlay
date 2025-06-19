const db = require('./database.js');

async function checkDatabase() {
  console.log('🔍 检查数据库状态...\n');
  
  try {
    // 初始化数据库
    await db.init();
    console.log('✅ 数据库初始化完成\n');
    
    // 检查表结构
    console.log('📋 检查user_configs表结构:');
    db.db.all('PRAGMA table_info(user_configs)', (err, rows) => {
      if (err) {
        console.error('❌ 检查表结构失败:', err);
        return;
      }
      
      console.log('字段列表:');
      rows.forEach(row => {
        console.log(`  - ${row.name}: ${row.type} (默认: ${row.dflt_value})`);
      });
      
      // 检查是否有新字段
      const hasProgammingModel = rows.some(row => row.name === 'programming_model');
      const hasMultipleChoiceModel = rows.some(row => row.name === 'multiple_choice_model');
      
      console.log('\n🔍 新字段检查:');
      console.log(`  - programming_model: ${hasProgammingModel ? '✅ 存在' : '❌ 缺失'}`);
      console.log(`  - multiple_choice_model: ${hasMultipleChoiceModel ? '✅ 存在' : '❌ 缺失'}`);
      
      // 检查用户配置数据
      console.log('\n📊 检查用户配置数据:');
      db.db.all('SELECT * FROM user_configs', (err, configRows) => {
        if (err) {
          console.error('❌ 查询配置失败:', err);
          return;
        }
        
        if (configRows.length === 0) {
          console.log('⚠️  没有找到任何用户配置');
        } else {
          console.log(`找到 ${configRows.length} 个用户配置:`);
          configRows.forEach((config, index) => {
            console.log(`\n配置 ${index + 1} (用户ID: ${config.user_id}):`);
            console.log(`  - ai_model: ${config.ai_model}`);
            console.log(`  - programming_model: ${config.programming_model || '(null)'}`);
            console.log(`  - multiple_choice_model: ${config.multiple_choice_model || '(null)'}`);
            console.log(`  - language: ${config.language}`);
          });
        }
        
        db.close();
        console.log('\n🏁 检查完成');
      });
    });
    
  } catch (error) {
    console.error('❌ 数据库检查失败:', error);
  }
}

checkDatabase(); 