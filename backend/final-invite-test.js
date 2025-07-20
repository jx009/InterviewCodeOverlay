const axios = require('axios');

async function testAllInviteAPIs() {
  const baseURL = 'http://localhost:3001';
  const userId = 8;
  
  console.log('🎯 开始测试所有邀请API...\n');
  
  try {
    // 1. 测试邀请统计API
    console.log('1. 📊 测试邀请统计API...');
    const statsResponse = await axios.get(`${baseURL}/api/invite/stats?userId=${userId}`);
    console.log('✅ 邀请统计:', {
      总邀请用户: statsResponse.data.data.totalInvitedUsers,
      充值用户数: statsResponse.data.data.totalRechargeUsers,
      累计充值金额: `¥${statsResponse.data.data.totalRechargeAmount}`
    });
    
    // 2. 测试邀请注册记录API
    console.log('\n2. 👥 测试邀请注册记录API...');
    const registrationsResponse = await axios.get(`${baseURL}/api/invite/registrations?userId=${userId}&page=1&limit=10`);
    console.log('✅ 注册记录:', {
      总数: registrationsResponse.data.data.total,
      当前页: registrationsResponse.data.data.page,
      记录数: registrationsResponse.data.data.registrations.length
    });
    
    if (registrationsResponse.data.data.registrations.length > 0) {
      console.log('   示例记录:', registrationsResponse.data.data.registrations[0]);
    }
    
    // 3. 测试邀请充值记录API
    console.log('\n3. 💰 测试邀请充值记录API...');
    const rechargesResponse = await axios.get(`${baseURL}/api/invite/recharges?userId=${userId}&page=1&limit=10`);
    console.log('✅ 充值记录:', {
      总数: rechargesResponse.data.data.total,
      当前页: rechargesResponse.data.data.page,
      记录数: rechargesResponse.data.data.recharges.length
    });
    
    if (rechargesResponse.data.data.recharges.length > 0) {
      const recharge = rechargesResponse.data.data.recharges[0];
      console.log('   示例记录:', {
        订单号: recharge.orderNo,
        用户: recharge.user.username,
        金额: `¥${recharge.amount}`,
        积分: recharge.points,
        支付时间: recharge.paymentTime
      });
    }
    
    console.log('\n🎉 所有邀请API测试通过！');
    console.log('\n📋 API总结:');
    console.log('- GET /api/invite/stats?userId=8 - 获取邀请统计数据');
    console.log('- GET /api/invite/registrations?userId=8&page=1&limit=10 - 获取邀请注册记录');
    console.log('- GET /api/invite/recharges?userId=8&page=1&limit=10 - 获取邀请充值记录');
    console.log('\n✨ 前端现在可以正常调用这些API了！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testAllInviteAPIs(); 