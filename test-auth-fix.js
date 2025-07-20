const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAuthAPI() {
  console.log('🧪 开始测试认证API...\n');

  try {
    // 1. 测试健康检查端点（无需认证）
    console.log('1. 测试健康检查端点...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 健康检查成功:', healthResponse.data);
    
    // 2. 测试获取支付套餐（需要认证）
    console.log('\n2. 测试支付套餐端点（需要认证）...');
    try {
      const packagesResponse = await axios.get(`${BASE_URL}/payment/packages`);
      console.log('✅ 支付套餐请求成功:', packagesResponse.data);
    } catch (error) {
      console.log('❌ 支付套餐请求失败 (预期):', error.response?.data?.message || error.message);
    }
    
    // 3. 测试用户订单端点（需要认证）
    console.log('\n3. 测试用户订单端点（需要认证）...');
    try {
      const ordersResponse = await axios.get(`${BASE_URL}/payment/orders`);
      console.log('✅ 用户订单请求成功:', ordersResponse.data);
    } catch (error) {
      console.log('❌ 用户订单请求失败 (预期):', error.response?.data?.message || error.message);
    }
    
    // 4. 测试登录端点
    console.log('\n4. 测试登录功能...');
    
    // 创建测试用户的登录请求（可以先注册一个测试用户）
    const testLoginData = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    try {
      const loginResponse = await axios.post(`${BASE_URL}/login`, testLoginData);
      console.log('✅ 登录请求响应:', loginResponse.data);
      
      if (loginResponse.data.success && loginResponse.data.token) {
        console.log('🔑 获得认证令牌:', loginResponse.data.token.substring(0, 20) + '...');
        
        // 5. 使用令牌测试需要认证的API
        console.log('\n5. 使用令牌测试认证API...');
        
        const authHeaders = {
          'Authorization': `Bearer ${loginResponse.data.token}`,
          'X-Session-Id': loginResponse.data.sessionId || 'test-session'
        };
        
        try {
          const authedPackagesResponse = await axios.get(`${BASE_URL}/payment/packages`, {
            headers: authHeaders
          });
          console.log('✅ 使用令牌获取支付套餐成功:', authedPackagesResponse.data.success);
        } catch (error) {
          console.log('❌ 使用令牌获取支付套餐失败:', error.response?.data?.message || error.message);
        }
        
        try {
          const authedOrdersResponse = await axios.get(`${BASE_URL}/payment/orders`, {
            headers: authHeaders
          });
          console.log('✅ 使用令牌获取用户订单成功:', authedOrdersResponse.data.success);
        } catch (error) {
          console.log('❌ 使用令牌获取用户订单失败:', error.response?.data?.message || error.message);
        }
      }
    } catch (error) {
      console.log('❌ 登录失败:', error.response?.data?.message || error.message);
      
      // 如果登录失败，可能需要先注册用户
      console.log('\n🔄 尝试注册测试用户...');
      
      try {
        // 先发送验证码
        const verifyCodeResponse = await axios.post(`${BASE_URL}/mail_verify`, {
          email: testLoginData.email,
          username: 'testuser'
        });
        
        console.log('📧 验证码发送响应:', verifyCodeResponse.data);
        
        if (verifyCodeResponse.data.success) {
          console.log('💡 请检查邮箱获取验证码，然后手动完成注册流程');
          console.log('💡 或者直接在前端登录页面进行操作');
        }
      } catch (regError) {
        console.log('❌ 发送验证码失败:', regError.response?.data?.message || regError.message);
        console.log('💡 建议：使用前端页面进行注册和登录操作');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 服务器可能未启动，请确认后端服务正在运行在 http://localhost:3001');
    }
  }
  
  console.log('\n🎉 认证API测试完成!');
  console.log('\n📋 解决方案:');
  console.log('1. 确保后端服务器正在运行');
  console.log('2. 在前端页面进行登录操作');
  console.log('3. 检查浏览器的localStorage中是否有token');
  console.log('4. 检查网络请求中是否携带了Authorization头');
}

// 运行测试
if (require.main === module) {
  testAuthAPI().catch(console.error);
}

module.exports = { testAuthAPI }; 