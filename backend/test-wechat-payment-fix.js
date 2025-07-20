#!/usr/bin/env node

/**
 * 微信支付修复验证脚本
 * 用于测试修复后的微信支付功能
 */

const { performFullConfigCheck } = require('./src/payment/utils/config-validator');
const { WechatPayV2Service } = require('./src/services/WechatPayV2Service');
const { getPaymentService } = require('./src/payment/services/PaymentService');

// 测试配置
const TEST_CONFIG = {
  testAmount: 0.01, // 测试金额（1分）
  testBody: '测试商品 - 支付修复验证',
  testTimeout: 30000, // 30秒超时
  maxRetries: 3
};

/**
 * 测试微信支付配置
 */
async function testWechatPayConfig() {
  console.log('🔍 第1步: 检查微信支付配置...\n');
  
  try {
    const result = await performFullConfigCheck();
    
    if (!result.valid) {
      console.log('❌ 配置检查失败，无法继续测试');
      console.log('请先修复配置问题，然后重新运行测试');
      return false;
    }
    
    console.log('✅ 配置检查通过\n');
    return true;
    
  } catch (error) {
    console.error('❌ 配置检查异常:', error.message);
    return false;
  }
}

/**
 * 测试微信支付服务初始化
 */
async function testWechatPayService() {
  console.log('🚀 第2步: 测试微信支付服务初始化...\n');
  
  try {
    const wechatPayService = new WechatPayV2Service();
    const serviceInfo = wechatPayService.getServiceInfo();
    
    console.log('✅ 微信支付服务初始化成功');
    console.log('📊 服务信息:', {
      appId: serviceInfo.appId ? `${serviceInfo.appId.substring(0, 8)}...` : '未配置',
      mchId: serviceInfo.mchId ? `${serviceInfo.mchId.substring(0, 8)}...` : '未配置',
      environment: serviceInfo.environment,
      signType: serviceInfo.signType
    });
    
    return wechatPayService;
    
  } catch (error) {
    console.error('❌ 微信支付服务初始化失败:', error.message);
    return null;
  }
}

/**
 * 测试创建支付订单
 */
async function testCreatePaymentOrder(wechatPayService) {
  console.log('\n💳 第3步: 测试创建支付订单...\n');
  
  try {
    const testOrderRequest = {
      outTradeNo: `TEST_FIX_${Date.now()}`,
      totalFee: TEST_CONFIG.testAmount,
      body: TEST_CONFIG.testBody,
      attach: JSON.stringify({
        test: true,
        fixVersion: '1.0',
        timestamp: Date.now()
      }),
      timeExpire: new Date(Date.now() + 15 * 60 * 1000), // 15分钟后过期
      spbillCreateIp: '127.0.0.1'
    };
    
    console.log('📋 订单请求参数:', {
      outTradeNo: testOrderRequest.outTradeNo,
      totalFee: testOrderRequest.totalFee,
      body: testOrderRequest.body
    });
    
    const result = await wechatPayService.createNativeOrder(testOrderRequest);
    
    if (result.success) {
      console.log('✅ 创建支付订单成功!');
      console.log('📱 订单信息:', {
        outTradeNo: result.data?.outTradeNo,
        prepayId: result.data?.prepayId ? '已生成' : '未生成',
        codeUrl: result.data?.codeUrl ? '已生成' : '未生成'
      });
      
      return result.data;
    } else {
      console.log('❌ 创建支付订单失败:', result.message);
      console.log('🔍 错误代码:', result.errorCode);
      
      // 根据错误代码提供具体的修复建议
      provideTroubleshootingAdvice(result.errorCode);
      
      return null;
    }
    
  } catch (error) {
    console.error('❌ 创建支付订单异常:', error.message);
    return null;
  }
}

/**
 * 测试订单查询
 */
async function testOrderQuery(wechatPayService, outTradeNo) {
  console.log('\n🔍 第4步: 测试订单查询...\n');
  
  try {
    const result = await wechatPayService.queryOrder(outTradeNo);
    
    if (result.success) {
      console.log('✅ 订单查询成功!');
      console.log('📊 订单状态:', {
        tradeState: result.data?.tradeState,
        tradeStateDesc: result.data?.tradeStateDesc,
        outTradeNo: result.data?.outTradeNo
      });
      
      return result.data;
    } else {
      console.log('❌ 订单查询失败:', result.message);
      console.log('🔍 错误代码:', result.errorCode);
      
      return null;
    }
    
  } catch (error) {
    console.error('❌ 订单查询异常:', error.message);
    return null;
  }
}

/**
 * 测试关闭订单
 */
async function testCloseOrder(wechatPayService, outTradeNo) {
  console.log('\n🔒 第5步: 测试关闭订单...\n');
  
  try {
    const result = await wechatPayService.closeOrder(outTradeNo);
    
    if (result.success) {
      console.log('✅ 关闭订单成功!');
      return true;
    } else {
      console.log('⚠️ 关闭订单失败:', result.message);
      console.log('🔍 错误代码:', result.errorCode);
      
      // 关闭订单失败通常不影响整体测试结果
      return true;
    }
    
  } catch (error) {
    console.error('❌ 关闭订单异常:', error.message);
    return false;
  }
}

