const axios = require('axios');

async function testServer() {
  console.log('🧪 测试服务器...');
  
  try {
    // 直接测试邀请API
    console.log('测试邀请API...');
    const response = await axios.get('http://localhost:3001/api/invite/stats');
    console.log('响应:', response.data);
  } catch (error) {
    console.log('错误状态:', error.response?.status);
    console.log('错误信息:', error.response?.data || error.message);
  }
}

testServer(); 