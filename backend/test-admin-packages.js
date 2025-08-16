// 测试server-simple.js中新增的管理员充值套餐接口
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAdminPackagesAPI() {
  console.log('🧪 测试管理员充值套餐接口...');
  
  try {
    // 1. 测试获取充值套餐列表（需要管理员权限）
    console.log('\n1. 测试获取充值套餐列表...');
    
    const response = await axios.get(`${BASE_URL}/api/admin/payment-packages`, {
      headers: {
        'Content-Type': 'application/json',
        // 注意：这里需要有效的管理员会话token
        'Authorization': 'Bearer admin-token-here'
      }
    });
    
    console.log('✅ 获取套餐列表成功');
    console.log('返回数据格式:', Object.keys(response.data));
    console.log('套餐数量:', response.data.packages?.length || 0);
    
    if (response.data.packages && response.data.packages.length > 0) {
      console.log('套餐示例:', response.data.packages[0]);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ 请求失败:', error.response.status, error.response.data);
      if (error.response.status === 403) {
        console.log('💡 这是正常的，因为需要管理员权限认证');
      }
    } else {
      console.error('❌ 网络错误:', error.message);
    }
  }
  
  // 2. 测试普通支付接口（无需权限）
  console.log('\n2. 测试普通支付套餐接口...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/payment/packages`);
    
    console.log('✅ 普通接口成功');
    console.log('返回数据格式:', Object.keys(response.data));
    console.log('套餐数量:', response.data.data?.length || 0);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('套餐示例:', response.data.data[0]);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ 普通接口失败:', error.response.status, error.response.data);
    } else {
      console.error('❌ 网络错误:', error.message);
    }
  }
}

testAdminPackagesAPI();