#!/usr/bin/env node
/**
 * 支付问题诊断脚本
 * 用于分析支付成功但系统状态未更新的问题
 */

const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 配置
const config = {
  notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || '',
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',
  port: process.env.PORT || 3001
};

/**
 * 检查回调URL可访问性
 */
async function checkNotifyUrlAccessibility() {
  console.log('='.repeat(60));
  console.log('🌐 检查回调URL可访问性');
  console.log('='.repeat(60));
  
  const notifyUrl = config.notifyUrl;
  console.log(`📋 回调URL: ${notifyUrl}`);
  
  if (!notifyUrl) {
    console.log('❌ 回调URL未配置');
    return false;
  }
  
  // 检查URL格式
  try {
    const url = new URL(notifyUrl);
    console.log(`✅ URL格式正确: ${url.protocol}//${url.host}${url.pathname}`);
    
    // 检查是否是localhost
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      console.log('⚠️ 警告: 使用localhost地址，微信支付服务器无法访问');
      console.log('🔧 解决方案:');
      console.log('   1. 使用内网穿透工具(如ngrok, frp)');
      console.log('   2. 部署到公网服务器');
      console.log('   3. 使用域名而非IP地址');
      return false;
    }
    
    // 尝试访问回调URL (GET请求)
    console.log('🔍 尝试访问回调URL...');
    try {
      const response = await axios.get(notifyUrl, {
        timeout: 10000,
        validateStatus: () => true // 接受所有状态码
      });
      
      console.log(`📥 响应状态: ${response.status}`);
      console.log(`📥 响应头: ${JSON.stringify(response.headers, null, 2)}`);
      
      if (response.status === 200) {
        console.log('✅ 回调URL可正常访问');
        return true;
      } else if (response.status === 404) {
        console.log('⚠️ 回调接口不存在 (404)');
        console.log('🔧 请确认回调路由已正确配置');
        return false;
      } else if (response.status === 405) {
        console.log('✅ 回调URL存在但不支持GET请求 (正常，微信使用POST)');
        return true;
      } else {
        console.log(`⚠️ 回调URL响应异常: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ 无法访问回调URL: ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('🔧 连接被拒绝，请检查服务是否运行');
      } else if (error.code === 'ENOTFOUND') {
        console.log('🔧 域名解析失败，请检查域名配置');
      } else if (error.code === 'ECONNRESET') {
        console.log('🔧 连接被重置，可能存在网络问题');
      }
      
      return false;
    }
    
  } catch (error) {
    console.log(`❌ URL格式错误: ${error.message}`);
    return false;
  }
}

/**
 * 检查服务器状态
 */
async function checkServerStatus() {
  console.log('='.repeat(60));
  console.log('🖥️ 检查服务器状态');
  console.log('='.repeat(60));
  
  const serverUrl = `http://localhost:${config.port}`;
  console.log(`📋 服务器地址: ${serverUrl}`);
  
  try {
    // 检查服务器健康状态
    const healthUrl = `${serverUrl}/health`;
    console.log('🔍 检查健康状态...');
    
    try {
      const response = await axios.get(healthUrl, { timeout: 5000 });
      console.log('✅ 服务器运行正常');
      console.log(`📋 响应: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('⚠️ 健康检查接口不存在，尝试检查根路径...');
        
        try {
          const rootResponse = await axios.get(serverUrl, { timeout: 5000 });
          console.log('✅ 服务器运行正常 (通过根路径确认)');
        } catch (rootError) {
          console.log('❌ 服务器无响应');
          return false;
        }
      } else {
        console.log(`❌ 服务器检查失败: ${error.message}`);
        return false;
      }
    }
    
    // 检查支付相关接口
    console.log('🔍 检查支付接口...');
    const paymentUrl = `${serverUrl}/api/payment`;
    
    try {
      const response = await axios.get(paymentUrl, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status === 200 || response.status === 404 || response.status === 405) {
        console.log('✅ 支付接口路径存在');
      } else {
        console.log(`⚠️ 支付接口响应异常: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ 支付接口检查失败: ${error.message}`);
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ 服务器状态检查失败: ${error.message}`);
    return false;
  }
}

/**
 * 分析支付流程问题
 */
function analyzePaymentFlow() {
  console.log('='.repeat(60));
  console.log('🔍 支付流程问题分析');
  console.log('='.repeat(60));
  
  console.log('📋 当前情况:');
  console.log('   ✅ 微信支付系统: 订单状态为 SUCCESS (支付成功)');
  console.log('   ❌ 本地系统: 订单状态为 NOTPAY (未支付)');
  console.log('');
  
  console.log('🔍 可能的原因:');
  console.log('');
  console.log('1. 【回调通知失败】');
  console.log('   - 微信支付服务器无法访问回调URL');
  console.log('   - 回调URL使用了localhost地址');
  console.log('   - 服务器防火墙阻拦了微信支付的请求');
  console.log('   - 网络问题导致回调失败');
  console.log('');
  console.log('2. 【回调处理错误】');
  console.log('   - 回调接口存在bug，处理失败');
  console.log('   - 签名验证失败');
  console.log('   - 数据库更新操作失败');
  console.log('   - 异常处理不当，导致状态未更新');
  console.log('');
  console.log('3. 【系统同步问题】');
  console.log('   - 数据库事务问题');
  console.log('   - 缓存同步问题');
  console.log('   - 订单状态更新逻辑错误');
  console.log('');
  console.log('4. 【配置问题】');
  console.log('   - 回调URL配置错误');
  console.log('   - 环境配置不匹配');
  console.log('   - API密钥不一致');
  console.log('');
  
  console.log('🔧 解决方案:');
  console.log('');
  console.log('1. 【立即修复】');
  console.log('   - 手动更新订单状态为已支付');
  console.log('   - 发放用户积分或服务');
  console.log('   - 发送支付成功通知');
  console.log('');
  console.log('2. 【回调URL修复】');
  console.log('   - 使用ngrok等内网穿透工具');
  console.log('   - 部署到公网服务器');
  console.log('   - 配置正确的域名');
  console.log('');
  console.log('3. 【代码修复】');
  console.log('   - 检查回调处理逻辑');
  console.log('   - 加强错误处理和日志记录');
  console.log('   - 添加订单状态同步机制');
  console.log('');
  console.log('4. 【监控改进】');
  console.log('   - 添加支付状态监控');
  console.log('   - 实施定期状态同步');
  console.log('   - 建立告警机制');
}

/**
 * 生成修复脚本
 */
function generateFixScript() {
  console.log('='.repeat(60));
  console.log('🔧 自动修复脚本');
  console.log('='.repeat(60));
  
  const orderNo = 'RECHARGE_ORDER17522530522711786';
  const transactionId = '4200002740202507127224774049';
  const amount = 0.01;
  const payTime = '20250712005719';
  
  console.log('📋 需要手动修复的订单信息:');
  console.log(`   订单号: ${orderNo}`);
  console.log(`   微信订单号: ${transactionId}`);
  console.log(`   支付金额: ${amount}元`);
  console.log(`   支付时间: ${payTime}`);
  console.log('');
  
  console.log('🔧 SQL修复脚本 (示例):');
  console.log(`-- 更新订单状态`);
  console.log(`UPDATE payment_orders SET`);
  console.log(`  status = 'PAID',`);
  console.log(`  transaction_id = '${transactionId}',`);
  console.log(`  paid_at = '2025-07-12 00:57:19',`);
  console.log(`  updated_at = NOW()`);
  console.log(`WHERE order_no = '${orderNo}';`);
  console.log('');
  
  console.log('🔧 Node.js修复脚本 (示例):');
  console.log(`const orderService = require('./services/OrderService');`);
  console.log(`await orderService.updateOrderStatus('${orderNo}', {`);
  console.log(`  status: 'PAID',`);
  console.log(`  transactionId: '${transactionId}',`);
  console.log(`  paidAt: new Date('2025-07-12 00:57:19'),`);
  console.log(`  amount: ${amount}`);
  console.log(`});`);
  console.log('');
  
  console.log('⚠️ 注意事项:');
  console.log('1. 执行修复前请备份数据库');
  console.log('2. 确认订单号和微信订单号匹配');
  console.log('3. 检查是否需要发放积分或服务');
  console.log('4. 发送用户支付成功通知');
  console.log('5. 记录手动修复日志');
}

/**
 * 检查ngrok配置建议
 */
function suggestNgrokSetup() {
  console.log('='.repeat(60));
  console.log('🌐 Ngrok内网穿透配置建议');
  console.log('='.repeat(60));
  
  console.log('📋 问题: 当前回调URL使用localhost，微信支付服务器无法访问');
  console.log('');
  console.log('🔧 解决方案: 使用Ngrok内网穿透');
  console.log('');
  console.log('1. 安装Ngrok:');
  console.log('   - 访问 https://ngrok.com/');
  console.log('   - 注册账号并下载ngrok');
  console.log('   - 配置authtoken');
  console.log('');
  console.log('2. 启动内网穿透:');
  console.log(`   ngrok http ${config.port}`);
  console.log('');
  console.log('3. 获取公网地址:');
  console.log('   - Ngrok会生成类似 https://xxx.ngrok.io 的地址');
  console.log('   - 使用此地址替换localhost');
  console.log('');
  console.log('4. 更新环境变量:');
  console.log('   WECHAT_PAY_NOTIFY_URL=https://xxx.ngrok.io/api/payment/wechat/callback');
  console.log('');
  console.log('5. 重启服务器');
  console.log('');
  console.log('⚠️ 注意事项:');
  console.log('- 免费版ngrok地址会定期变更');
  console.log('- 生产环境建议使用固定域名');
  console.log('- 确保回调接口正确实现');
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 支付问题诊断工具');
  console.log(`📅 执行时间: ${new Date().toLocaleString()}`);
  console.log('');
  
  // 1. 分析支付流程问题
  analyzePaymentFlow();
  console.log('');
  
  // 2. 检查回调URL
  const notifyOk = await checkNotifyUrlAccessibility();
  console.log('');
  
  // 3. 检查服务器状态
  const serverOk = await checkServerStatus();
  console.log('');
  
  // 4. 生成修复建议
  generateFixScript();
  console.log('');
  
  // 5. Ngrok配置建议
  if (!notifyOk) {
    suggestNgrokSetup();
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log('📊 诊断总结');
  console.log('='.repeat(60));
  console.log(`🌐 回调URL状态: ${notifyOk ? '✅ 正常' : '❌ 异常'}`);
  console.log(`🖥️ 服务器状态: ${serverOk ? '✅ 正常' : '❌ 异常'}`);
  console.log('');
  console.log('🎯 核心问题:');
  console.log('   微信支付成功，但系统状态未同步');
  console.log('');
  console.log('🔧 优先解决方案:');
  console.log('1. 立即手动更新订单状态');
  console.log('2. 配置正确的回调URL');
  console.log('3. 加强支付状态监控');
  console.log('4. 实施定期状态同步机制');
  console.log('');
  console.log('='.repeat(60));
  console.log('🏁 诊断完成');
  console.log('='.repeat(60));
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('💥 诊断脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  checkNotifyUrlAccessibility,
  checkServerStatus,
  analyzePaymentFlow
};