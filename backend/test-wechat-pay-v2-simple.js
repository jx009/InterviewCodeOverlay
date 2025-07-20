// 简化的微信支付V2配置测试脚本
require('dotenv').config();

async function testWechatPayV2Config() {
  console.log('🧪 测试微信支付V2配置...\n');

  // 检查V2配置
  const v2Config = {
    appId: process.env.WECHAT_PAY_V2_APP_ID,
    mchId: process.env.WECHAT_PAY_V2_MCH_ID,
    apiKey: process.env.WECHAT_PAY_V2_API_KEY,
    notifyUrl: process.env.WECHAT_PAY_V2_NOTIFY_URL,
    signType: process.env.WECHAT_PAY_V2_SIGN_TYPE
  };

  console.log('📋 V2配置检查:');
  console.log('=====================================');
  console.log(`WECHAT_PAY_V2_APP_ID: ${v2Config.appId ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`WECHAT_PAY_V2_MCH_ID: ${v2Config.mchId ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`WECHAT_PAY_V2_API_KEY: ${v2Config.apiKey ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`WECHAT_PAY_V2_NOTIFY_URL: ${v2Config.notifyUrl ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`WECHAT_PAY_V2_SIGN_TYPE: ${v2Config.signType || 'MD5'}`);
  console.log('=====================================\n');

  // 检查V3配置
  const v3Config = {
    appId: process.env.WECHAT_PAY_APP_ID,
    mchId: process.env.WECHAT_PAY_MCH_ID,
    apiKey: process.env.WECHAT_PAY_API_KEY,
    apiV3Key: process.env.WECHAT_PAY_API_V3_KEY,
    certPath: process.env.WECHAT_PAY_CERT_PATH,
    keyPath: process.env.WECHAT_PAY_KEY_PATH,
    serialNo: process.env.WECHAT_PAY_SERIAL_NO
  };

  console.log('📋 V3配置检查:');
  console.log('=====================================');
  console.log(`WECHAT_PAY_APP_ID: ${v3Config.appId ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`WECHAT_PAY_MCH_ID: ${v3Config.mchId ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`WECHAT_PAY_API_KEY: ${v3Config.apiKey ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`WECHAT_PAY_API_V3_KEY: ${v3Config.apiV3Key ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`WECHAT_PAY_CERT_PATH: ${v3Config.certPath ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`WECHAT_PAY_KEY_PATH: ${v3Config.keyPath ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`WECHAT_PAY_SERIAL_NO: ${v3Config.serialNo ? '✅ 已配置' : '❌ 未配置'}`);
  console.log('=====================================\n');

  // 判断应该使用哪个版本
  const hasV2Config = v2Config.appId && v2Config.mchId && v2Config.apiKey && v2Config.notifyUrl;
  const hasV3Config = v3Config.appId && v3Config.mchId && v3Config.apiKey && v3Config.apiV3Key;

  console.log('💡 配置分析结果:');
  console.log('=====================================');
  console.log(`V2配置完整: ${hasV2Config ? '✅' : '❌'}`);
  console.log(`V3配置完整: ${hasV3Config ? '✅' : '❌'}`);

  if (hasV2Config && !hasV3Config) {
    console.log('🚀 推荐使用: V2版本');
    console.log('✅ 系统将自动使用V2适配器');
  } else if (hasV3Config && !hasV2Config) {
    console.log('🚀 推荐使用: V3版本');
    console.log('⚠️ 但您提供的是V2配置，请检查配置');
  } else if (hasV2Config && hasV3Config) {
    console.log('🚀 推荐使用: V2版本（优先）');
    console.log('✅ 因为您明确配置了V2参数');
  } else {
    console.log('❌ 错误: 没有完整的支付配置');
    console.log('请检查您的环境变量配置');
  }
  console.log('=====================================\n');

  // 根据您的配置提供建议
  if (hasV2Config) {
    console.log('🎉 配置验证通过！');
    console.log('您的V2配置信息：');
    console.log(`- AppID: ${v2Config.appId}`);
    console.log(`- 商户号: ${v2Config.mchId}`);
    console.log(`- 签名类型: ${v2Config.signType || 'MD5'}`);
    console.log(`- 回调地址: ${v2Config.notifyUrl}`);
    console.log('\n✅ 系统已配置为使用V2适配器，应该可以正常工作！');
  } else {
    console.log('❌ 配置不完整！');
    console.log('\n请在.env文件中添加以下配置：');
    console.log('WECHAT_PAY_V2_APP_ID=你的微信AppID');
    console.log('WECHAT_PAY_V2_MCH_ID=你的商户号'); 
    console.log('WECHAT_PAY_V2_API_KEY=你的API密钥');
    console.log('WECHAT_PAY_V2_NOTIFY_URL=你的回调地址');
    console.log('WECHAT_PAY_V2_SIGN_TYPE=MD5');
  }
}

// 运行测试
if (require.main === module) {
  testWechatPayV2Config().catch(console.error);
}

module.exports = { testWechatPayV2Config }; 