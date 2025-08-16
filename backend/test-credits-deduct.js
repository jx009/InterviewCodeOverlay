const fetch = require('node-fetch');

async function testCreditsDeduct() {
  const BASE_URL = 'https://quiz.playoffer.cn';
  
  // 这里需要一个有效的session token
  const token = 'ewzGjriTVz8ky7mDkhSl0j45n5iIKm'; // 从日志中看到的token
  
  try {
    console.log('🧪 测试积分扣除API...');
    
    const response = await fetch(`${BASE_URL}/api/client/credits/check-and-deduct`, {
      method: 'POST',
      headers: {
        'X-Session-Id': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        modelName: 'claude-sonnet-4-20250514',
        questionType: 'programming',
        operationId: `test_${Date.now()}`
      })
    });
    
    const data = await response.json();
    
    console.log('📊 API响应状态:', response.status);
    console.log('📊 API响应数据:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ API调用成功');
      console.log(`💰 积分变化: ${data.currentPoints} -> ${data.newBalance}`);
      console.log(`🔢 事务ID: ${data.transactionId}`);
    } else {
      console.log('❌ API调用失败:', data.message);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testCreditsDeduct();