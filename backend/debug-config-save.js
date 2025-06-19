const axios = require('axios');
const db = require('./database.js');

const API_BASE = 'http://localhost:3001/api';

// 测试用户凭据
const testCredentials = {
  username: '123456',
  password: '123456'
};

async function debugConfigSave() {
  console.log('🔧 配置保存问题调试...\n');
  
  try {
    // 1. 检查数据库状态
    console.log('1️⃣ 检查数据库状态...');
    await db.init();
    
    // 检查表结构
    await new Promise((resolve) => {
      db.db.all('PRAGMA table_info(user_configs)', (err, rows) => {
        if (err) {
          console.error('❌ 检查表结构失败:', err);
          resolve();
          return;
        }
        
        const hasProgammingModel = rows.some(row => row.name === 'programming_model');
        const hasMultipleChoiceModel = rows.some(row => row.name === 'multiple_choice_model');
        
        console.log('📋 数据库字段检查:');
        console.log(`  - programming_model: ${hasProgammingModel ? '✅ 存在' : '❌ 缺失'}`);
        console.log(`  - multiple_choice_model: ${hasMultipleChoiceModel ? '✅ 存在' : '❌ 缺失'}`);
        resolve();
      });
    });
    
    // 2. 测试API
    console.log('\n2️⃣ 测试API...');
    
    // 登录
    console.log('登录获取token...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, testCredentials);
    const { token } = loginResponse.data;
    console.log('✅ 登录成功');
    
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 获取当前配置
    console.log('\n获取当前配置...');
    const getConfigResponse = await axios.get(`${API_BASE}/config`, { headers: authHeaders });
    const currentConfig = getConfigResponse.data;
    console.log('📋 当前配置:', currentConfig);
    
    // 3. 直接检查数据库中的配置
    console.log('\n3️⃣ 直接检查数据库中的配置...');
    await new Promise((resolve) => {
      db.db.all('SELECT * FROM user_configs', (err, rows) => {
        if (err) {
          console.error('❌ 查询数据库失败:', err);
          resolve();
          return;
        }
        
        console.log('🗄️ 数据库中的配置:');
        rows.forEach((config, index) => {
          console.log(`配置 ${index + 1} (用户ID: ${config.user_id}):`);
          console.log(`  - ai_model: ${config.ai_model}`);
          console.log(`  - programming_model: ${config.programming_model || '(null)'}`);
          console.log(`  - multiple_choice_model: ${config.multiple_choice_model || '(null)'}`);
          console.log(`  - language: ${config.language}`);
        });
        resolve();
      });
    });
    
    // 4. 测试配置更新
    console.log('\n4️⃣ 测试配置更新...');
    const testConfig = {
      programmingModel: 'gpt-4o-test',
      multipleChoiceModel: 'claude-3-sonnet-test',
      language: 'javascript'
    };
    
    console.log('🔄 发送配置更新:', testConfig);
    
    try {
      const updateResponse = await axios.put(`${API_BASE}/config`, testConfig, { headers: authHeaders });
      console.log('✅ API响应:', updateResponse.data);
    } catch (apiError) {
      console.error('❌ API更新失败:', apiError.response ? apiError.response.data : apiError.message);
    }
    
    // 5. 再次检查数据库
    console.log('\n5️⃣ 更新后检查数据库...');
    await new Promise((resolve) => {
      db.db.all('SELECT * FROM user_configs', (err, rows) => {
        if (err) {
          console.error('❌ 查询数据库失败:', err);
          resolve();
          return;
        }
        
        console.log('🗄️ 更新后数据库中的配置:');
        rows.forEach((config, index) => {
          console.log(`配置 ${index + 1} (用户ID: ${config.user_id}):`);
          console.log(`  - ai_model: ${config.ai_model}`);
          console.log(`  - programming_model: ${config.programming_model || '(null)'}`);
          console.log(`  - multiple_choice_model: ${config.multiple_choice_model || '(null)'}`);
          console.log(`  - language: ${config.language}`);
        });
        resolve();
      });
    });
    
    // 6. 再次通过API获取配置
    console.log('\n6️⃣ 通过API重新获取配置...');
    const verifyResponse = await axios.get(`${API_BASE}/config`, { headers: authHeaders });
    const verifiedConfig = verifyResponse.data;
    console.log('📋 API返回的配置:', verifiedConfig);
    
    // 7. 对比结果
    console.log('\n7️⃣ 结果对比:');
    const isSuccess = 
      verifiedConfig.programmingModel === testConfig.programmingModel &&
      verifiedConfig.multipleChoiceModel === testConfig.multipleChoiceModel &&
      verifiedConfig.language === testConfig.language;
    
    if (isSuccess) {
      console.log('✅ 配置保存测试成功！');
    } else {
      console.log('❌ 配置保存测试失败！');
      console.log('期望:', testConfig);
      console.log('实际:', {
        programmingModel: verifiedConfig.programmingModel,
        multipleChoiceModel: verifiedConfig.multipleChoiceModel,
        language: verifiedConfig.language
      });
    }
    
    db.close();
    
  } catch (error) {
    console.error('🚨 调试过程出错:', error);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行调试
if (require.main === module) {
  console.log('🐛 Web端配置保存问题调试');
  console.log('====================================\n');
  
  debugConfigSave().then(() => {
    console.log('\n====================================');
    console.log('🏁 调试完成');
    process.exit(0);
  }).catch((error) => {
    console.error('🚨 调试异常:', error);
    process.exit(1);
  });
}

module.exports = { debugConfigSave }; 