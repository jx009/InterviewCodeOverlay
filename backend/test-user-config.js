/**
 * 测试用户实际配置的微信支付功能
 * 使用用户提供的真实配置进行测试
 */

// 手动设置环境变量以匹配用户配置
process.env.WECHAT_PAY_APP_ID = 'wx04948e55b1c03277';
process.env.WECHAT_PAY_MCH_ID = '1608730981';
process.env.WECHAT_PAY_API_KEY = 'Aa11111111122222222223333333333';
process.env.WECHAT_PAY_NOTIFY_URL = 'http://localhost:3001/api/payment/notify/wechat';
process.env.WECHAT_PAY_SIGN_TYPE = 'MD5';
process.env.PAYMENT_ENVIRONMENT = 'production';

const { getWechatPayV2Service } = require('./dist/services/WechatPayV2Service');
const { createWechatPayV2Crypto } = require('./dist/payment/utils/wechat-v2-crypto');

async function testUserConfiguration() {
  console.log('🔧 测试用户实际配置...\n');
  
  try {
    // 1. 测试配置加载
    console.log('📋 配置验证:');
    const wechatPayService = getWechatPayV2Service();
    const serviceInfo = wechatPayService.getServiceInfo();
    
    console.log('   APP ID:', serviceInfo.appId);
    console.log('   商户号:', serviceInfo.mchId);
    console.log('   API密钥长度:', serviceInfo.environment);
    console.log('   签名类型:', serviceInfo.signType);
    console.log('   回调URL:', serviceInfo.notifyUrl);
    console.log('   环境:', serviceInfo.environment);
    
    // 2. 验证API密钥长度
    const apiKey = process.env.WECHAT_PAY_API_KEY;
    console.log('\n🔐 API密钥验证:');
    console.log('   长度:', apiKey.length, '字符');
    console.log('   格式:', apiKey.length === 32 ? '✅ 标准长度' : '⚠️  长度异常');
    
    // 3. 测试签名生成
    console.log('\n🔏 签名测试:');
    const crypto = createWechatPayV2Crypto(apiKey, 'MD5');
    
    const testParams = {
      appid: serviceInfo.appId,
      mch_id: serviceInfo.mchId,
      nonce_str: crypto.generateNonceStr(16),
      body: '测试商品',
      out_trade_no: 'TEST' + Date.now(),
      total_fee: 1, // 1分钱
      spbill_create_ip: '127.0.0.1',
      notify_url: serviceInfo.notifyUrl,
      trade_type: 'NATIVE'
    };
    
    const signature = crypto.generateSign(testParams);
    console.log('   测试参数签名:', signature);
    
    // 4. 验证签名
    const paramsWithSign = { ...testParams, sign: signature };
    const isValid = crypto.verifySign(paramsWithSign);
    console.log('   签名验证:', isValid ? '✅ 通过' : '❌ 失败');
    
    // 5. 测试XML生成
    console.log('\n📄 XML数据测试:');
    const xmlData = crypto.objectToXml(paramsWithSign);
    console.log('   XML长度:', xmlData.length, '字符');
    console.log('   XML预览:', xmlData.substring(0, 150) + '...');
    
    // 6. 测试实际API调用
    console.log('\n🌐 API调用测试:');
    console.log('   目标URL: https://api.mch.weixin.qq.com/pay/unifiedorder');
    console.log('   请求方法: POST');
    console.log('   Content-Type: application/xml');
    
    try {
      const orderRequest = {
        outTradeNo: testParams.out_trade_no,
        totalFee: testParams.total_fee,
        body: testParams.body,
        attach: JSON.stringify({
          orderNo: 'ORDER_' + Date.now(),
          packageId: 1,
          userId: 1
        }),
        timeExpire: new Date(Date.now() + 30 * 60 * 1000),
        spbillCreateIp: '127.0.0.1'
      };
      
      console.log('   🚀 发起真实API调用...');
      const result = await wechatPayService.createNativeOrder(orderRequest);
      
      console.log('\n📊 API响应结果:');
      console.log('   成功:', result.success);
      console.log('   消息:', result.message);
      
      if (result.success && result.data && result.data.codeUrl) {
        console.log('\n🎉 成功生成支付二维码!');
        console.log('   预支付ID:', result.data.prepayId);
        console.log('   二维码URL:', result.data.codeUrl);
        
        // 分析二维码URL
        if (result.data.codeUrl.startsWith('weixin://wxpay/')) {
          console.log('   ✅ URL格式正确 - 微信支付协议');
          console.log('   📱 用户扫码后将显示微信支付界面');
        } else {
          console.log('   ⚠️  URL格式异常:', result.data.codeUrl);
        }
        
      } else {
        console.log('\n❌ API调用失败');
        console.log('   错误代码:', result.errorCode);
        console.log('   错误详情:', result.message);
        
        // 提供解决方案
        console.log('\n🔧 可能的解决方案:');
        if (result.errorCode === 'SIGNERROR') {
          console.log('   - 检查API密钥是否正确');
          console.log('   - 确认签名算法设置');
        } else if (result.errorCode === 'APPID_NOT_EXIST') {
          console.log('   - 检查APP ID是否正确');
          console.log('   - 确认APP ID与商户号匹配');
        } else if (result.errorCode === 'MCHID_NOT_EXIST') {
          console.log('   - 检查商户号是否正确');
          console.log('   - 确认商户状态是否正常');
        } else {
          console.log('   - 检查所有配置参数');
          console.log('   - 确认网络连接正常');
          console.log('   - 联系微信支付技术支持');
        }
      }
      
    } catch (error) {
      console.log('\n❌ API调用异常:', error.message);
      
      if (error.code === 'ENOTFOUND') {
        console.log('   🌐 网络连接问题，无法访问微信支付API');
      } else {
        console.log('   📋 详细错误:', error.message);
      }
    }
    
  } catch (error) {
    console.error('\n❌ 配置测试失败:', error.message);
  }
}

