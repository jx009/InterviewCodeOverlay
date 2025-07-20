const axios = require('axios');

// 测试配置
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_SESSION_ID = 'test_session_123'; // 这个需要是有效的sessionId

// 测试用例
async function testPaymentAuth() {
  console.log('🔍 测试支付API认证修复效果...\n');
  
  // 测试1: 没有sessionId的情况
  console.log('📋 测试1: 没有sessionId的请求');
  try {
    const response = await axios.get(`${API_BASE_URL}/payment/packages`);
    console.log('✅ 获取支付套餐成功（不需要认证）');
  } catch (error) {
    console.log('❌ 获取支付套餐失败:', error.response?.data?.message || error.message);
  }
  
  // 测试2: 需要认证的接口 - 没有sessionId
  console.log('\n📋 测试2: 需要认证的接口 - 没有sessionId');
  try {
    const response = await axios.get(`${API_BASE_URL}/payment/orders`);
    console.log('❌ 不应该成功 - 没有sessionId');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ 正确返回401未授权:', error.response.data.message);
    } else {
      console.log('❌ 错误的响应:', error.response?.data || error.message);
    }
  }
  
  // 测试3: 需要认证的接口 - 有sessionId但无效
  console.log('\n📋 测试3: 需要认证的接口 - 有sessionId但无效');
  try {
    const response = await axios.get(`${API_BASE_URL}/payment/orders`, {
      headers: {
        'X-Session-Id': 'invalid_session_id'
      }
    });
    console.log('❌ 不应该成功 - 无效sessionId');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ 正确返回401未授权:', error.response.data.message);
    } else {
      console.log('❌ 错误的响应:', error.response?.data || error.message);
    }
  }
  
  // 测试4: 需要认证的接口 - 有效sessionId（需要真实的会话）
  console.log('\n📋 测试4: 需要认证的接口 - 有效sessionId');
  console.log('⚠️ 此测试需要真实的会话ID，请通过前端登录后获取');
  
  console.log('\n✅ 认证修复测试完成！');
  console.log('💡 下一步：');
  console.log('1. 启动服务器: npm run dev');
  console.log('2. 访问前端充值页面');
  console.log('3. 检查是否能正常加载支付套餐和订单列表');
}

// 运行测试
testPaymentAuth().catch(console.error); 