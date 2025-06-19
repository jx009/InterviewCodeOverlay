const axios = require('axios');

// 测试新的模型配置API
async function testNewModelAPI() {
  const baseURL = 'http://localhost:3001/api';
  
  try {
    console.log('🧪 测试新的模型配置API...\n');

    // 测试获取模型列表
    console.log('1. 测试获取AI模型列表...');
    try {
      const modelsResponse = await axios.get(`${baseURL}/config/models`, {
        headers: {
          'Authorization': 'Bearer dummy-token-for-test'
        }
      });
      console.log('✅ 模型列表获取成功');
      console.log('可用模型数量:', Object.keys(modelsResponse.data.data.models).length);
    } catch (error) {
      console.log('❌ 模型列表获取失败:', error.response?.data?.error || error.message);
    }

    // 测试创建用户配置
    console.log('\n2. 测试创建用户配置...');
    const testConfig = {
      programmingModel: 'claude-3-5-sonnet-20241022',
      multipleChoiceModel: 'claude-3-5-sonnet-20241022',
      language: 'python',
      selectedProvider: 'claude'
    };

    try {
      const configResponse = await axios.put(`${baseURL}/config`, testConfig, {
        headers: {
          'Authorization': 'Bearer dummy-token-for-test',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ 配置创建/更新成功');
      console.log('返回的配置包含新字段:', {
        programmingModel: configResponse.data.data.programmingModel,
        multipleChoiceModel: configResponse.data.data.multipleChoiceModel
      });
    } catch (error) {
      console.log('❌ 配置创建/更新失败:', error.response?.data?.error || error.message);
    }

    // 测试获取用户配置
    console.log('\n3. 测试获取用户配置...');
    try {
      const getConfigResponse = await axios.get(`${baseURL}/config`, {
        headers: {
          'Authorization': 'Bearer dummy-token-for-test'
        }
      });
      console.log('✅ 配置获取成功');
      console.log('配置包含新字段:', {
        programmingModel: getConfigResponse.data.data.programmingModel,
        multipleChoiceModel: getConfigResponse.data.data.multipleChoiceModel
      });
    } catch (error) {
      console.log('❌ 配置获取失败:', error.response?.data?.error || error.message);
    }

    console.log('\n🎉 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testNewModelAPI(); 