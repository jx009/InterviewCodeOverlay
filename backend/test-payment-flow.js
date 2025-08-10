/**
 * 支付流程测试脚本
 * 用于测试从创建订单到支付成功的完整流程
 */

const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:3001';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test123456';

// 全局变量
let sessionId = null;
let orderId = null;

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 添加请求拦截器
api.interceptors.request.use(config => {
  if (sessionId) {
    config.headers['Authorization'] = `Bearer ${sessionId}`;
    config.headers['X-Session-Id'] = sessionId;
  }
  return config;
});

/**
 * 步骤1: 用户登录
 */
async function login() {
  try {
    console.log('🔐 步骤1: 用户登录...');
    const response = await api.post('/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (response.data.success) {
      sessionId = response.data.sessionId;
      console.log('✅ 登录成功, SessionID:', sessionId.substring(0, 10) + '...');
      return true;
    } else {
      console.error('❌ 登录失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录异常:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 步骤2: 获取充值套餐
 */
async function getPackages() {
  try {
    console.log('📦 步骤2: 获取充值套餐...');
    const response = await api.get('/api/recharge/packages');

    if (response.data.success) {
      const packages = response.data.data;
      console.log('✅ 获取套餐成功, 数量:', packages.length);
      packages.forEach(pkg => {
        console.log(`  - ${pkg.name}: ¥${pkg.amount} -> ${pkg.totalPoints}积分`);
      });
      return packages;
    } else {
      console.error('❌ 获取套餐失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 获取套餐异常:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * 步骤3: 创建充值订单
 */
async function createOrder(packageId = 999) {
  try {
    console.log('🛒 步骤3: 创建充值订单...');
    const response = await api.post('/api/recharge/create-order', {
      packageId: packageId
    });

    if (response.data.success) {
      const orderData = response.data.data;
      orderId = orderData.orderNo;
      console.log('✅ 创建订单成功:');
      console.log(`  - 订单号: ${orderData.orderNo}`);
      console.log(`  - 金额: ¥${orderData.amount}`);
      console.log(`  - 积分: ${orderData.points}`);
      console.log(`  - 二维码: ${orderData.qrCodeUrl ? '已生成' : '未生成'}`);
      console.log(`  - 过期时间: ${orderData.expireTime}`);
      return orderData;
    } else {
      console.error('❌ 创建订单失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 创建订单异常:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * 步骤4: 查询订单状态（轮询）
 */
async function queryOrderStatus(orderNo, maxAttempts = 10) {
  try {
    console.log('🔍 步骤4: 查询订单状态...');
    
    for (let i = 0; i < maxAttempts; i++) {
      const response = await api.get(`/api/recharge/order-status/${orderNo}`);
      
      if (response.data.success) {
        const orderData = response.data.data;
        console.log(`  [${i + 1}/${maxAttempts}] 状态: ${orderData.status}`);
        
        if (orderData.status === 'PAID') {
          console.log('🎉 支付成功！');
          console.log(`  - 支付时间: ${orderData.paymentTime}`);
          console.log(`  - 获得积分: ${orderData.points}`);
          return orderData;
        } else if (orderData.status === 'FAILED' || orderData.status === 'EXPIRED') {
          console.log('❌ 支付失败或过期');
          return orderData;
        }
        
        // 等待3秒后继续查询
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.error('❌ 查询订单失败:', response.data.message);
        break;
      }
    }
    
    console.log('⏰ 查询超时，订单可能仍在等待支付');
    return null;
  } catch (error) {
    console.error('❌ 查询订单异常:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * 步骤5: 模拟支付成功（用于测试）
 */
async function simulatePaymentSuccess(orderNo) {
  try {
    console.log('💰 步骤5: 模拟支付成功（开发测试）...');
    
    // 这里可以直接调用数据库更新订单状态，或者模拟微信支付回调
    // 为了简化，我们直接使用一个测试接口（如果存在的话）
    console.log('⚠️ 这是模拟支付，实际使用时需要通过微信扫码支付');
    console.log('💡 可以手动更新数据库订单状态进行测试');
    
    return true;
  } catch (error) {
    console.error('❌ 模拟支付失败:', error.message);
    return false;
  }
}

/**
 * 步骤6: 获取充值历史
 */
async function getRechargeHistory() {
  try {
    console.log('📋 步骤6: 获取充值历史...');
    const response = await api.get('/api/recharge/history?page=1&limit=5');

    if (response.data.success) {
      const historyData = response.data.data;
      console.log('✅ 获取充值历史成功:');
      console.log(`  - 总记录数: ${historyData.pagination.total}`);
      console.log(`  - 当前页记录: ${historyData.records.length}`);
      
      historyData.records.forEach((record, index) => {
        console.log(`  [${index + 1}] ${record.packageName} - ¥${record.amount} - ${record.status} - ${record.createdAt}`);
      });
      
      return historyData;
    } else {
      console.error('❌ 获取充值历史失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 获取充值历史异常:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * 主测试流程
 */
async function runTest() {
  console.log('🚀 开始支付流程测试...\n');
  
  // 步骤1: 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ 测试终止: 登录失败');
    return;
  }
  console.log('');
  
  // 步骤2: 获取套餐
  const packages = await getPackages();
  if (!packages || packages.length === 0) {
    console.log('❌ 测试终止: 无法获取套餐');
    return;
  }
  console.log('');
  
  // 步骤3: 创建订单（使用测试套餐）
  const testPackage = packages.find(p => p.id === 999) || packages[0];
  const orderData = await createOrder(testPackage.id);
  if (!orderData) {
    console.log('❌ 测试终止: 创建订单失败');
    return;
  }
  console.log('');
  
  // 步骤4: 查询订单状态
  console.log('⏳ 等待支付结果（请使用微信扫码支付，或者手动更新数据库状态进行测试）...');
  const finalOrderData = await queryOrderStatus(orderData.orderNo, 10);
  console.log('');
  
  // 步骤6: 获取充值历史
  await getRechargeHistory();
  
  console.log('\n🏁 支付流程测试完成！');
  
  if (finalOrderData && finalOrderData.status === 'PAID') {
    console.log('🎊 恭喜！支付流程测试成功！');
  } else {
    console.log('ℹ️ 支付流程测试已完成，等待支付结果');
    console.log('💡 提示: 可以使用微信扫码支付，或手动更新数据库订单状态测试后续流程');
  }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 运行测试
if (require.main === module) {
  runTest().catch(error => {
    console.error('❌ 测试脚本异常:', error);
    process.exit(1);
  });
}

module.exports = {
  login,
  getPackages,
  createOrder,
  queryOrderStatus,
  getRechargeHistory
};