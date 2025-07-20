const axios = require('axios');

// 测试积分余额API
async function testCreditsBalance() {
  try {
    console.log('🔄 测试积分余额API...');
    
    // 首先测试健康检查
    try {
      const healthResponse = await axios.get('http://localhost:3001/health');
      console.log('✅ 服务器运行正常:', healthResponse.data.status);
    } catch (error) {
      console.log('❌ 服务器未运行或端口3001不可用');
      return;
    }
    
    // 测试积分余额API（需要认证）
    const testSessionId = 'test-session-id';
    
    try {
      const response = await axios.get('http://localhost:3001/api/client/credits', {
        headers: {
          'X-Session-Id': testSessionId,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ 积分余额API响应:', response.data);
    } catch (error) {
      console.log('❌ 积分余额API调用失败:');
      console.log('状态码:', error.response?.status);
      console.log('错误信息:', error.response?.data);
      
      if (error.response?.status === 401) {
        console.log('📝 这是预期的，因为我们没有有效的会话ID');
      }
    }
    
  } catch (error) {
    console.error('测试过程中出现错误:', error.message);
  }
}

testCreditsBalance();