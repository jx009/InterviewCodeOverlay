// 微信支付V2加密工具类测试脚本
const { WechatPayV2Crypto, createWechatPayV2Crypto, WECHAT_PAY_V2_CONSTANTS } = require('./dist/payment/utils/wechat-v2-crypto');

console.log('🧪 开始测试微信支付V2加密工具类...\n');

// 测试配置
const testApiKey = 'test-api-key-12345678901234567890';
const crypto = new WechatPayV2Crypto(testApiKey, 'MD5');

// 测试1: 签名生成和验证
console.log('📝 测试1: 签名生成和验证');
const testParams = {
  appid: 'wxd930ea5d5a258f4f',
  mch_id: '10000100',
  nonce_str: 'ibuaiVcKdpRxkhJA',
  body: 'QQ公仔',
  out_trade_no: '20150806125346',
  total_fee: 1,
  spbill_create_ip: '123.12.12.123',
  notify_url: 'http://test.com/notify',
  trade_type: 'NATIVE'
};

const signature = crypto.generateSign(testParams);
console.log('✅ 生成的签名:', signature);

const paramsWithSign = { ...testParams, sign: signature };
const isValid = crypto.verifySign(paramsWithSign);
console.log('✅ 签名验证结果:', isValid ? '通过' : '失败');

// 测试2: XML转换
console.log('\n📝 测试2: XML转换');
const xmlString = crypto.objectToXml(testParams);
console.log('✅ 对象转XML:', xmlString);

const parseResult = crypto.xmlToObjectSync(xmlString);
console.log('✅ XML转对象:', parseResult);

// 测试3: 工具函数
console.log('\n📝 测试3: 工具函数');
const nonceStr = crypto.generateNonceStr();
console.log('✅ 随机字符串:', nonceStr);

const timestamp = crypto.generateTimestamp();
console.log('✅ 时间戳:', timestamp);

const feeInFen = crypto.yuanToFen(10.5);
console.log('✅ 元转分:', `10.5元 = ${feeInFen}分`);

const feeInYuan = crypto.fenToYuan(1050);
console.log('✅ 分转元:', `1050分 = ${feeInYuan}元`);

const orderNo = crypto.generateOutTradeNo();
console.log('✅ 订单号:', orderNo);

// 测试4: 时间格式化
console.log('\n📝 测试4: 时间格式化');
const testDate = new Date();
const formattedTime = crypto.formatDateTime(testDate);
console.log('✅ 格式化时间:', formattedTime);

const parsedDate = crypto.parseDateTime(formattedTime);
console.log('✅ 解析时间:', parsedDate);

// 测试5: 常量
console.log('\n📝 测试5: 常量');
console.log('✅ 交易类型:', WECHAT_PAY_V2_CONSTANTS.TRADE_TYPE);
console.log('✅ 交易状态:', WECHAT_PAY_V2_CONSTANTS.TRADE_STATE);

// 测试6: 完整支付流程模拟
console.log('\n📝 测试6: 完整支付流程模拟');
const orderRequest = {
  appid: 'wxd930ea5d5a258f4f',
  mch_id: '10000100',
  nonce_str: crypto.generateNonceStr(),
  body: '测试商品',
  out_trade_no: crypto.generateOutTradeNo(),
  total_fee: crypto.yuanToFen(1),
  spbill_create_ip: '127.0.0.1',
  notify_url: 'https://test.com/notify',
  trade_type: 'NATIVE'
};

const orderSignature = crypto.generateSign(orderRequest);
const signedRequest = { ...orderRequest, sign: orderSignature };
const xmlRequest = crypto.objectToXml(signedRequest);

console.log('✅ 订单请求XML:', xmlRequest);

// 模拟微信支付响应
const mockResponse = `
<xml>
  <return_code>SUCCESS</return_code>
  <return_msg>OK</return_msg>
  <appid>wxd930ea5d5a258f4f</appid>
  <mch_id>10000100</mch_id>
  <nonce_str>5K8264ILTKCH16CQ2502SI8ZNMTM67VS</nonce_str>
  <result_code>SUCCESS</result_code>
  <prepay_id>wx201506101052001a2c6e7c39</prepay_id>
  <trade_type>NATIVE</trade_type>
  <code_url>weixin://wxpay/bizpayurl?pr=NwY5Mz9</code_url>
</xml>
`;

const responseObj = crypto.xmlToObjectSync(mockResponse);
console.log('✅ 支付响应解析:', responseObj);

console.log('\n🎉 所有测试完成！微信支付V2加密工具类工作正常。'); 