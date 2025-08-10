const axios = require('axios');

console.log('🔧 快速修复验证测试...\n');

async function quickTest() {
  const baseURL = 'http://localhost:3001';
  
  // 测试1: 检查服务器是否正常运行
  console.log('📋 测试1: 检查服务器健康状态');
  try {
    const response = await axios.get(`${baseURL}/api/health`);
    console.log('✅ 服务器正常运行:', response.data);
  } catch (error) {
    console.log('❌ 服务器无法访问:', error.message);
    console.log('💡 请确保服务器已启动: npm run dev');
    return;
  }
  
  // 测试2: 检查支付套餐API（不需要认证）
  console.log('\n📋 测试2: 检查支付套餐API');
  try {
    const response = await axios.get(`${baseURL}/api/payment/packages`);
    console.log('✅ 支付套餐API正常，套餐数量:', response.data.data?.length || 0);
  } catch (error) {
    if (error.response?.status === 500) {
      console.log('❌ 仍有500错误:', error.response.data);
    } else {
      console.log('⚠️ 其他错误:', error.response?.status, error.response?.data?.message);
    }
  }
  
  // 测试3: 检查需要认证的API
  console.log('\n📋 测试3: 检查需要认证的API');
  try {
    const response = await axios.get(`${baseURL}/api/payment/orders`);
    console.log('❌ 不应该成功 - 没有提供认证');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ 正确返回401未授权，认证逻辑正常工作');
    } else if (error.response?.status === 500) {
      console.log('❌ 仍有500错误:', error.response.data);
    } else {
      console.log('⚠️ 其他错误:', error.response?.status, error.response?.data?.message);
    }
  }
  
  console.log('\n🎉 快速修复验证完成！');
  console.log('💡 如果所有测试都通过，说明500错误已修复');
  console.log('💡 现在可以访问前端充值页面测试功能');
}

quickTest().catch(console.error); 