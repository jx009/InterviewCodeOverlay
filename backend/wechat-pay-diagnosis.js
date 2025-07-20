/**
 * 微信支付配置诊断工具
 * 帮助定位签名错误的具体原因
 */

require('dotenv').config();

async function diagnoseWechatPay() {
  console.log('🔍 微信支付配置诊断工具\n');
  console.log('=' .repeat(60));
  
  try {
    // 获取配置
    const appId = process.env.WECHAT_PAY_APP_ID;
    const mchId = process.env.WECHAT_PAY_MCH_ID;
    const apiKey = process.env.WECHAT_PAY_API_KEY;
    const notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL;
    
    console.log('📋 当前配置信息:');
    console.log('   APP ID:', appId);
    console.log('   商户号:', mchId);
    console.log('   API密钥:', apiKey ? `${apiKey.substring(0, 8)}...` : '未设置');
    console.log('   API密钥长度:', apiKey ? apiKey.length : 0);
    console.log('   回调URL:', notifyUrl);
    
    // 检查配置完整性
    console.log('\n✅ 配置完整性检查:');
    let configValid = true;
    
    if (!appId || appId.length !== 18 || !appId.startsWith('wx')) {
      console.log('   ❌ APP ID格式错误 (应为wx开头的18位字符)');
      configValid = false;
    } else {
      console.log('   ✅ APP ID格式正确');
    }
    
    if (!mchId || !/^\d{10}$/.test(mchId)) {
      console.log('   ❌ 商户号格式错误 (应为10位数字)');
      configValid = false;
    } else {
      console.log('   ✅ 商户号格式正确');
    }
    
    if (!apiKey || apiKey.length !== 32) {
      console.log('   ❌ API密钥长度错误 (应为32位)');
      configValid = false;
    } else {
      console.log('   ✅ API密钥长度正确');
    }
    
    if (!notifyUrl || !notifyUrl.startsWith('http')) {
      console.log('   ❌ 回调URL格式错误');
      configValid = false;
    } else {
      console.log('   ✅ 回调URL格式正确');
    }
    
    if (!configValid) {
      console.log('\n❌ 配置验证失败，请检查环境变量');
      return;
    }
    
    // 测试签名生成
    console.log('\n🔐 签名生成测试:');
    const crypto = require('crypto');
    
    // 使用微信支付官方示例参数测试签名
    const testParams = {
      appid: appId,
      mch_id: mchId,
      nonce_str: 'ibuaiVcKdpRxkhJA',
      body: '测试商品',
      out_trade_no: 'TEST123456789',
      total_fee: 1,
      spbill_create_ip: '127.0.0.1',
      notify_url: notifyUrl,
      trade_type: 'NATIVE'
    };
    
    // 生成签名字符串
    const sortedKeys = Object.keys(testParams).sort();
    const stringA = sortedKeys.map(key => `${key}=${testParams[key]}`).join('&');
    const stringSignTemp = stringA + '&key=' + apiKey;
    const sign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
    
    console.log('   签名原始字符串:', stringA);
    console.log('   签名字符串(含key):', stringSignTemp.replace(apiKey, '***'));
    console.log('   生成的签名:', sign);
    
    // 尝试调用微信支付API进行实际验证
    console.log('\n🚀 API连通性测试:');
    
    const testOrderParams = {
      appid: appId,
      mch_id: mchId,
      nonce_str: 'TEST' + Date.now(),
      body: '诊断测试订单',
      out_trade_no: 'DIAG_' + Date.now(),
      total_fee: 1,
      spbill_create_ip: '127.0.0.1',
      notify_url: notifyUrl,
      trade_type: 'NATIVE'
    };
    
    const diagSortedKeys = Object.keys(testOrderParams).sort();
    const diagStringA = diagSortedKeys.map(key => `${key}=${testOrderParams[key]}`).join('&');
    const diagStringSignTemp = diagStringA + '&key=' + apiKey;
    const diagSign = crypto.createHash('md5').update(diagStringSignTemp, 'utf8').digest('hex').toUpperCase();
    
    const finalParams = { ...testOrderParams, sign: diagSign };
    
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
    console.log('   发送XML数据长度:', xmlData.length, '字节');
    
    const axios = require('axios');
    const response = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xmlData, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'WeChat Pay Diagnosis Tool'
      },
      timeout: 30000
    });
    
    console.log('   API响应状态:', response.status);
    console.log('   API响应数据:', response.data);
    
    // 解析响应
    if (response.data.includes('签名错误')) {
      console.log('\n❌ 诊断结果: 签名错误');
      console.log('\n🔧 可能的解决方案:');
      console.log('   1. 检查微信支付商户平台中的API密钥设置');
      console.log('   2. 确认API密钥是否最近有更新');
      console.log('   3. 验证商户号和APP ID是否正确绑定');
      console.log('   4. 检查商户账户状态是否正常');
      console.log('\n📝 操作步骤:');
      console.log('   1. 登录微信支付商户平台: https://pay.weixin.qq.com');
      console.log('   2. 进入【账户中心】→【API安全】');
      console.log('   3. 重新设置API密钥(32位随机字符串)');
      console.log('   4. 更新环境变量中的WECHAT_PAY_API_KEY');
      console.log('   5. 重启服务重新测试');
    } else if (response.data.includes('APPID_NOT_EXIST')) {
      console.log('\n❌ 诊断结果: APP ID不存在或未绑定');
      console.log('\n🔧 解决方案:');
      console.log('   1. 确认APP ID是否正确');
      console.log('   2. 在微信支付商户平台绑定APP ID');
    } else if (response.data.includes('MCHID_NOT_EXIST')) {
      console.log('\n❌ 诊断结果: 商户号不存在');
      console.log('\n🔧 解决方案:');
      console.log('   1. 确认商户号是否正确');
      console.log('   2. 检查商户状态是否正常');
    } else if (response.data.includes('SUCCESS')) {
      console.log('\n✅ 诊断结果: 配置正确，API调用成功!');
      console.log('   您的微信支付配置没有问题');
    } else {
      console.log('\n⚠️ 诊断结果: 未知响应');
      console.log('   需要进一步分析响应内容');
    }
    
  } catch (error) {
    console.error('\n❌ 诊断过程异常:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n🔧 网络问题解决方案:');
      console.log('   1. 检查网络连接');
      console.log('   2. 确认可以访问微信支付API服务器');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n🔧 超时问题解决方案:');
      console.log('   1. 检查网络稳定性');
      console.log('   2. 稍后重试');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 诊断完成');
  console.log('\n💡 提示: 如果问题仍然存在，建议联系微信支付技术支持');
}

// 运行诊断
diagnoseWechatPay().catch(console.error);