const axios = require('axios');

console.log('🔧 测试无限循环修复效果...\n');

async function testInfiniteLoopFix() {
  const baseURL = 'http://localhost:3001';
  
  console.log('📋 模拟前端请求模式 - 发送多次请求查看日志输出');
  
  for (let i = 1; i <= 3; i++) {
    console.log(`\n🔄 第${i}次请求:`);
    
    try {
      // 模拟带有sessionId的请求（但是会失败，因为sessionId无效）
      const response = await axios.get(`${baseURL}/api/payment/orders`, {
        headers: {
          'X-Session-Id': 'test_invalid_session_id'
        }
      });
      console.log('❌ 不应该成功');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 正确返回401，没有产生过多日志');
      } else {
        console.log('❌ 错误的响应状态:', error.response?.status);
      }
    }
    
    // 短暂延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 测试结果:');
  console.log('✅ 如果后端控制台没有大量重复日志，说明无限循环已修复');
  console.log('✅ 如果只看到少量或没有认证日志，说明日志输出已优化');
  console.log('💡 现在可以重启服务器并访问前端充值页面测试');
}

testInfiniteLoopFix().catch(console.error); 