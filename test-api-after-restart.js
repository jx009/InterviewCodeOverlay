// 测试重启后的LLM配置API
const fetch = require('node-fetch');

const BASE_URL = 'https://quiz.playoffer.cn';
const TEST_SESSION_TOKEN = 'ewzGjriTVz8ky7mDkhSl0j45n5iIKm';

async function testLLMConfigAPI() {
  console.log('🚀 测试重启后的LLM配置API...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/llm/config`, {
      method: 'GET',
      headers: {
        'X-Session-Id': TEST_SESSION_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 响应状态:', response.status, response.statusText);
    
    if (response.status === 404) {
      console.log('❌ API仍然返回404 - 后端服务器可能未重启');
      console.log('💡 请重启后端服务器以加载新的LLM配置路由');
      return;
    }
    
    const data = await response.json();
    console.log('📦 响应数据:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ LLM配置API工作正常!');
      console.log('🔧 配置来源:', data.source);
      
      if (data.source === 'database') {
        console.log('🎉 成功从数据库读取配置!');
      } else if (data.source === 'default' || data.source === 'fallback') {
        console.log('⚠️ 使用默认配置，可能是数据库表为空');
      }
      
      console.log('🏭 提供商:', data.config.provider);
      console.log('🌐 基础URL:', data.config.baseUrl);
    } else {
      console.log('❌ API请求失败:', data.error);
    }
  } catch (error) {
    console.error('❌ 请求异常:', error.message);
    console.log('💡 请确认后端服务器已重启并运行正常');
  }
}

console.log('===== LLM配置API测试 =====');
console.log('使用Session Token:', TEST_SESSION_TOKEN.substring(0, 10) + '...');
console.log('API端点:', `${BASE_URL}/api/llm/config`);
console.log('');

testLLMConfigAPI();