/**
 * 严格按照微信支付V2官方文档格式的API测试
 * 不使用任何自定义封装，直接调用原生API
 */

require('dotenv').config();

async function strictApiTest() {
  console.log('📜 严格按照官方文档的API测试\n');
  console.log('=' .repeat(60));
  
  const crypto = require('crypto');
  const axios = require('axios');
  
  // 直接使用环境变量，不经过任何处理
  const appId = process.env.WECHAT_PAY_APP_ID;
  const mchId = process.env.WECHAT_PAY_MCH_ID;
  const apiKey = process.env.WECHAT_PAY_API_KEY;
  const notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL;
  
  console.log('📋 直接使用的环境变量:');
  console.log('   appId:', appId);
  console.log('   mchId:', mchId);
  console.log('   apiKey长度:', apiKey.length);
  console.log('   notifyUrl:', notifyUrl);
  
  // 完全按照官方文档的参数顺序和格式
  const unifiedOrderParams = {
    appid: appId,
    mch_id: mchId,
    device_info: 'WEB',  // 添加设备信息
    nonce_str: crypto.randomBytes(16).toString('hex').substring(0, 32),
    sign_type: 'MD5',
    body: 'test-商品描述',
    detail: undefined, // 商品详情，可选
    attach: undefined, // 附加数据，可选
    out_trade_no: 'STRICT_' + Date.now(),
    fee_type: 'CNY', // 货币类型
    total_fee: 1, // 总金额，单位为分
    spbill_create_ip: '223.5.5.5', // 使用真实的公网IP
    time_start: undefined, // 交易起始时间，可选
    time_expire: undefined, // 交易结束时间，可选
    goods_tag: undefined, // 商品标记，可选
    notify_url: notifyUrl,
    trade_type: 'NATIVE',
    product_id: undefined, // 商品ID，trade_type=NATIVE时，此参数必传，此参数为二维码中包含的商品ID，商户自行定义
    limit_pay: undefined, // 指定支付方式，可选
    openid: undefined, // 用户openid，trade_type=JSAPI时（即公众号支付），此参数必传
    scene_info: undefined // 场景信息，可选
  };
  
  // 移除未定义的参数
  const cleanParams = {};
  Object.keys(unifiedOrderParams).forEach(key => {
    if (unifiedOrderParams[key] !== undefined) {
      cleanParams[key] = unifiedOrderParams[key];
    }
  });
  
  console.log('\n📝 清理后的请求参数:');
  console.log(JSON.stringify(cleanParams, null, 2));
  
  // 严格按照官方文档的签名算法
  console.log('\n🔐 官方签名算法:');
  
  // 第一步：按照参数名ASCII码从小到大排序
  const sortedKeys = Object.keys(cleanParams).sort();
  console.log('   排序后的键:', sortedKeys);
  
  // 第二步：使用URL键值对的格式拼接成字符串stringA
  const stringA = sortedKeys.map(key => `${key}=${cleanParams[key]}`).join('&');
  console.log('   stringA:', stringA);
  
  // 第三步：拼接API密钥
  const stringSignTemp = stringA + '&key=' + apiKey;
  console.log('   stringSignTemp:', stringSignTemp.replace(apiKey, '***'));
  
  // 第四步：MD5签名
  const sign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
  console.log('   最终签名:', sign);
  
  // 添加签名到参数
  const finalParams = { ...cleanParams, sign: sign };
  
  // 构建XML请求体，严格按照官方格式
  const buildXml = (params) => {
    let xml = '<xml>';
    Object.keys(params).forEach(key => {
      xml += `<${key}><![CDATA[${params[key]}]]></${key}>`;
    });
    xml += '</xml>';
    return xml;
  };
  
  const xmlData = buildXml(finalParams);
  
  console.log('\n📤 XML请求体:');
  console.log(xmlData);
  
  try {
    console.log('\n🚀 发送统一下单请求...');
    
    const response = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xmlData, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'WeChat Pay Official Test'
      },
      timeout: 30000
    });
    
    console.log('\n📥 API响应:');
    console.log('   状态码:', response.status);
    console.log('   响应体:', response.data);
    
    // 解析响应
    const xml2js = require('xml2js');
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    
    parser.parseString(response.data, (err, result) => {
      if (err) {
        console.error('❌ XML解析失败:', err);
        return;
      }
      
      const responseData = result.xml;
      console.log('\n📊 解析后的响应:');
      console.log(JSON.stringify(responseData, null, 2));
      
      if (responseData.return_code === 'SUCCESS') {
        if (responseData.result_code === 'SUCCESS') {
          console.log('\n✅ 统一下单成功!');
          console.log('   prepay_id:', responseData.prepay_id);
          console.log('   code_url:', responseData.code_url);
          
          // 这里的code_url就是正确的微信支付二维码URL
          console.log('\n🎯 这是正确的微信支付URL格式:');
          console.log('   ', responseData.code_url);
          
        } else {
          console.log('\n❌ 业务失败:');
          console.log('   错误代码:', responseData.err_code);
          console.log('   错误描述:', responseData.err_code_des);
        }
      } else {
        console.log('\n❌ 通信失败:');
        console.log('   返回信息:', responseData.return_msg);
      }
    });
    
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📜 严格API测试完成');
}

strictApiTest().catch(console.error);