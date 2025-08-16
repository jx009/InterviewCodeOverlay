// 调试API调用，检查前端实际调用的数据源
const axios = require('axios');

async function testAPICall() {
  try {
    console.log('🔍 测试前端实际调用的API端点...\n');
    
    // 测试localhost API
    console.log('1. 测试 http://localhost:3001/api/payment/packages');
    try {
      const response1 = await axios.get('http://localhost:3001/api/payment/packages', {
        timeout: 5000
      });
      console.log('✅ localhost返回数据:', JSON.stringify(response1.data, null, 2));
    } catch (error) {
      console.log('❌ localhost请求失败:', error.message);
    }
    
    // 测试HTTPS API
    console.log('\n2. 测试 https://quiz.playoffer.cn/api/payment/packages');
    try {
      const response2 = await axios.get('https://quiz.playoffer.cn/api/payment/packages', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      console.log('✅ HTTPS返回数据:', JSON.stringify(response2.data, null, 2));
    } catch (error) {
      console.log('❌ HTTPS请求失败:', error.message);
    }
    
    // 检查前端基础API URL配置
    console.log('\n🎯 前端应该调用的API地址：');
    console.log('开发环境: https://quiz.playoffer.cn/api/payment/packages');
    console.log('生产环境: https://quiz.playoffer.cn/api/payment/packages');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testAPICall();