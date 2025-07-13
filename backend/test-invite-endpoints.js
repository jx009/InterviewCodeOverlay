const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const USER_ID = 8;

async function testInviteEndpoints() {
  console.log('🧪 开始测试邀请系统API端点...\n');
  
  try {
    // 测试统计端点
    console.log('1. 测试邀请统计端点...');
    const statsResponse = await axios.get(`${BASE_URL}/api/invite/stats?userId=${USER_ID}`);
    console.log('✅ 统计端点正常:', statsResponse.data);
    console.log('');
    
    // 测试注册记录端点
    console.log('2. 测试邀请注册记录端点...');
    const registrationsResponse = await axios.get(`${BASE_URL}/api/invite/registrations?userId=${USER_ID}&page=1&limit=10`);
    console.log('✅ 注册记录端点正常:', registrationsResponse.data);
    console.log('');
    
    // 测试充值记录端点
    console.log('3. 测试邀请充值记录端点...');
    const rechargesResponse = await axios.get(`${BASE_URL}/api/invite/recharges?userId=${USER_ID}&page=1&limit=10`);
    console.log('✅ 充值记录端点正常:', rechargesResponse.data);
    console.log('');
    
    console.log('🎉 所有邀请系统API端点测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testInviteEndpoints(); 