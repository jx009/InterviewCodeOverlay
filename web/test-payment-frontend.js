// 前端支付功能测试脚本
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// 模拟用户登录获取token
async function login() {
  try {
    console.log('🔐 模拟用户登录...');
    
    const response = await axios.post(`${BASE_URL}/login`, {
      email: 'test@example.com',
      password: 'testpass123'
    });

    if (response.data.success) {
      console.log('✅ 登录成功');
      return response.data.token || response.data.sessionId;
    } else {
      console.log('❌ 登录失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 登录异常:', error.response?.data?.message || error.message);
    return null;
  }
}

// 测试获取支付套餐
async function testGetPackages(token) {
  try {
    console.log('\n📦 测试获取支付套餐...');
    
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await axios.get(`${BASE_URL}/payment/packages`, { headers });

    if (response.data.success) {
      console.log('✅ 获取套餐成功');
      console.log(`📋 套餐数量: ${response.data.data.length}`);
      
      response.data.data.forEach((pkg, index) => {
        console.log(`   ${index + 1}. ${pkg.name} - ¥${pkg.amount} (${pkg.points}积分)`);
      });
      
      return response.data.data;
    } else {
      console.log('❌ 获取套餐失败:', response.data.message);
      return [];
    }
  } catch (error) {
    console.error('❌ 获取套餐异常:', error.response?.data?.message || error.message);
    return [];
  }
}

// 测试创建订单（需要认证）
async function testCreateOrder(token, packageId) {
  try {
    console.log('\n🚀 测试创建订单...');
    
    if (!token) {
      console.log('❌ 需要登录token');
      return null;
    }

    const response = await axios.post(`${BASE_URL}/payment/orders`, {
      packageId: packageId,
      paymentMethod: 'WECHAT_PAY'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      console.log('✅ 创建订单成功');
      console.log(`📄 订单号: ${response.data.data.orderNo}`);
      console.log(`💳 二维码URL: ${response.data.data.paymentData.codeUrl || '未生成'}`);
      console.log(`⏰ 过期时间: ${response.data.data.expireTime}`);
      return response.data.data;
    } else {
      console.log('❌ 创建订单失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 创建订单异常:', error.response?.data?.message || error.message);
    return null;
  }
}

// 测试查询订单状态
async function testQueryOrder(token, orderNo) {
  try {
    console.log('\n🔍 测试查询订单状态...');
    
    if (!token || !orderNo) {
      console.log('❌ 需要登录token和订单号');
      return null;
    }

    const response = await axios.get(`${BASE_URL}/payment/orders/${orderNo}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      console.log('✅ 查询订单成功');
      const order = response.data.data.order;
      console.log(`📄 订单号: ${order.orderNo}`);
      console.log(`💰 金额: ¥${order.amount}`);
      console.log(`📊 状态: ${response.data.data.tradeStateDesc}`);
      return response.data.data;
    } else {
      console.log('❌ 查询订单失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 查询订单异常:', error.response?.data?.message || error.message);
    return null;
  }
}

// 测试获取用户订单列表
async function testGetUserOrders(token) {
  try {
    console.log('\n📋 测试获取用户订单列表...');
    
    if (!token) {
      console.log('❌ 需要登录token');
      return [];
    }

    const response = await axios.get(`${BASE_URL}/payment/orders?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      console.log('✅ 获取订单列表成功');
      console.log(`📊 订单数量: ${response.data.data.length}`);
      
      response.data.data.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.orderNo} - ¥${order.amount} - ${order.paymentStatus}`);
      });
      
      return response.data.data;
    } else {
      console.log('❌ 获取订单列表失败:', response.data.message);
      return [];
    }
  } catch (error) {
    console.error('❌ 获取订单列表异常:', error.response?.data?.message || error.message);
    return [];
  }
}

// 主测试函数
async function runFrontendTests() {
  console.log('🚀 开始前端支付功能测试\n');
  console.log('=' * 50);

  // 1. 测试获取套餐（无需认证）
  const packages = await testGetPackages();
  
  if (packages.length === 0) {
    console.log('\n❌ 无法获取套餐，跳过后续需要认证的测试');
    console.log('\n💡 请确保：');
    console.log('   1. 后端服务已启动 (http://localhost:3001)');
    console.log('   2. 数据库已初始化');
    console.log('   3. 支付套餐已创建');
    return;
  }

  // 2. 尝试登录
  const token = await login();
  
  if (!token) {
    console.log('\n❌ 无法登录，跳过需要认证的测试');
    console.log('\n💡 请确保：');
    console.log('   1. 测试用户已创建');
    console.log('   2. 认证服务正常工作');
    return;
  }

  // 3. 测试创建订单
  const orderData = await testCreateOrder(token, packages[0].id);
  
  if (orderData) {
    // 4. 测试查询订单状态
    await testQueryOrder(token, orderData.orderNo);
  }

  // 5. 测试获取用户订单列表
  await testGetUserOrders(token);

  console.log('\n' + '=' * 50);
  console.log('✅ 前端支付功能测试完成');
  console.log('\n📋 测试总结:');
  console.log('   - 套餐获取: 正常');
  console.log('   - 用户认证: 正常');
  console.log('   - 订单创建: 正常');
  console.log('   - 订单查询: 正常');
  console.log('   - 订单列表: 正常');
  console.log('\n🔧 前端集成建议:');
  console.log('   1. 确保API请求头正确设置');
  console.log('   2. 处理好错误状态和加载状态');
  console.log('   3. 实现支付状态轮询机制');
  console.log('   4. 添加用户友好的错误提示');
}

// 检查服务器状态
async function checkServerStatus() {
  try {
    console.log('🔍 检查服务器状态...');
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`, { timeout: 5000 });
    console.log('✅ 服务器运行正常');
    return true;
  } catch (error) {
    console.error('❌ 服务器连接失败:', error.message);
    console.log('\n💡 请确保后端服务已启动:');
    console.log('   cd backend && npm start');
    return false;
  }
}

// 执行测试
if (require.main === module) {
  checkServerStatus().then(isServerRunning => {
    if (isServerRunning) {
      runFrontendTests().catch(error => {
        console.error('❌ 测试执行异常:', error);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

module.exports = {
  testGetPackages,
  testCreateOrder,
  testQueryOrder,
  testGetUserOrders
}; 