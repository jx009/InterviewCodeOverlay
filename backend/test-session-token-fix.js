const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

// 测试用户数据
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'Test123456'
};

async function testCompleteFlow() {
  console.log('🧪 开始测试充值界面认证修复...\n');
  
  try {
    // 1. 先注册用户（如果不存在）
    console.log('📝 步骤1: 注册测试用户...');
    try {
      const registerResponse = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testUser)
      });
      
      if (registerResponse.ok) {
        console.log('✅ 用户注册成功');
      } else {
        console.log('ℹ️  用户可能已存在，继续登录测试');
      }
    } catch (error) {
      console.log('ℹ️  跳过注册步骤，直接登录');
    }
    
    // 2. 登录获取sessionId
    console.log('\n🔑 步骤2: 登录获取sessionId...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.log('❌ 登录失败:', errorData.message);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ 登录成功，用户:', loginData.user.username);
    
    // 从Set-Cookie头中提取sessionId
    const cookieHeader = loginResponse.headers.get('set-cookie');
    const sessionMatch = cookieHeader?.match(/session_id=([^;]+)/);
    const sessionId = sessionMatch ? sessionMatch[1] : null;
    
    if (!sessionId) {
      console.log('❌ 未找到sessionId');
      return;
    }
    
    console.log('📋 获取到sessionId:', sessionId.substring(0, 10) + '...');
    
    // 3. 调用session_status获取JWT token
    console.log('\n🔐 步骤3: 调用session_status获取JWT token...');
    const sessionStatusResponse = await fetch(`${BASE_URL}/api/session_status`, {
      method: 'GET',
      headers: {
        'Cookie': `session_id=${sessionId}`,
        'x-session-id': sessionId
      }
    });
    
    if (!sessionStatusResponse.ok) {
      const errorData = await sessionStatusResponse.json();
      console.log('❌ session_status失败:', errorData.message);
      return;
    }
    
    const sessionData = await sessionStatusResponse.json();
    console.log('✅ session_status成功');
    console.log('📋 用户信息:', sessionData.user);
    
    // 检查是否有token
    if (!sessionData.token) {
      console.log('❌ session_status没有返回token');
      return;
    }
    
    const jwtToken = sessionData.token;
    console.log('🔐 获取到JWT token:', jwtToken.substring(0, 10) + '...');
    
    // 4. 使用JWT token调用支付API
    console.log('\n💳 步骤4: 使用JWT token调用支付API...');
    
    // 4.1 获取支付套餐
    console.log('📦 获取支付套餐...');
    const packagesResponse = await fetch(`${BASE_URL}/api/payment/packages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!packagesResponse.ok) {
      const errorData = await packagesResponse.json();
      console.log('❌ 获取支付套餐失败:', errorData.message);
      return;
    }
    
    const packages = await packagesResponse.json();
    console.log('✅ 支付套餐获取成功，套餐数量:', packages.length);
    
    // 4.2 创建支付订单
    console.log('🛒 创建支付订单...');
    const orderResponse = await fetch(`${BASE_URL}/api/payment/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        packageId: 1,
        paymentMethod: 'wechat'
      })
    });
    
    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.log('❌ 创建支付订单失败:', errorData.message);
      return;
    }
    
    const orderData = await orderResponse.json();
    console.log('✅ 支付订单创建成功');
    console.log('📋 订单信息:', {
      orderNo: orderData.orderNo,
      amount: orderData.amount,
      points: orderData.points
    });
    
    // 4.3 获取订单列表
    console.log('📋 获取订单列表...');
    const ordersResponse = await fetch(`${BASE_URL}/api/payment/orders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!ordersResponse.ok) {
      const errorData = await ordersResponse.json();
      console.log('❌ 获取订单列表失败:', errorData.message);
      return;
    }
    
    const orders = await ordersResponse.json();
    console.log('✅ 订单列表获取成功，订单数量:', orders.length);
    
    console.log('\n🎉 所有测试通过！充值界面认证修复成功！');
    console.log('\n📋 测试结果总结:');
    console.log('✅ 1. 用户登录成功');
    console.log('✅ 2. session_status返回JWT token');
    console.log('✅ 3. 支付套餐API认证成功');
    console.log('✅ 4. 支付订单创建成功');
    console.log('✅ 5. 订单列表获取成功');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('🔍 错误堆栈:', error.stack);
  }
}

// 运行测试
testCompleteFlow(); 