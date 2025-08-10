const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// 测试用户凭据
const testUser = {
  username: '123456',
  password: '123456'
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 正在登录...');
    const response = await axios.post(`${BASE_URL}/auth/login`, testUser);
    if (response.data.token) {
      authToken = response.data.token;
      console.log('✅ 登录成功');
      return true;
    } else {
      console.error('❌ 登录失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录错误:', error.response?.data || error.message);
    return false;
  }
}

async function testPointsAPI() {
  console.log('🚀 开始测试积分系统API...');
  
  // 1. 登录获取token
  if (!(await login())) {
    console.log('❌ 无法继续测试，登录失败');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // 2. 获取积分余额
    console.log('\n💰 测试获取积分余额...');
    const balanceResponse = await axios.get(`${BASE_URL}/points/balance`, { headers });
    console.log('积分余额:', balanceResponse.data);
    
    // 3. 预检查搜题成本
    console.log('\n🔍 测试预检查搜题成本...');
    const costCheckResponse = await axios.post(`${BASE_URL}/points/check-cost`, {
      modelName: 'gpt-4',
      questionType: 'MULTIPLE_CHOICE'
    }, { headers });
    console.log('成本检查:', costCheckResponse.data);
    
    // 4. 测试充值
    console.log('\n💳 测试积分充值...');
    const rechargeResponse = await axios.post(`${BASE_URL}/points/recharge`, {
      amount: 50,
      description: '测试充值'
    }, { headers });
    console.log('充值结果:', rechargeResponse.data);
    
    // 5. 获取交易记录
    console.log('\n📜 测试获取交易记录...');
    const transactionsResponse = await axios.get(`${BASE_URL}/points/transactions?limit=5`, { headers });
    console.log('交易记录:', transactionsResponse.data);
    
    // 6. 测试搜题API（如果存在）
    console.log('\n🔎 测试搜题API...');
    try {
      const searchResponse = await axios.post(`${BASE_URL}/search/execute`, {
        modelName: 'gpt-4',
        questionType: 'MULTIPLE_CHOICE',
        query: '什么是JavaScript?',
        metadata: { test: true }
      }, { headers });
      console.log('搜题结果:', searchResponse.data);
    } catch (searchError) {
      console.log('搜题API可能未实现或有错误:', searchError.response?.data || searchError.message);
    }
    
    console.log('\n🎉 积分系统API测试完成!');
    
  } catch (error) {
    console.error('❌ API测试失败:', error.response?.data || error.message);
  }
}

// 检查服务器是否运行
async function checkServer() {
  try {
    const response = await axios.get(`${BASE_URL}/../health`);
    console.log('✅ 服务器运行正常:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 服务器未运行或无法访问:', error.message);
    return false;
  }
}

async function main() {
  if (await checkServer()) {
    await testPointsAPI();
  } else {
    console.log('请先启动服务器: npm run dev');
  }
}

main(); 