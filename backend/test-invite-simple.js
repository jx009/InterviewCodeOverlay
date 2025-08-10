const axios = require('axios');

async function testInviteAPI() {
  const baseURL = 'http://localhost:3001';
  
  try {
    console.log('🔍 测试邀请注册记录API...');
    const registrationsResponse = await axios.get(`${baseURL}/api/invite/registrations?userId=8&page=1&limit=10`);
    console.log('✅ 邀请注册记录:', registrationsResponse.data);
    
    console.log('\n🔍 测试邀请充值记录API...');
    const rechargesResponse = await axios.get(`${baseURL}/api/invite/recharges?userId=8&page=1&limit=10`);
    console.log('✅ 邀请充值记录:', rechargesResponse.data);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testInviteAPI(); 