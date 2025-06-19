const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// 测试用户凭据
const testCredentials = {
  username: '123456',
  password: '123456'
};

async function testWebConfigAPI() {
  console.log('🔧 测试Web端配置API...\n');
  
  try {
    // 1. 登录获取token
    console.log('1️⃣ 登录获取访问令牌...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, testCredentials);
    const { token } = loginResponse.data;
    console.log('✅ 登录成功，获得token');
    
    // 设置认证头
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. 获取当前配置
    console.log('\n2️⃣ 获取当前用户配置...');
    const getConfigResponse = await axios.get(`${API_BASE}/config`, { headers: authHeaders });
    const currentConfig = getConfigResponse.data;
    console.log('📋 当前配置:', {
      aiModel: currentConfig.aiModel,
      programmingModel: currentConfig.programmingModel,
      multipleChoiceModel: currentConfig.multipleChoiceModel,
      language: currentConfig.language
    });
    
    // 3. 更新配置
    console.log('\n3️⃣ 更新配置...');
    const newConfig = {
      programmingModel: 'gpt-4o',
      multipleChoiceModel: 'claude-3-sonnet',
      language: 'javascript'
    };
    
    console.log('🔄 发送配置更新:', newConfig);
    const updateResponse = await axios.put(`${API_BASE}/config`, newConfig, { headers: authHeaders });
    const updatedConfig = updateResponse.data;
    console.log('✅ 配置更新成功');
    
    // 4. 验证配置是否正确保存
    console.log('\n4️⃣ 重新获取配置验证...');
    const verifyResponse = await axios.get(`${API_BASE}/config`, { headers: authHeaders });
    const verifiedConfig = verifyResponse.data;
    
    console.log('🔍 验证后的配置:', {
      aiModel: verifiedConfig.aiModel,
      programmingModel: verifiedConfig.programmingModel,
      multipleChoiceModel: verifiedConfig.multipleChoiceModel,
      language: verifiedConfig.language
    });
    
    // 5. 检查配置是否正确保存
    console.log('\n5️⃣ 配置保存验证结果:');
    
    const isSuccess = 
      verifiedConfig.programmingModel === newConfig.programmingModel &&
      verifiedConfig.multipleChoiceModel === newConfig.multipleChoiceModel &&
      verifiedConfig.language === newConfig.language;
    
    if (isSuccess) {
      console.log('✅ 配置保存测试成功！');
      console.log('   - 编程题模型已正确保存为:', verifiedConfig.programmingModel);
      console.log('   - 选择题模型已正确保存为:', verifiedConfig.multipleChoiceModel);
      console.log('   - 编程语言已正确保存为:', verifiedConfig.language);
    } else {
      console.log('❌ 配置保存测试失败！');
      console.log('   期望:', newConfig);
      console.log('   实际:', {
        programmingModel: verifiedConfig.programmingModel,
        multipleChoiceModel: verifiedConfig.multipleChoiceModel,
        language: verifiedConfig.language
      });
    }
    
    // 6. 恢复原始配置
    console.log('\n6️⃣ 恢复原始配置...');
    const restoreConfig = {
      programmingModel: currentConfig.programmingModel || 'claude-3-5-sonnet-20241022',
      multipleChoiceModel: currentConfig.multipleChoiceModel || 'claude-3-5-sonnet-20241022',
      language: currentConfig.language || 'python'
    };
    
    await axios.put(`${API_BASE}/config`, restoreConfig, { headers: authHeaders });
    console.log('✅ 已恢复原始配置');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response ? error.response.data : error.message);
    
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

// 运行测试
if (require.main === module) {
  console.log('🧪 Web端配置API测试');
  console.log('====================================\n');
  
  testWebConfigAPI().then(() => {
    console.log('\n====================================');
    console.log('🏁 测试完成');
    process.exit(0);
  }).catch((error) => {
    console.error('🚨 测试异常:', error);
    process.exit(1);
  });
}

module.exports = { testWebConfigAPI }; 