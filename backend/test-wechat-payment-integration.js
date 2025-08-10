const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

// 测试用户数据
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'Test123456'
};

async function testWechatPaymentIntegration() {
  console.log('🧪 测试微信支付V2集成...\n');
  
  try {
    // 1. 检查服务器状态
    console.log('🔍 步骤1: 检查服务器状态...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    if (!healthResponse.ok) {
      console.log('❌ 服务器未运行');
      return;
    }
    console.log('✅ 服务器运行正常');
    
    // 2. 登录获取token
    console.log('\n🔑 步骤2: 用户登录...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ 登录失败，请先注册测试用户');
      return;
    }
    
    // 获取sessionId和token
    const cookieHeader = loginResponse.headers.get('set-cookie');
    const sessionMatch = cookieHeader?.match(/session_id=([^;]+)/);
    const sessionId = sessionMatch ? sessionMatch[1] : null;
    
    if (!sessionId) {
      console.log('❌ 未找到sessionId');
      return;
    }
    
    // 获取JWT token
    const sessionStatusResponse = await fetch(`${BASE_URL}/api/session_status`, {
      headers: {
        'Cookie': `session_id=${sessionId}`,
        'x-session-id': sessionId
      }
    });
    
    if (!sessionStatusResponse.ok) {
      console.log('❌ 获取token失败');
      return;
    }
    
    const sessionData = await sessionStatusResponse.json();
    const jwtToken = sessionData.token;
    console.log('✅ 用户登录成功');
    
    // 3. 获取支付套餐
    console.log('\n📦 步骤3: 获取支付套餐...');
    const packagesResponse = await fetch(`${BASE_URL}/api/payment/packages`, {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    });
    
    if (!packagesResponse.ok) {
      console.log('❌ 获取支付套餐失败');
      return;
    }
    
    const packages = await packagesResponse.json();
    const testPackage = packages.find(pkg => pkg.id === 4); // 测试套餐
    
    if (!testPackage) {
      console.log('❌ 未找到测试套餐');
      return;
    }
    
    console.log('✅ 找到测试套餐:', testPackage.name);
    
    // 4. 创建支付订单（测试微信支付V2集成）
    console.log('\n💳 步骤4: 创建支付订单（测试微信支付V2）...');
    const orderResponse = await fetch(`${BASE_URL}/api/payment/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        packageId: testPackage.id,
        paymentMethod: 'WECHAT_PAY'
      })
    });
    
    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.log('❌ 创建订单失败:', errorData.message);
      return;
    }
    
    const orderData = await orderResponse.json();
    console.log('✅ 订单创建成功');
    console.log('📋 订单信息:');
    console.log(`   - 订单号: ${orderData.data.orderNo}`);
    console.log(`   - 金额: ¥${orderData.data.paymentData.amount}`);
    console.log(`   - 二维码URL: ${orderData.data.paymentData.codeUrl}`);
    
    // 5. 分析支付链接类型
    console.log('\n🔍 步骤5: 分析支付链接...');
    const codeUrl = orderData.data.paymentData.codeUrl;
    
    if (codeUrl.includes('weixin://')) {
      console.log('✅ 检测到微信支付V2真实支付链接');
      console.log('💡 这是正式的微信支付二维码，可以使用微信扫码支付');
    } else if (codeUrl.includes('localhost:3000/test-payment')) {
      console.log('🔄 检测到测试支付链接');
      console.log('💡 这是测试环境，点击链接可以模拟支付流程');
    } else if (codeUrl.includes('example.com')) {
      console.log('⚠️  检测到模拟支付链接');
      console.log('💡 微信支付V2服务未配置或加载失败，使用模拟链接');
    } else {
      console.log('🔍 检测到其他类型链接:', codeUrl);
    }
    
    console.log('\n🎉 微信支付V2集成测试完成！');
    console.log('\n📝 集成状态总结:');
    
    // 检查环境变量
    console.log('📋 环境变量检查:');
    const envVars = [
      'WECHAT_PAY_V2_APP_ID',
      'WECHAT_PAY_V2_MCH_ID', 
      'WECHAT_PAY_V2_API_KEY',
      'WECHAT_PAY_V2_NOTIFY_URL'
    ];
    
    envVars.forEach(varName => {
      const value = process.env[varName];
      console.log(`   ${varName}: ${value ? '✅ 已配置' : '❌ 未配置'}`);
    });
    
    if (codeUrl.includes('weixin://')) {
      console.log('\n🎉 恭喜！微信支付V2集成成功！');
      console.log('💡 用户现在可以扫码进行真实支付了');
    } else if (codeUrl.includes('localhost:3000/test-payment')) {
      console.log('\n🔧 测试模式运行正常');
      console.log('💡 要启用真实支付，请完成微信支付V2环境变量配置');
    } else {
      console.log('\n⚠️  需要配置微信支付V2');
      console.log('💡 请参考"微信支付V2配置说明.md"完成配置');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('🔍 错误详情:', error.stack);
  }
}

// 运行测试
testWechatPaymentIntegration(); 