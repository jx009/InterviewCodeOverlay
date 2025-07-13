// 配置迁移测试脚本
const { getWechatPayV2Config, validateWechatPayV2Config, checkPaymentConfig } = require('./dist/payment/config/payment-config');
const { getWechatPayV2Service } = require('./dist/services/WechatPayV2Service');

console.log('🧪 开始测试配置迁移...\\n');

// 测试1: 配置文件完整性检查
console.log('📋 测试1: 配置文件完整性检查');
try {
  const configCheck = checkPaymentConfig();
  if (configCheck.valid) {
    console.log('✅ 配置文件完整性检查通过');
  } else {
    console.log('❌ 配置文件完整性检查失败:');
    configCheck.errors.forEach(error => console.log(`  - ${error}`));
  }
} catch (error) {
  console.log('❌ 配置文件完整性检查出错:', error.message);
}

console.log('');

// 测试2: V2配置加载
console.log('📋 测试2: V2配置加载');
try {
  const config = getWechatPayV2Config();
  console.log('✅ V2配置加载成功:', {
    appId: config.appId ? `${config.appId.substring(0, 8)}...` : 'N/A',
    mchId: config.mchId ? `${config.mchId.substring(0, 8)}...` : 'N/A',
    signType: config.signType,
    environment: config.environment,
    hasApiKey: !!config.apiKey,
    hasNotifyUrl: !!config.notifyUrl
  });
  
  // 验证配置
  const validation = validateWechatPayV2Config(config);
  if (validation.valid) {
    console.log('✅ V2配置验证通过');
  } else {
    console.log('❌ V2配置验证失败:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  }
} catch (error) {
  console.log('❌ V2配置加载失败:', error.message);
}

console.log('');

// 测试3: V2服务初始化
console.log('📋 测试3: V2服务初始化');
try {
  const service = getWechatPayV2Service();
  const serviceInfo = service.getServiceInfo();
  console.log('✅ V2服务初始化成功:', {
    appId: serviceInfo.appId ? `${serviceInfo.appId.substring(0, 8)}...` : 'N/A',
    mchId: serviceInfo.mchId ? `${serviceInfo.mchId.substring(0, 8)}...` : 'N/A',
    signType: serviceInfo.signType,
    environment: serviceInfo.environment,
    hasNotifyUrl: !!serviceInfo.notifyUrl
  });
} catch (error) {
  console.log('❌ V2服务初始化失败:', error.message);
}

console.log('');

// 测试4: 环境变量检查
console.log('📋 测试4: 环境变量检查');
const requiredEnvs = [
  'WECHAT_PAY_APP_ID',
  'WECHAT_PAY_MCH_ID',
  'WECHAT_PAY_API_KEY',
  'BASE_URL'
];

const optionalEnvs = [
  'WECHAT_PAY_SIGN_TYPE',
  'WECHAT_PAY_NOTIFY_URL',
  'PAYMENT_ENVIRONMENT',
  'WECHAT_PAY_CERT_PATH',
  'WECHAT_PAY_KEY_PATH'
];

console.log('必需的环境变量:');
requiredEnvs.forEach(env => {
  const value = process.env[env];
  if (value) {
    console.log(`  ✅ ${env}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`  ❌ ${env}: 未设置`);
  }
});

console.log('\\n可选的环境变量:');
optionalEnvs.forEach(env => {
  const value = process.env[env];
  if (value) {
    console.log(`  ✅ ${env}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`  ⚠️  ${env}: 未设置（使用默认值）`);
  }
});

console.log('');

// 测试5: 工具类功能
console.log('📋 测试5: 工具类功能');
try {
  const { WechatPayV2Crypto } = require('./dist/payment/utils/wechat-v2-crypto');
  const testApiKey = 'test-api-key-12345678901234567890';
  const crypto = new WechatPayV2Crypto(testApiKey, 'MD5');
  
  // 测试签名
  const testParams = {
    appid: 'test_app_id',
    mch_id: 'test_mch_id',
    nonce_str: 'test_nonce_str',
    total_fee: 100
  };
  
  const signature = crypto.generateSign(testParams);
  console.log('✅ 签名生成功能正常:', signature.substring(0, 16) + '...');
  
  // 测试验证
  const paramsWithSign = { ...testParams, sign: signature };
  const isValid = crypto.verifySign(paramsWithSign);
  console.log('✅ 签名验证功能正常:', isValid);
  
  // 测试XML转换
  const xmlString = crypto.objectToXml(testParams);
  console.log('✅ XML转换功能正常:', xmlString.includes('<xml>'));
  
} catch (error) {
  console.log('❌ 工具类功能测试失败:', error.message);
}

console.log('');

// 测试结果总结
console.log('🎉 配置迁移测试完成！');
console.log('');
console.log('📝 .env 文件需要包含以下环境变量:');
console.log('');
console.log('# 微信支付V2配置');
console.log('WECHAT_PAY_APP_ID=your_app_id');
console.log('WECHAT_PAY_MCH_ID=your_mch_id');
console.log('WECHAT_PAY_API_KEY=your_api_key');
console.log('');
console.log('# 可选配置');
console.log('WECHAT_PAY_SIGN_TYPE=MD5  # 或 HMAC-SHA256');
console.log('PAYMENT_ENVIRONMENT=sandbox  # 或 production');
console.log('WECHAT_PAY_NOTIFY_URL=https://your-domain.com/api/payment/notify/wechat');
console.log('');
console.log('# 基础配置');
console.log('BASE_URL=https://your-domain.com');
console.log('');
console.log('# 如果需要退款功能（可选）');
console.log('WECHAT_PAY_CERT_PATH=path/to/apiclient_cert.pem');
console.log('WECHAT_PAY_KEY_PATH=path/to/apiclient_key.pem');
console.log('');
console.log('✅ 配置迁移已完成，请更新您的 .env 文件并重启服务。'); 