// 测试管理员API调用
const axios = require('axios');

async function testAdminAPI() {
  const baseURL = 'http://localhost:3001';
  
  try {
    console.log('🧪 测试管理员充值套餐API...\n');
    
    // 测试不带session的调用
    console.log('1. 测试无session访问:');
    try {
      const response = await axios.get(`${baseURL}/api/admin/payment-packages`);
      console.log('✅ 成功响应:', response.data);
    } catch (error) {
      if (error.response) {
        console.log('❌ 响应错误:', error.response.status, error.response.data);
      } else {
        console.log('❌ 网络错误:', error.message);
      }
    }
    
    console.log('\n2. 测试带无效session访问:');
    try {
      const response = await axios.get(`${baseURL}/api/admin/payment-packages`, {
        headers: {
          'X-Session-Id': 'invalid-session-id',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ 成功响应:', response.data);
    } catch (error) {
      if (error.response) {
        console.log('❌ 响应错误:', error.response.status, error.response.data);
      } else {
        console.log('❌ 网络错误:', error.message);
      }
    }
    
    console.log('\n3. 测试服务器健康状态:');
    try {
      const response = await axios.get(`${baseURL}/health`);
      console.log('✅ 服务器健康状态:', response.data);
    } catch (error) {
      if (error.response) {
        console.log('❌ 健康检查失败:', error.response.status, error.response.data);
      } else {
        console.log('❌ 网络错误:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程出错:', error.message);
  }
}

testAdminAPI();