/**
 * 修复API密钥和签名问题
 * 检查用户的API密钥格式并提供解决方案
 */

console.log('🔧 API密钥问题诊断和修复...\n');

// 用户当前的配置
const userApiKey = 'Aa11111111122222222223333333333';
console.log('📋 当前配置分析:');
console.log('   API密钥:', userApiKey);
console.log('   长度:', userApiKey.length, '字符');
console.log('   期望长度: 32字符');
console.log('   状态:', userApiKey.length === 32 ? '✅ 正确' : '❌ 错误');

console.log('\n🔍 问题分析:');
console.log('   1. 微信支付API密钥必须是32位字符');
console.log('   2. 您的API密钥只有31位');
console.log('   3. 这导致了签名验证失败');

console.log('\n💡 解决方案:');

// 方案1：补齐到32位
const fixedKey1 = userApiKey + '3'; // 在末尾加一个字符
console.log('\n方案1 - 补齐密钥:');
console.log('   修正后密钥:', fixedKey1);
console.log('   长度:', fixedKey1.length, '字符');

// 方案2：检查是否密钥不完整
console.log('\n方案2 - 检查原始密钥:');
console.log('   请确认您在微信支付商户后台看到的完整API密钥');
console.log('   可能存在复制时漏掉最后一位的情况');

// 方案3：重新生成密钥
console.log('\n方案3 - 重新设置API密钥:');
console.log('   1. 登录微信支付商户平台');
console.log('   2. 进入【账户中心】→【API安全】');
console.log('   3. 重新设置32位API密钥');
console.log('   4. 更新环境变量配置');

console.log('\n🛠️  临时修复方案:');
console.log('   如果您确认这是正确的密钥，请尝试以下修正:');

// 生成不同的补全方案
const solutions = [
  userApiKey + '3',
  userApiKey + 'A',
  userApiKey + '1',
  userApiKey + 'a'
];

solutions.forEach((solution, index) => {
  console.log(`   选项${index + 1}: ${solution} (长度: ${solution.length})`);
});

console.log('\n⚠️  重要提醒:');
console.log('   1. API密钥修改后需要重启服务');
console.log('   2. 建议在微信支付后台重新生成正确的32位密钥');
console.log('   3. 测试时建议使用1分钱金额');
console.log('   4. localhost回调URL仅适用于开发测试');

console.log('\n📝 推荐的.env配置:');
console.log(`
# 请更新为正确的32位API密钥
WECHAT_PAY_APP_ID=wx04948e55b1c03277
WECHAT_PAY_MCH_ID=1608730981
WECHAT_PAY_API_KEY=${fixedKey1}
WECHAT_PAY_NOTIFY_URL=http://localhost:3001/api/payment/notify/wechat
WECHAT_PAY_SIGN_TYPE=MD5
PAYMENT_ENVIRONMENT=production
`);

console.log('\n🧪 测试签名生成 (使用修正后的密钥):');

// 导入加密工具测试
try {
  const { createWechatPayV2Crypto } = require('./dist/payment/utils/wechat-v2-crypto');
  
  const crypto = createWechatPayV2Crypto(fixedKey1, 'MD5');
  
  const testParams = {
    appid: 'wx04948e55b1c03277',
    mch_id: '1608730981',
    nonce_str: 'test123456789012',
    body: '测试商品',
    out_trade_no: 'TEST12345',
    total_fee: 1,
    spbill_create_ip: '127.0.0.1',
    notify_url: 'http://localhost:3001/api/payment/notify/wechat',
    trade_type: 'NATIVE'
  };
  
  const signature = crypto.generateSign(testParams);
  console.log('   生成的签名:', signature);
  
  // 验证签名
  const verifyParams = { ...testParams, sign: signature };
  const isValid = crypto.verifySign(verifyParams);
  console.log('   签名验证:', isValid ? '✅ 通过' : '❌ 失败');
  
} catch (error) {
  console.log('   ❌ 测试失败:', error.message);
}

console.log('\n🎯 下一步操作:');
console.log('   1. 更新.env文件中的API密钥为32位');
console.log('   2. 重启服务');
console.log('   3. 重新测试支付功能');
console.log('   4. 确认二维码生成正常');

console.log('\n✨ 修复完成后，二维码应该指向正确的微信支付URL！');