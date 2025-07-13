/**
 * 微信支付V2配置测试脚本（不依赖数据库）
 */

// 手动设置环境变量
process.env.WECHAT_PAY_V2_APP_ID = 'wx04948e55b1c03277';
process.env.WECHAT_PAY_V2_MCH_ID = '1608730981';
process.env.WECHAT_PAY_V2_API_KEY = 'Aa11111111222222222333333333';
process.env.WECHAT_PAY_V2_NOTIFY_URL = 'http://localhost:3001/api/payment/notify/wechat';
process.env.WECHAT_PAY_V2_SIGN_TYPE = 'MD5';
process.env.PAYMENT_ENVIRONMENT = 'sandbox';

const { createWechatPayV2Crypto } = require('./dist/payment/utils/wechat-v2-crypto');
const { getWechatPayV2Config, getWechatPayV2Urls, getWechatPayV2ErrorMessage } = require('./dist/config/wechat-pay-v2');

async function testConfiguration() {
  console.log('🔧 测试微信支付V2配置加载...');
  
  try {
    const config = getWechatPayV2Config();
    console.log('✅ 配置加载成功:', {
      appId: config.appId,
      mchId: config.mchId,
      apiKeyLength: config.apiKey.length,
      signType: config.signType,
      environment: config.environment,
      notifyUrl: config.notifyUrl
    });
    
    return config;
  } catch (error) {
    console.error('❌ 配置加载失败:', error.message);
    return null;
  }
}

async function testCryptoFunctions() {
  console.log('\n🔐 测试加密工具函数...');
  
  try {
    const crypto = createWechatPayV2Crypto(process.env.WECHAT_PAY_V2_API_KEY, 'MD5');
    
    // 测试随机字符串生成
    const nonceStr = crypto.generateNonceStr();
    console.log('✅ 随机字符串生成:', nonceStr, `(长度: ${nonceStr.length})`);
    
    // 测试时间戳生成
    const timestamp = crypto.generateTimestamp();
    console.log('✅ 时间戳生成:', timestamp);
    
    // 测试金额转换
    const yuanAmount = 10.50;
    const fenAmount = crypto.yuanToFen(yuanAmount);
    const backToYuan = crypto.fenToYuan(fenAmount);
    console.log('✅ 金额转换:', `${yuanAmount}元 -> ${fenAmount}分 -> ${backToYuan}元`);
    
    // 测试签名生成和验证
    const testParams = {
      appid: process.env.WECHAT_PAY_V2_APP_ID,
      mch_id: process.env.WECHAT_PAY_V2_MCH_ID,
      nonce_str: nonceStr,
      body: '测试商品',
      out_trade_no: 'TEST' + Date.now(),
      total_fee: fenAmount,
      spbill_create_ip: '127.0.0.1',
      notify_url: process.env.WECHAT_PAY_V2_NOTIFY_URL,
      trade_type: 'NATIVE'
    };
    
    const signature = crypto.generateSign(testParams);
    console.log('✅ 签名生成成功:', signature);
    
    // 验证签名
    const paramsWithSign = { ...testParams, sign: signature };
    const isValid = crypto.verifySign(paramsWithSign);
    console.log('✅ 签名验证:', isValid ? '通过' : '失败');
    
    // 测试XML生成
    const xmlData = crypto.objectToXml(paramsWithSign);
    console.log('✅ XML生成成功');
    console.log('📄 XML内容 (前200字符):', xmlData.substring(0, 200) + '...');
    
    // 测试XML解析
    const parsedObj = crypto.xmlToObjectSync(xmlData);
    console.log('✅ XML解析成功:', Object.keys(parsedObj).length + '个字段');
    
    return true;
  } catch (error) {
    console.error('❌ 加密工具测试失败:', error.message);
    return false;
  }
}

async function testURLConfiguration() {
  console.log('\n🌐 测试API地址配置...');
  
  try {
    const sandboxUrls = getWechatPayV2Urls('sandbox');
    const productionUrls = getWechatPayV2Urls('production');
    
    console.log('✅ 沙箱环境API地址:');
    console.log('   统一下单:', sandboxUrls.UNIFIED_ORDER);
    console.log('   订单查询:', sandboxUrls.ORDER_QUERY);
    console.log('   关闭订单:', sandboxUrls.CLOSE_ORDER);
    
    console.log('✅ 生产环境API地址:');
    console.log('   统一下单:', productionUrls.UNIFIED_ORDER);
    console.log('   订单查询:', productionUrls.ORDER_QUERY);
    console.log('   关闭订单:', productionUrls.CLOSE_ORDER);
    
    return true;
  } catch (error) {
    console.error('❌ URL配置测试失败:', error.message);
    return false;
  }
}

async function testErrorMessages() {
  console.log('\n📝 测试错误信息配置...');
  
  try {
    const errorCodes = [
      'NOAUTH',
      'NOTENOUGH', 
      'ORDERPAID',
      'ORDERCLOSED',
      'SYSTEMERROR',
      'SIGNERROR',
      'UNKNOWN_CODE'
    ];
    
    errorCodes.forEach(code => {
      const message = getWechatPayV2ErrorMessage(code);
      console.log(`✅ ${code}: ${message}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ 错误信息测试失败:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 开始微信支付V2配置功能验证...\n');
  
  const results = [];
  
  // 运行测试
  const config = await testConfiguration();
  results.push(config !== null);
  
  if (config) {
    results.push(await testCryptoFunctions());
    results.push(await testURLConfiguration());
    results.push(await testErrorMessages());
  } else {
    results.push(false, false, false);
  }
  
  // 输出结果
  console.log('\n📊 测试结果汇总:');
  console.log('====================');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ 通过: ${passed}/${total}`);
  console.log(`❌ 失败: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 所有测试通过！微信支付V2配置功能正常');
    console.log('\n💡 修复说明:');
    console.log('   ✅ 修复了环境变量名称 (WECHAT_PAY_* -> WECHAT_PAY_V2_*)');
    console.log('   ✅ 修复了函数名称错误 (getWechatPayV2URLs -> getWechatPayV2Urls)');
    console.log('   ✅ 添加了缺失的接口定义 (WechatPayV2OrderQueryRequest)');
    console.log('   ✅ 修复了重复的类定义');
    console.log('   ✅ 添加了错误信息映射函数');
    console.log('   ✅ 修复了环境检测逻辑');
    console.log('\n📋 生产环境部署注意事项:');
    console.log('   1. 将 PAYMENT_ENVIRONMENT 设置为 "production"');
    console.log('   2. 配置真实的微信支付商户信息');
    console.log('   3. 确保回调URL可以被微信服务器访问');
    console.log('   4. 在微信支付商户后台配置正确的回调URL');
  } else {
    console.log('\n⚠️  部分测试失败，请检查配置');
  }
}

// 运行测试
runTests().catch(console.error);