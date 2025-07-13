/**
 * 微信支付签名调试工具
 * 对比官方算法和我们的实现
 */

require('dotenv').config();

function debugSignature() {
  console.log('🔐 微信支付签名调试\n');
  console.log('=' .repeat(60));
  
  const crypto = require('crypto');
  const apiKey = process.env.WECHAT_PAY_API_KEY;
  
  // 测试参数（使用真实配置）
  const params = {
    appid: process.env.WECHAT_PAY_APP_ID,
    mch_id: process.env.WECHAT_PAY_MCH_ID,
    nonce_str: 'ibuaiVcKdpRxkhJA',
    body: '测试商品',
    out_trade_no: 'TEST123456789',
    total_fee: 1,
    spbill_create_ip: '127.0.0.1',
    notify_url: process.env.WECHAT_PAY_NOTIFY_URL,
    trade_type: 'NATIVE',
    sign_type: 'MD5'
  };
  
  console.log('📋 原始参数:');
  Object.keys(params).forEach(key => {
    console.log(`   ${key}: ${params[key]}`);
  });
  
  // 方法1: 官方标准算法
  console.log('\n🔥 方法1: 官方标准算法');
  
  // 1. 过滤空参数
  const filteredParams1 = {};
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value !== null && value !== undefined && value !== '' && value.toString().trim() !== '') {
      filteredParams1[key] = value.toString();
    }
  });
  
  console.log('   过滤后参数:', Object.keys(filteredParams1));
  
  // 2. 字典序排序
  const sortedKeys1 = Object.keys(filteredParams1).sort();
  console.log('   排序后键名:', sortedKeys1);
  
  // 3. 拼接字符串
  const stringA1 = sortedKeys1.map(key => `${key}=${filteredParams1[key]}`).join('&');
  console.log('   字符串A:', stringA1);
  
  // 4. 添加key
  const stringSignTemp1 = stringA1 + '&key=' + apiKey;
  console.log('   完整字符串:', stringSignTemp1.replace(apiKey, '***'));
  
  // 5. MD5加密并转大写
  const sign1 = crypto.createHash('md5').update(stringSignTemp1, 'utf8').digest('hex').toUpperCase();
  console.log('   最终签名:', sign1);
  
  // 方法2: 使用我们的crypto工具
  console.log('\n🔧 方法2: 使用我们的crypto工具');
  
  try {
    const { createWechatPayV2Crypto } = require('./dist/payment/utils/wechat-v2-crypto');
    const crypto_tool = createWechatPayV2Crypto(apiKey, 'MD5');
    
    const sign2 = crypto_tool.generateSign(params);
    console.log('   工具生成签名:', sign2);
    
    // 对比结果
    console.log('\n📊 对比结果:');
    console.log('   官方算法:', sign1);
    console.log('   工具算法:', sign2);
    console.log('   是否一致:', sign1 === sign2 ? '✅ 一致' : '❌ 不一致');
    
    if (sign1 !== sign2) {
      console.log('\n🔍 差异分析:');
      
      // 检查filterParams方法
      const filteredByTool = crypto_tool.filterParams(params);
      console.log('   工具过滤参数:', Object.keys(filteredByTool));
      console.log('   官方过滤参数:', Object.keys(filteredParams1));
      
      const toolKeys = Object.keys(filteredByTool).sort();
      const officialKeys = Object.keys(filteredParams1).sort();
      
      console.log('   工具排序键名:', toolKeys);
      console.log('   官方排序键名:', officialKeys);
      
      // 检查参数值
      console.log('\n   参数值对比:');
      const allKeys = new Set([...toolKeys, ...officialKeys]);
      allKeys.forEach(key => {
        const toolValue = filteredByTool[key];
        const officialValue = filteredParams1[key];
        if (toolValue !== officialValue) {
          console.log(`   ❌ ${key}: 工具="${toolValue}" vs 官方="${officialValue}"`);
        } else {
          console.log(`   ✅ ${key}: "${toolValue}"`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ 工具测试失败:', error.message);
  }
  
  // 方法3: 测试微信支付官方示例
  console.log('\n📖 方法3: 微信支付官方示例');
  
  // 使用微信支付官方文档的示例参数
  const officialExample = {
    appid: 'wxd930ea5d5a258f4f',
    mch_id: '10000100',
    device_info: '1000',
    body: 'test',
    nonce_str: 'ibuaiVcKdpRxkhJA',
    out_trade_no: '1415659990',
    total_fee: '1'
  };
  
  const officialKey = '192006250b4c09247ec02edce69f6a2d';
  
  // 官方示例签名过程
  const officialFiltered = {};
  Object.keys(officialExample).forEach(key => {
    const value = officialExample[key];
    if (value !== null && value !== undefined && value !== '') {
      officialFiltered[key] = value.toString();
    }
  });
  
  const officialSorted = Object.keys(officialFiltered).sort();
  const officialStringA = officialSorted.map(key => `${key}=${officialFiltered[key]}`).join('&');
  const officialStringSignTemp = officialStringA + '&key=' + officialKey;
  const officialSign = crypto.createHash('md5').update(officialStringSignTemp, 'utf8').digest('hex').toUpperCase();
  
  console.log('   官方示例参数:', officialStringA);
  console.log('   官方示例签名:', officialSign);
  console.log('   预期签名:', '9A0A8659F005D6984697E2CA0A9CF3B7'); // 官方文档的结果
  console.log('   是否正确:', officialSign === '9A0A8659F005D6984697E2CA0A9CF3B7' ? '✅ 正确' : '❌ 错误');
  
  console.log('\n' + '='.repeat(60));
  console.log('🔐 签名调试完成');
}

debugSignature();