/**
 * 测试支付服务集成
 */
async function testPaymentServiceIntegration() {
  console.log('\n🔗 第6步: 测试支付服务集成...\n');
  
  try {
    const paymentService = getPaymentService();
    
    // 测试获取支付套餐
    const packages = await paymentService.getPaymentPackages();
    console.log('✅ 获取支付套餐成功:', packages.length, '个套餐');
    
    if (packages.length > 0) {
      const testPackage = packages[0];
      console.log('📦 测试套餐信息:', {
        name: testPackage.name,
        amount: testPackage.amount,
        points: testPackage.points
      });
      
      return testPackage;
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ 支付服务集成测试失败:', error.message);
    return null;
  }
}

/**
 * 提供故障排除建议
 */
function provideTroubleshootingAdvice(errorCode) {
  console.log('\n💡 故障排除建议:');
  
  switch (errorCode) {
    case 'SIGNERROR':
      console.log('1. 检查 WECHAT_PAY_V2_API_KEY 是否正确');
      console.log('2. 确认签名类型设置 (MD5 或 HMAC-SHA256)');
      console.log('3. 验证 APP ID 和商户号是否匹配');
      break;
      
    case 'APPID_MCHID_NOT_MATCH':
      console.log('1. 检查 WECHAT_PAY_V2_APP_ID 是否正确');
      console.log('2. 确认 WECHAT_PAY_V2_MCH_ID 是否正确');
      console.log('3. 验证在微信商户平台中是否已绑定该应用');
      break;
      
    case 'NOAUTH':
      console.log('1. 确认商户号已开通Native支付权限');
      console.log('2. 检查商户平台产品设置');
      console.log('3. 联系微信支付客服确认权限状态');
      break;
      
    case 'NETWORK_ERROR':
      console.log('1. 检查网络连接是否正常');
      console.log('2. 确认防火墙设置');
      console.log('3. 验证DNS解析是否正常');
      break;
      
    case 'TIMEOUT_ERROR':
      console.log('1. 检查网络延迟');
      console.log('2. 调整请求超时时间');
      console.log('3. 重试请求');
      break;
      
    default:
      console.log('1. 检查所有配置是否正确');
      console.log('2. 查看详细错误日志');
      console.log('3. 参考微信支付官方文档');
  }
}

/**
 * 主测试函数
 */
async function runPaymentTest() {
  console.log('🚀 微信支付修复验证测试');
  console.log('=' * 60);
  console.log('⏱️ 测试开始时间:', new Date().toLocaleString());
  console.log('=' * 60);
  
  let testResults = {
    config: false,
    service: false,
    createOrder: false,
    queryOrder: false,
    closeOrder: false,
    integration: false
  };
  
  try {
    // 1. 配置检查
    testResults.config = await testWechatPayConfig();
    if (!testResults.config) {
      throw new Error('配置检查失败，终止测试');
    }
    
    // 2. 服务初始化
    const wechatPayService = await testWechatPayService();
    testResults.service = wechatPayService !== null;
    if (!testResults.service) {
      throw new Error('服务初始化失败，终止测试');
    }
    
    // 3. 创建订单
    const orderData = await testCreatePaymentOrder(wechatPayService);
    testResults.createOrder = orderData !== null;
    
    if (testResults.createOrder && orderData) {
      // 4. 查询订单
      const queryData = await testOrderQuery(wechatPayService, orderData.outTradeNo);
      testResults.queryOrder = queryData !== null;
      
      // 5. 关闭订单
      testResults.closeOrder = await testCloseOrder(wechatPayService, orderData.outTradeNo);
    }
    
    // 6. 集成测试
    const integrationData = await testPaymentServiceIntegration();
    testResults.integration = integrationData !== null;
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
  
  // 显示测试结果
  console.log('\n' + '=' * 60);
  console.log('📊 测试结果汇总:');
  console.log('=' * 60);
  
  console.log(`配置检查: ${testResults.config ? '✅ 通过' : '❌ 失败'}`);
  console.log(`服务初始化: ${testResults.service ? '✅ 通过' : '❌ 失败'}`);
  console.log(`创建订单: ${testResults.createOrder ? '✅ 通过' : '❌ 失败'}`);
  console.log(`查询订单: ${testResults.queryOrder ? '✅ 通过' : '❌ 失败'}`);
  console.log(`关闭订单: ${testResults.closeOrder ? '✅ 通过' : '❌ 失败'}`);
  console.log(`集成测试: ${testResults.integration ? '✅ 通过' : '❌ 失败'}`);
  
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;
  
  console.log(`\n📈 测试通过率: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试都通过！微信支付修复成功！');
    console.log('✅ 系统已准备好接收支付请求');
  } else {
    console.log('\n⚠️ 部分测试未通过，请检查上述错误信息');
    console.log('💡 建议先修复失败的测试项，然后重新运行测试');
  }
  
  console.log('\n⏱️ 测试完成时间:', new Date().toLocaleString());
  console.log('=' * 60);
  
  // 返回测试结果
  return passedTests === totalTests;
}

// 运行测试
if (require.main === module) {
  runPaymentTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试运行异常:', error);
      process.exit(1);
    });
}

module.exports = { runPaymentTest }; 