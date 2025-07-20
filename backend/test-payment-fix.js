const fetch = require('node-fetch');

console.log('🔍 测试支付API认证修复...');

// 测试配置
const BASE_URL = 'http://localhost:3001/api';
const TEST_SESSION_ID = 'test-session-id'; // 这需要是一个有效的session ID

async function testPaymentAuth() {
  try {
    console.log('1. 测试会话状态端点...');
    
    // 测试 /api/session_status 端点
    const sessionResponse = await fetch(`${BASE_URL}/session_status`, {
      headers: {
        'X-Session-Id': TEST_SESSION_ID
      }
    });
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('✅ 会话状态响应:', {
        success: sessionData.success,
        hasUser: !!sessionData.user,
        hasToken: !!sessionData.token,
        hasSessionId: !!sessionData.sessionId
      });
      
      if (sessionData.success && sessionData.token) {
        console.log('2. 测试支付API认证...');
        
        // 测试支付套餐API
        const packagesResponse = await fetch(`${BASE_URL}/payment/packages`, {
          headers: {
            'X-Session-Id': TEST_SESSION_ID,
            'Authorization': `Bearer ${sessionData.token}`
          }
        });
        
        if (packagesResponse.ok) {
          const packagesData = await packagesResponse.json();
          console.log('✅ 支付套餐API响应:', {
            success: packagesData.success,
            dataLength: packagesData.data?.length || 0
          });
          
          // 测试订单列表API
          const ordersResponse = await fetch(`${BASE_URL}/payment/orders`, {
            headers: {
              'X-Session-Id': TEST_SESSION_ID,
              'Authorization': `Bearer ${sessionData.token}`
            }
          });
          
          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            console.log('✅ 订单列表API响应:', {
              success: ordersData.success,
              dataLength: ordersData.data?.length || 0
            });
            
            console.log('🎉 支付API认证修复验证成功！');
            return true;
          } else {
            const errorData = await ordersResponse.json();
            console.error('❌ 订单列表API失败:', errorData);
            return false;
          }
        } else {
          const errorData = await packagesResponse.json();
          console.error('❌ 支付套餐API失败:', errorData);
          return false;
        }
      } else {
        console.error('❌ 会话状态未返回有效token');
        return false;
      }
    } else {
      const errorData = await sessionResponse.json();
      console.error('❌ 会话状态请求失败:', errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ 测试异常:', error.message);
    return false;
  }
}

// 运行测试
testPaymentAuth().then(success => {
  if (success) {
    console.log('✅ 所有测试通过！');
  } else {
    console.log('❌ 测试失败！');
  }
}).catch(error => {
  console.error('❌ 测试运行异常:', error);
}); 