/**
 * 最小化测试
 * 使用最基本的参数测试微信支付
 */

require('dotenv').config();

async function minimalTest() {
  console.log('🧪 最小化微信支付测试\n');
  console.log('=' .repeat(60));
  
  const crypto = require('crypto');
  const axios = require('axios');
  
  // 使用您的真实配置
  const appId = process.env.WECHAT_PAY_APP_ID;
  const mchId = process.env.WECHAT_PAY_MCH_ID;
  const apiKey = process.env.WECHAT_PAY_API_KEY;
  
  console.log('📋 配置信息确认:');
  console.log('   APP ID:', appId);
  console.log('   商户号:', mchId);
  console.log('   API密钥长度:', apiKey.length);
  console.log('   API密钥前8位:', apiKey.substring(0, 8));
  
  // 最简单的统一下单参数
  const minimalParams = {
    appid: appId,
    mch_id: mchId,
    nonce_str: 'MINIMAL123',
    body: 'test',
    out_trade_no: 'MINIMAL' + Date.now(),
    total_fee: 1,
    spbill_create_ip: '8.8.8.8', // 使用公网IP
    notify_url: 'https://example.com/notify', // 使用HTTPS
    trade_type: 'NATIVE'
  };
  
  console.log('\n📝 最小化参数:');
  Object.keys(minimalParams).forEach(key => {
    console.log(`   ${key}: ${minimalParams[key]}`);
  });
  
  // 手动计算签名
  const sortedKeys = Object.keys(minimalParams).sort();
  const stringA = sortedKeys.map(key => `${key}=${minimalParams[key]}`).join('&');
  const stringSignTemp = stringA + '&key=' + apiKey;
  const sign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
  
  console.log('\n🔐 签名计算:');
  console.log('   参数字符串:', stringA);
  console.log('   加密字符串:', stringSignTemp.replace(apiKey, '***'));
  console.log('   最终签名:', sign);
  
  const finalParams = { ...minimalParams, sign: sign };
  
  // 构建最简单的XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?><xml>` +
    Object.keys(finalParams).map(key => `<${key}><![CDATA[${finalParams[key]}]]></${key}>`).join('') +
    `</xml>`;
  
  console.log('\n📤 请求XML:');
  console.log(xml);
  
  try {
    console.log('\n🚀 发送API请求...');
    const response = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'Minimal Test v1.0'
      },
      timeout: 30000
    });
    
    console.log('\n📥 API响应:');
    console.log(response.data);
    
    // 解析响应
    if (response.data.includes('SUCCESS')) {
      console.log('\n✅ 测试成功! 您的配置是正确的');
    } else if (response.data.includes('签名错误')) {
      console.log('\n❌ 签名错误 - 可能的原因:');
      console.log('   1. API密钥不正确');
      console.log('   2. 商户号状态异常');
      console.log('   3. APP ID未绑定');
    } else if (response.data.includes('APPID_NOT_EXIST')) {
      console.log('\n❌ APP ID不存在');
    } else if (response.data.includes('MCHID_NOT_EXIST')) {
      console.log('\n❌ 商户号不存在');
    } else {
      console.log('\n⚠️ 其他错误，需要分析响应内容');
    }
    
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message);
  }
  
  // 建议下一步操作
  console.log('\n💡 建议操作:');
  console.log('   1. 确认商户平台登录信息');
  console.log('   2. 检查商户状态是否为"正常"');
  console.log('   3. 重新生成API密钥');
  console.log('   4. 确认APP ID绑定状态');
  console.log('   5. 联系微信支付技术支持');
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 最小化测试完成');
}

minimalTest().catch(console.error);