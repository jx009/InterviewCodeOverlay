// 测试LLM配置数据库连接
const mysql = require('mysql2/promise');

async function testLLMConfigDB() {
  try {
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'interview_user',
      password: 'safe_password_2024!',
      database: 'interview_coder'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 检查llm_config表是否存在
    const [tables] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'interview_coder' AND table_name = 'llm_config'
    `);
    
    console.log('📋 llm_config表存在检查:', tables[0]);
    
    if (tables[0].count > 0) {
      // 查询llm_config表的数据
      const [configs] = await connection.execute(`
        SELECT config_key, config_value, is_active FROM llm_config
      `);
      
      console.log('📦 llm_config表中的数据:');
      configs.forEach((config, index) => {
        console.log(`  ${index + 1}. ${config.config_key}: ${config.config_value} (active: ${config.is_active})`);
      });
      
      // 查询激活的配置
      const [activeConfigs] = await connection.execute(`
        SELECT config_key, config_value FROM llm_config WHERE is_active = 1
      `);
      
      console.log('\n📦 激活的配置:');
      activeConfigs.forEach((config, index) => {
        console.log(`  ${index + 1}. ${config.config_key}: ${config.config_value}`);
      });
      
      if (activeConfigs.length > 0) {
        const configObj = {};
        activeConfigs.forEach(config => {
          configObj[config.config_key] = config.config_value;
        });

        const llmConfig = {
          baseUrl: configObj.base_url || 'https://ismaque.org/v1',
          apiKey: configObj.api_key || 'sk-default',
          maxRetries: parseInt(configObj.max_retries || '2'),
          timeout: parseInt(configObj.timeout || '30000'),
          provider: configObj.provider || 'ismaque'
        };

        console.log('\n🔧 构建的LLM配置:');
        console.log(`  Provider: ${llmConfig.provider}`);
        console.log(`  Base URL: ${llmConfig.baseUrl}`);
        console.log(`  API Key: ${llmConfig.apiKey.substring(0, 10)}...`);
        console.log(`  Max Retries: ${llmConfig.maxRetries}`);
        console.log(`  Timeout: ${llmConfig.timeout}`);
      } else {
        console.log('⚠️ 没有激活的配置');
      }
    } else {
      console.log('❌ llm_config表不存在');
    }
    
    await connection.end();
    console.log('✅ 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 数据库测试失败:', error);
  }
}

console.log('===== LLM配置数据库测试 =====');
testLLMConfigDB();