const axios = require('axios');

async function debugInviteAPI() {
  const baseURL = 'http://localhost:3001';
  
  try {
    // 1. 首先测试健康检查
    console.log('🔍 1. 测试健康检查...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ 健康检查成功:', healthResponse.data);
    
    // 2. 测试邀请注册记录API
    console.log('\n🔍 2. 测试邀请注册记录API...');
    const registrationsResponse = await axios.get(`${baseURL}/api/invite/registrations?userId=8&page=1&limit=10`);
    console.log('✅ 邀请注册记录:', registrationsResponse.data);
    
    // 3. 测试邀请充值记录API
    console.log('\n🔍 3. 测试邀请充值记录API...');
    const rechargesResponse = await axios.get(`${baseURL}/api/invite/recharges?userId=8&page=1&limit=10`);
    console.log('✅ 邀请充值记录:', rechargesResponse.data);
    
    console.log('\n🎉 所有测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    if (error.code) {
      console.error('错误代码:', error.code);
    }
  }
}

debugInviteAPI(); 