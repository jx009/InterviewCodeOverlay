// 支付功能测试脚本
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// 测试数据
const testSessionId = process.argv[2]; // 从命令行参数获取sessionId

async function testPaymentAPIs() {
  console.log('🧪 开始测试支付功能...');
  console.log('='.repeat(50));
  
  if (!testSessionId) {
    console.log('❌ 请提供有效的sessionId');
    console.log('使用方法: node 测试支付功能.js <your-session-id>');
    console.log('');
    console.log('💡 获取sessionId的方法：');
    console.log('1. 在浏览器中登录系统');
    console.log('2. 打开开发者工具 -> Network 标签');
    console.log('3. 查看请求头中的 X-Session-Id 值');
    process.exit(1);
  }

  // 1. 测试套餐列表（不需要认证）
  console.log('1️⃣ 测试获取支付套餐列表...');
  try {
    const response = await api.get('/api/payment/packages');
    if (response.data.success) {
      console.log('✅ 获取套餐列表成功');
      console.log(`   📦 套餐数量: ${response.data.data.length}`);
      response.data.data.forEach((pkg, index) => {
        console.log(`   ${index + 1}. ${pkg.name} - ¥${pkg.amount} (${pkg.points}积分)`);
      });
    } else {
      console.log('❌ 获取套餐列表失败:', response.data.message);
    }
  } catch (error) {
    console.log('❌ 获取套餐列表异常:', error.response?.data?.message || error.message);
  }

  console.log('');

  // 2. 测试订单列表（需要认证）
  console.log('2️⃣ 测试获取用户订单列表...');
  try {
    const response = await api.get('/api/payment/orders?page=1&limit=5', {
      headers: {
        'X-Session-Id': testSessionId
      }
    });
    
    if (response.data.success) {
      console.log('✅ 获取订单列表成功');
      console.log(`   📋 订单数量: ${response.data.data.length}`);
      console.log(`   📄 总页数: ${response.data.pagination?.totalPages || 0}`);
      
      if (response.data.data.length > 0) {
        response.data.data.forEach((order, index) => {
          console.log(`   ${index + 1}. ${order.orderNo} - ¥${order.amount} (${order.paymentStatus})`);
        });
      } else {
        console.log('   📝 暂无订单记录');
      }
    } else {
      console.log('❌ 获取订单列表失败:', response.data.message);
    }
  } catch (error) {
    console.log('❌ 获取订单列表异常:', error.response?.data?.message || error.message);
    if (error.response?.status === 401) {
      console.log('   💡 这可能是认证问题，请检查sessionId是否有效');
    }
  }

  console.log('');

  // 3. 测试创建订单（需要认证）
  console.log('3️⃣ 测试创建支付订单...');
  try {
    const response = await api.post('/api/payment/orders', {
      packageId: 1,
      paymentMethod: 'WECHAT_PAY'
    }, {
      headers: {
        'X-Session-Id': testSessionId
      }
    });
    
    if (response.data.success) {
      console.log('✅ 创建订单成功');
      console.log(`   📝 订单号: ${response.data.data.orderNo}`);
      console.log(`   ⏰ 过期时间: ${response.data.data.expireTime}`);
      if (response.data.data.paymentData?.codeUrl) {
        console.log(`   💳 支付二维码: ${response.data.data.paymentData.codeUrl.substring(0, 50)}...`);
      }
    } else {
      console.log('❌ 创建订单失败:', response.data.message);
    }
  } catch (error) {
    console.log('❌ 创建订单异常:', error.response?.data?.message || error.message);
    if (error.response?.status === 401) {
      console.log('   💡 这可能是认证问题，请检查sessionId是否有效');
    }
  }

  console.log('');

  // 4. 测试会话状态检查
  console.log('4️⃣ 测试会话状态检查...');
  try {
    const response = await api.get('/api/session_status', {
      headers: {
        'X-Session-Id': testSessionId
      }
    });
    
    if (response.data.success) {
      console.log('✅ 会话状态检查成功');
      console.log(`   👤 用户: ${response.data.user.username}`);
      console.log(`   📧 邮箱: ${response.data.user.email}`);
      console.log(`   🔑 Token: ${response.data.token ? response.data.token.substring(0, 20) + '...' : '无'}`);
    } else {
      console.log('❌ 会话状态检查失败:', response.data.message);
    }
  } catch (error) {
    console.log('❌ 会话状态检查异常:', error.response?.data?.message || error.message);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('🎯 测试完成！');
  console.log('');
  console.log('💡 如果所有测试都通过，说明支付功能修复成功。');
  console.log('💡 如果仍有401错误，请检查：');
  console.log('   1. sessionId是否有效（未过期）');
  console.log('   2. 用户是否已正确登录');
  console.log('   3. Redis服务是否正常运行');
  console.log('   4. 数据库连接是否正常');
}

// 运行测试
testPaymentAPIs().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
}); 