async function provideTroubleshootingGuide() {
  console.log('\n\n📚 故障排除指南:');
  console.log('=' .repeat(50));
  
  console.log('\n1. 🔑 配置验证清单:');
  console.log('   ✓ WECHAT_PAY_APP_ID: 微信公众号/小程序的AppID');
  console.log('   ✓ WECHAT_PAY_MCH_ID: 微信支付商户号');
  console.log('   ✓ WECHAT_PAY_API_KEY: 32位API密钥');
  console.log('   ✓ WECHAT_PAY_NOTIFY_URL: 回调地址');
  
  console.log('\n2. 🌐 网络要求:');
  console.log('   ✓ 确保服务器可以访问 api.mch.weixin.qq.com');
  console.log('   ✓ 回调URL必须是公网可访问的HTTPS地址');
  console.log('   ✓ localhost仅适用于开发测试');
  
  console.log('\n3. 🔒 微信支付商户后台设置:');
  console.log('   ✓ 商户状态必须为"已认证"');
  console.log('   ✓ API权限已开通');
  console.log('   ✓ 支付目录已配置');
  console.log('   ✓ 回调URL已加入白名单');
  
  console.log('\n4. 💰 测试建议:');
  console.log('   ✓ 使用1分钱进行测试');
  console.log('   ✓ 确认商户余额充足');
  console.log('   ✓ 检查商户费率设置');
  
  console.log('\n5. 🚀 生产环境部署:');
  console.log('   ✓ 使用HTTPS协议');
  console.log('   ✓ 配置SSL证书');
  console.log('   ✓ 设置正确的域名');
  console.log('   ✓ 更新回调URL为生产地址');
}

// 运行测试
async function runUserConfigTest() {
  console.log('🚀 开始测试用户微信支付配置...\n');
  console.log('=' .repeat(60));
  
  await testUserConfiguration();
  await provideTroubleshootingGuide();
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ 测试完成！');
}

runUserConfigTest().catch(console.error);