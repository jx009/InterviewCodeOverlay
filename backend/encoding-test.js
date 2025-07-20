/**
 * 字符编码测试
 * 检查中文字符编码是否影响签名
 */

require('dotenv').config();

function testEncoding() {
  console.log('🈚 字符编码测试\n');
  console.log('=' .repeat(60));
  
  const crypto = require('crypto');
  const apiKey = process.env.WECHAT_PAY_API_KEY;
  
  // 测试1: 纯英文参数
  console.log('📝 测试1: 纯英文参数');
  const englishParams = {
    appid: process.env.WECHAT_PAY_APP_ID,
    mch_id: process.env.WECHAT_PAY_MCH_ID,
    nonce_str: 'ibuaiVcKdpRxkhJA',
    body: 'Test Product', // 纯英文
    out_trade_no: 'TEST123456789',
    total_fee: 1,
    spbill_create_ip: '127.0.0.1',
    notify_url: process.env.WECHAT_PAY_NOTIFY_URL,
    trade_type: 'NATIVE'
  };
  
  const englishSorted = Object.keys(englishParams).sort();
  const englishStringA = englishSorted.map(key => `${key}=${englishParams[key]}`).join('&');
  const englishStringSignTemp = englishStringA + '&key=' + apiKey;
  const englishSign = crypto.createHash('md5').update(englishStringSignTemp, 'utf8').digest('hex').toUpperCase();
  
  console.log('   字符串A:', englishStringA);
  console.log('   签名:', englishSign);
  
  // 测试2: 中文参数
  console.log('\n📝 测试2: 中文参数');
  const chineseParams = {
    appid: process.env.WECHAT_PAY_APP_ID,
    mch_id: process.env.WECHAT_PAY_MCH_ID,
    nonce_str: 'ibuaiVcKdpRxkhJA',
    body: '测试商品', // 中文
    out_trade_no: 'TEST123456789',
    total_fee: 1,
    spbill_create_ip: '127.0.0.1',
    notify_url: process.env.WECHAT_PAY_NOTIFY_URL,
    trade_type: 'NATIVE'
  };
  
  const chineseSorted = Object.keys(chineseParams).sort();
  const chineseStringA = chineseSorted.map(key => `${key}=${chineseParams[key]}`).join('&');
  const chineseStringSignTemp = chineseStringA + '&key=' + apiKey;
  const chineseSign = crypto.createHash('md5').update(chineseStringSignTemp, 'utf8').digest('hex').toUpperCase();
  
  console.log('   字符串A:', chineseStringA);
  console.log('   签名:', chineseSign);
  
  // 测试3: URL编码的中文
  console.log('\n📝 测试3: URL编码的中文');
  const encodedParams = {
    appid: process.env.WECHAT_PAY_APP_ID,
    mch_id: process.env.WECHAT_PAY_MCH_ID,
    nonce_str: 'ibuaiVcKdpRxkhJA',
    body: encodeURIComponent('测试商品'), // URL编码
    out_trade_no: 'TEST123456789',
    total_fee: 1,
    spbill_create_ip: '127.0.0.1',
    notify_url: process.env.WECHAT_PAY_NOTIFY_URL,
    trade_type: 'NATIVE'
  };
  
  const encodedSorted = Object.keys(encodedParams).sort();
  const encodedStringA = encodedSorted.map(key => `${key}=${encodedParams[key]}`).join('&');
  const encodedStringSignTemp = encodedStringA + '&key=' + apiKey;
  const encodedSign = crypto.createHash('md5').update(encodedStringSignTemp, 'utf8').digest('hex').toUpperCase();
  
  console.log('   字符串A:', encodedStringA);
  console.log('   签名:', encodedSign);
  
  // 测试4: 模拟真实API调用
  console.log('\n🚀 测试4: 模拟真实API调用');
  
  const axios = require('axios');
  
  async function testRealAPI() {
    try {
      // 使用英文参数测试
      const testParams = {
        appid: process.env.WECHAT_PAY_APP_ID,
        mch_id: process.env.WECHAT_PAY_MCH_ID,
        nonce_str: 'TEST' + Date.now(),
        body: 'Test Product English', // 英文商品名
        out_trade_no: 'ENG_' + Date.now(),
        total_fee: 1,
        spbill_create_ip: '127.0.0.1',
        notify_url: process.env.WECHAT_PAY_NOTIFY_URL,
        trade_type: 'NATIVE'
      };
      
      const testSorted = Object.keys(testParams).sort();
      const testStringA = testSorted.map(key => `${key}=${testParams[key]}`).join('&');
      const testStringSignTemp = testStringA + '&key=' + apiKey;
      const testSign = crypto.createHash('md5').update(testStringSignTemp, 'utf8').digest('hex').toUpperCase();
      
      const finalParams = { ...testParams, sign: testSign };
      
      // 构建XML
      const xmlBuilder = (obj) => {
        let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xml>';
        Object.keys(obj).forEach(key => {
          xml += `<${key}>${obj[key]}</${key}>`;
        });
        xml += '</xml>';
        return xml;
      };
      
      const xmlData = xmlBuilder(finalParams);
      
      console.log('   请求参数(英文):', testStringA);
      console.log('   生成签名:', testSign);
      
      const response = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xmlData, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'User-Agent': 'WeChat Pay Encoding Test'
        },
        timeout: 30000
      });
      
      console.log('   API响应:', response.data);
      
      if (response.data.includes('SUCCESS')) {
        console.log('   ✅ 英文参数调用成功!');
      } else if (response.data.includes('签名错误')) {
        console.log('   ❌ 英文参数仍然签名错误');
      }
      
    } catch (error) {
      console.error('   ❌ API调用失败:', error.message);
    }
  }
  
  return testRealAPI();
}

testEncoding().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('🈚 编码测试完成');
}).catch(console.error);