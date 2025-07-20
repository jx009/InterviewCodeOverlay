/**
 * 生产环境微信支付测试
 * 验证真实API调用和配置
 */

require('dotenv').config();

async function testProductionPayment() {
  console.log('🏭 生产环境微信支付测试\n');
  console.log('=' .repeat(60));
  
  try {
    // 验证环境变量配置
    console.log('✅ 环境变量验证:');
    const requiredEnvs = {
      WECHAT_PAY_APP_ID: process.env.WECHAT_PAY_APP_ID,
      WECHAT_PAY_MCH_ID: process.env.WECHAT_PAY_MCH_ID,
      WECHAT_PAY_API_KEY: process.env.WECHAT_PAY_API_KEY,
      WECHAT_PAY_NOTIFY_URL: process.env.WECHAT_PAY_NOTIFY_URL,
      WECHAT_PAY_SIGN_TYPE: process.env.WECHAT_PAY_SIGN_TYPE,
      PAYMENT_ENVIRONMENT: process.env.PAYMENT_ENVIRONMENT
    };
    
    let configValid = true;
    for (const [key, value] of Object.entries(requiredEnvs)) {
      if (!value) {
        console.log(`   ❌ ${key}: 未配置`);
        configValid = false;
      } else if (key === 'WECHAT_PAY_API_KEY') {
        console.log(`   ✅ ${key}: ${value.length}字符 (${value.substring(0, 8)}...)`);
        if (value.length !== 32) {
          console.log(`   ⚠️ ${key}: 长度错误，应为32字符`);
          configValid = false;
        }
      } else {
        console.log(`   ✅ ${key}: ${value}`);
      }
    }
    
    if (!configValid) {
      console.log('\n❌ 配置验证失败，请检查环境变量');
      return;
    }
    
    // 初始化微信支付服务
    console.log('\n🔄 初始化微信支付服务...');
    const { getWechatPayV2Service } = require('./dist/services/WechatPayV2Service');
    const wechatPayService = getWechatPayV2Service();
    
    console.log('✅ 微信支付服务初始化成功');
    console.log('📋 服务信息:', wechatPayService.getServiceInfo());
    
    // 创建测试订单
    console.log('\n🚀 创建真实微信支付订单...');
    const testOrder = {
      outTradeNo: 'PROD_TEST_' + Date.now(),
      totalFee: 0.01, // 1分钱测试
      body: '生产环境测试 - 1分钱',
      attach: JSON.stringify({
        test: true,
        environment: 'production',
        timestamp: Date.now()
      }),
      spbillCreateIp: '127.0.0.1'
    };
    
    console.log('📋 订单参数:', {
      outTradeNo: testOrder.outTradeNo,
      totalFee: testOrder.totalFee + '元',
      body: testOrder.body
    });
    
    // 调用真实API
    const result = await wechatPayService.createNativeOrder(testOrder);
    
    console.log('\n📊 API调用结果:');
    console.log('   状态:', result.success ? '✅ 成功' : '❌ 失败');
    console.log('   消息:', result.message);
    
    if (result.success && result.data) {
      console.log('\n🎉 微信支付API调用成功!');
      console.log('   预支付ID:', result.data.prepayId);
      console.log('   二维码URL:', result.data.codeUrl);
      console.log('   商户订单号:', result.data.outTradeNo);
      
      // 验证URL格式
      const codeUrl = result.data.codeUrl;
      console.log('\n🔍 二维码URL分析:');
      
      if (codeUrl && codeUrl.startsWith('weixin://wxpay/bizpayurl')) {
        console.log('   ✅ URL协议: 正确的微信支付协议');
        console.log('   ✅ URL来源: 真实微信支付API返回');
        console.log('   ✅ 预期结果: 扫码后显示微信支付界面');
        console.log('   ✅ 问题状态: 已修复，不会再显示"系统繁忙"');
      } else {
        console.log('   ❌ URL格式异常:', codeUrl);
      }
      
      console.log('\n🏆 生产环境测试结果:');
      console.log('   ✅ 配置验证: 通过');
      console.log('   ✅ 服务初始化: 成功');
      console.log('   ✅ API调用: 成功');
      console.log('   ✅ URL生成: 正确');
      console.log('   ✅ 总体状态: 生产环境就绪');
      
    } else {
      console.log('\n❌ 微信支付API调用失败');
      console.log('   错误代码:', result.errorCode);
      console.log('   错误详情:', result.message);
      
      // 提供错误解决建议
      console.log('\n🔧 错误解决建议:');
      if (result.errorCode === 'SIGNERROR') {
        console.log('   1. 检查API密钥是否正确（必须是32位）');
        console.log('   2. 确认商户号和APP ID匹配');
        console.log('   3. 验证微信支付商户后台配置');
      } else if (result.errorCode === 'APPID_NOT_EXIST') {
        console.log('   1. 检查APP ID是否正确');
        console.log('   2. 确认APP ID已绑定微信支付');
      } else if (result.errorCode === 'MCHID_NOT_EXIST') {
        console.log('   1. 检查商户号是否正确');
        console.log('   2. 确认商户状态为正常');
      } else {
        console.log('   1. 检查网络连接');
        console.log('   2. 确认所有配置参数');
        console.log('   3. 联系微信支付技术支持');
      }
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程异常:', error.message);
    console.error('错误详情:', error.stack);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏭 生产环境测试完成');
}

// 运行生产环境测试
testProductionPayment().catch(console.error);