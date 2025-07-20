const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const USER_ID = 8;

// 模拟前端的API调用
async function testFrontendAPICalls() {
  console.log('🧪 模拟前端API调用测试...\n');
  
  // 创建axios实例，模拟前端配置
  const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  // 添加请求拦截器，模拟前端的认证头
  api.interceptors.request.use((config) => {
    // 模拟前端可能发送的headers
    config.headers['X-User-Id'] = USER_ID;
    config.headers['X-Session-Id'] = 'mock-session-id';
    console.log(`🔍 发送请求: ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`   Headers:`, config.headers);
    return config;
  });

  const endpoints = [
    {
      name: '邀请统计',
      url: '/invite/stats',
      params: { userId: USER_ID }
    },
    {
      name: '邀请注册记录',
      url: '/invite/registrations',
      params: { userId: USER_ID, page: 1, limit: 10 }
    },
    {
      name: '邀请充值记录',
      url: '/invite/recharges',
      params: { userId: USER_ID, page: 1, limit: 10 }
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 测试 ${endpoint.name}...`);
      
      const response = await api.get(endpoint.url, {
        params: endpoint.params
      });
      
      console.log(`✅ ${endpoint.name} 成功 (状态码: ${response.status})`);
      console.log(`   响应数据:`, JSON.stringify(response.data, null, 2));
      successCount++;
      
    } catch (error) {
      console.error(`❌ ${endpoint.name} 失败:`);
      if (error.response) {
        console.error(`   状态码: ${error.response.status}`);
        console.error(`   响应数据:`, error.response.data);
      } else if (error.request) {
        console.error(`   网络错误: 无响应`);
      } else {
        console.error(`   错误信息: ${error.message}`);
      }
      failCount++;
    }
    
    console.log(''); // 空行分隔
  }

  console.log('📊 测试结果总结:');
  console.log(`   成功: ${successCount}/${endpoints.length}`);
  console.log(`   失败: ${failCount}/${endpoints.length}`);
  
  if (failCount === 0) {
    console.log('🎉 所有前端API调用模拟测试通过！');
  } else {
    console.log('⚠️ 部分API调用失败，请检查问题');
  }
}

testFrontendAPICalls().catch(console.error); 