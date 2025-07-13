const axios = require('axios');

async function testAuthAndPayment() {
  console.log('🧪 快速认证和支付测试\n');

  const baseURL = 'http://localhost:3001';
  
  // 测试1: 健康检查
  try {
    const health = await axios.get(`${baseURL}/health`);
    console.log('✅ 后端服务正常:', health.status);
  } catch (error) {
    console.log('❌ 后端服务异常:', error.message);
    return;
  }

  // 测试2: 支付套餐（无需认证）
  try {
    const packages = await axios.get(`${baseURL}/api/payment/packages`);
    console.log('✅ 支付套餐API正常:', packages.data.data?.length || 0, '个套餐');
  } catch (error) {
    console.log('❌ 支付套餐API失败:', error.response?.status, error.response?.data?.message);
  }

  // 测试3: 模拟sessionId认证
  const mockSessionId = 'test_session_' + Date.now();
  try {
    const orders = await axios.get(`${baseURL}/api/payment/orders`, {
      headers: { 'X-Session-Id': mockSessionId }
    });
    console.log('❌ 意外成功：无效sessionId却通过了认证');
  } catch (error) {
    console.log('✅ 预期失败：无效sessionId被正确拒绝');
    console.log('   错误信息:', error.response?.data?.message);
  }

  console.log('\n💡 解决方案:');
  console.log('1. 确保前端有有效的sessionId');
  console.log('2. 或者确保前端有有效的JWT token');
  console.log('3. 微信支付不需要证书文件（基础功能）');
  console.log('4. 检查浏览器控制台的请求头');
}

testAuthAndPayment().catch(console.error); 