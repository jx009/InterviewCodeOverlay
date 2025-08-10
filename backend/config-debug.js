/**
 * 配置调试工具
 * 检查微信支付配置是否正确传递
 */

require('dotenv').config();

function debugConfig() {
  console.log('🔧 微信支付配置调试\n');
  console.log('=' .repeat(60));
  
  try {
    // 检查原始环境变量
    console.log('📋 原始环境变量:');
    console.log('   WECHAT_PAY_APP_ID:', process.env.WECHAT_PAY_APP_ID);
    console.log('   WECHAT_PAY_MCH_ID:', process.env.WECHAT_PAY_MCH_ID);
    console.log('   WECHAT_PAY_API_KEY长度:', process.env.WECHAT_PAY_API_KEY?.length);
    console.log('   WECHAT_PAY_NOTIFY_URL:', process.env.WECHAT_PAY_NOTIFY_URL);
    console.log('   WECHAT_PAY_SIGN_TYPE:', process.env.WECHAT_PAY_SIGN_TYPE);
    console.log('   PAYMENT_ENVIRONMENT:', process.env.PAYMENT_ENVIRONMENT);
    
    // 检查配置函数输出
    console.log('\n🔄 配置函数处理结果:');
    const { getWechatPayV2Config } = require('./dist/config/wechat-pay-v2');
    const config = getWechatPayV2Config();
    
    console.log('   处理后的配置:', {
      appId: config.appId,
      mchId: config.mchId,
      apiKeyLength: config.apiKey?.length,
      signType: config.signType,
      environment: config.environment,
      notifyUrl: config.notifyUrl
    });
    
    // 检查服务初始化
    console.log('\n🚀 服务初始化测试:');
    const { getWechatPayV2Service } = require('./dist/services/WechatPayV2Service');
    const service = getWechatPayV2Service();
    
    const serviceInfo = service.getServiceInfo();
    console.log('   服务配置:', serviceInfo);
    
    // 最关键：直接测试签名生成
    console.log('\n🔐 签名生成详细测试:');
    const { createWechatPayV2Crypto } = require('./dist/payment/utils/wechat-v2-crypto');
    const crypto_tool = createWechatPayV2Crypto(config.apiKey, config.signType);
    
    // 使用最简单的参数测试签名
    const testParams = {
      appid: config.appId,
      mch_id: config.mchId,
      nonce_str: 'TEST123',
      body: 'test',
      out_trade_no: 'TEST' + Date.now(),
      total_fee: 1,
      spbill_create_ip: '127.0.0.1',
      notify_url: config.notifyUrl,
      trade_type: 'NATIVE'
    };
    
    console.log('   测试参数:', testParams);
    
    // 手动计算签名
    const crypto = require('crypto');
    const sortedKeys = Object.keys(testParams).sort();
    const stringA = sortedKeys.map(key => `${key}=${testParams[key]}`).join('&');
    const stringSignTemp = stringA + '&key=' + config.apiKey;
    const manualSign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
    
    console.log('   手动签名字符串:', stringA);
    console.log('   手动生成签名:', manualSign);
    
    // 工具签名
    const toolSign = crypto_tool.generateSign(testParams);
    console.log('   工具生成签名:', toolSign);
    console.log('   签名是否一致:', manualSign === toolSign ? '✅ 一致' : '❌ 不一致');
    
    // 比较字符编码
    console.log('\n📝 字符编码检查:');
    const testString = stringSignTemp;
    console.log('   原始字符串长度:', testString.length);
    console.log('   UTF-8字节长度:', Buffer.from(testString, 'utf8').length);
    console.log('   包含中文:', /[\u4e00-\u9fa5]/.test(testString));
    
    // 检查API密钥
    console.log('\n🗝️ API密钥详细检查:');
    const apiKey = config.apiKey;
    console.log('   密钥长度:', apiKey.length);
    console.log('   密钥前缀:', apiKey.substring(0, 4));
    console.log('   密钥后缀:', apiKey.substring(apiKey.length - 4));
    console.log('   是否包含特殊字符:', /[^a-zA-Z0-9]/.test(apiKey));
    console.log('   所有字符都是可打印字符:', /^[\x20-\x7E]+$/.test(apiKey));
    
  } catch (error) {
    console.error('❌ 配置调试失败:', error);
    console.error('错误堆栈:', error.stack);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔧 配置调试完成');
}

debugConfig();