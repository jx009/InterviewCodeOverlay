const fetch = require('node-fetch');

console.log('🔍 测试session_status端点...');

const BASE_URL = 'http://localhost:3001';

async function testSessionStatus() {
  console.log('1. 测试没有sessionId的情况...');
  try {
    const response = await fetch(`${BASE_URL}/api/session_status`);
    const data = await response.json();
    console.log('✅ 没有sessionId的响应:', data);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  console.log('\n2. 测试有sessionId但无效的情况...');
  try {
    const response = await fetch(`${BASE_URL}/api/session_status`, {
      headers: {
        'X-Session-Id': 'invalid-session-id'
      }
    });
    const data = await response.json();
    console.log('✅ 无效sessionId的响应:', data);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }

  console.log('\n3. 测试数据库连接...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    console.log('✅ 健康检查响应:', data);
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
  }

  console.log('\n4. 测试支付API端点...');
  try {
    const response = await fetch(`${BASE_URL}/api/payment/packages`, {
      headers: {
        'X-Session-Id': 'test-session-id'
      }
    });
    const data = await response.json();
    console.log('✅ 支付套餐响应:', data);
  } catch (error) {
    console.error('❌ 支付套餐测试失败:', error.message);
  }
}

// 等待服务启动
setTimeout(testSessionStatus, 3000); 