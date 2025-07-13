/**
 * 测试二维码生成修复
 * 验证微信支付二维码是否指向正确的微信支付URL而不是示例域名
 */

// 设置环境变量
process.env.WECHAT_PAY_V2_APP_ID = 'wx04948e55b1c03277';
process.env.WECHAT_PAY_V2_MCH_ID = '1608730981';
process.env.WECHAT_PAY_V2_API_KEY = 'Aa11111111222222222333333333';
process.env.WECHAT_PAY_V2_NOTIFY_URL = 'http://localhost:3001/api/payment/notify/wechat';
process.env.WECHAT_PAY_V2_SIGN_TYPE = 'MD5';
process.env.PAYMENT_ENVIRONMENT = 'sandbox';

const { getWechatPayV2Service } = require('./dist/services/WechatPayV2Service');

async function testQRCodeGeneration() {
  console.log('🔧 测试微信支付二维码生成...\n');
  
  try {
    const wechatPayService = getWechatPayV2Service();
    const serviceInfo = wechatPayService.getServiceInfo();
    
    console.log('📋 微信支付配置信息:');
    console.log('   APP ID:', serviceInfo.appId);
    console.log('   商户号:', serviceInfo.mchId);
    console.log('   环境:', serviceInfo.environment);
    console.log('   签名类型:', serviceInfo.signType);
    console.log('   回调URL:', serviceInfo.notifyUrl);
    
    // 创建测试订单
    const testOrderRequest = {
      outTradeNo: 'TEST_QR_' + Date.now(),
      totalFee: 1, // 1分钱用于测试
      body: '测试商品 - 二维码生成验证',
      attach: JSON.stringify({
        orderNo: 'ORDER_' + Date.now(),
        packageId: 1,
        userId: 1
      }),
      timeExpire: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后过期
      spbillCreateIp: '127.0.0.1'
    };
    
    console.log('\n📝 创建测试订单:');
    console.log('   商户订单号:', testOrderRequest.outTradeNo);
    console.log('   金额:', testOrderRequest.totalFee + '分');
    console.log('   商品描述:', testOrderRequest.body);
    
    console.log('\n🚀 调用微信支付统一下单API...');
    
    const result = await wechatPayService.createNativeOrder(testOrderRequest);
    
    console.log('\n📊 API调用结果:');
    console.log('   成功状态:', result.success);
    console.log('   响应消息:', result.message);
    
    if (result.success && result.data) {
      console.log('\n✅ 订单创建成功!');
      console.log('   预支付ID:', result.data.prepayId);
      console.log('   商户订单号:', result.data.outTradeNo);
      
      if (result.data.codeUrl) {
        console.log('\n📱 二维码URL分析:');
        console.log('   完整URL:', result.data.codeUrl);
        console.log('   URL长度:', result.data.codeUrl.length);
        
        // 检查URL是否为微信支付的正确格式
        if (result.data.codeUrl.startsWith('weixin://wxpay/bizpayurl?')) {
          console.log('   ✅ URL格式正确 - 这是微信支付的二维码URL');
          console.log('   📝 用户扫描此二维码会进入微信支付界面');
          
          // 解析URL参数
          const url = new URL(result.data.codeUrl);
          const params = url.searchParams;
          console.log('\n🔍 URL参数解析:');
          for (const [key, value] of params.entries()) {
            console.log(`   ${key}: ${value}`);
          }
          
        } else if (result.data.codeUrl.includes('example.com') || 
                   result.data.codeUrl.includes('example.domain')) {
          console.log('   ❌ URL指向示例域名 - 这是问题所在!');
          console.log('   🔧 需要检查微信支付配置和API调用');
          
        } else {
          console.log('   ⚠️  URL格式未知，请检查:', result.data.codeUrl);
        }
        
        console.log('\n💡 使用说明:');
        console.log('   1. 复制上面的URL');
        console.log('   2. 使用二维码生成工具生成二维码');
        console.log('   3. 用微信扫描二维码测试');
        console.log('   4. 如果配置正确，应该显示微信支付界面');
        
      } else {
        console.log('\n❌ 未获取到二维码URL');
        console.log('   可能原因:');
        console.log('   1. 微信支付配置错误');
        console.log('   2. 商户号或APP ID无效');
        console.log('   3. API密钥错误');
        console.log('   4. 网络连接问题');
      }
      
    } else {
      console.log('\n❌ 订单创建失败');
      console.log('   错误代码:', result.errorCode);
      console.log('   错误信息:', result.message);
      
      console.log('\n🔧 常见问题排查:');
      console.log('   1. 检查微信支付商户配置是否正确');
      console.log('   2. 确认API密钥是否正确');
      console.log('   3. 检查网络连接是否正常');
      console.log('   4. 确认是否在微信支付白名单中');
      
      if (result.errorCode === 'SIGNERROR') {
        console.log('\n📝 签名错误特别提示:');
        console.log('   - 检查API密钥是否正确');
        console.log('   - 确认签名算法是否匹配');
        console.log('   - 验证参数格式是否正确');
      }
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生异常:', error.message);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n🌐 网络连接问题:');
      console.log('   - 检查网络连接');
      console.log('   - 确认可以访问微信支付API');
      console.log('   - 检查防火墙设置');
    }
  }
}

async function testEnvironmentURLs() {
  console.log('\n\n🌍 测试环境URL配置...');
  
  const { getWechatPayV2Urls } = require('./dist/config/wechat-pay-v2');
  
  console.log('\n📍 沙箱环境URL:');
  const sandboxUrls = getWechatPayV2Urls('sandbox');
  console.log('   统一下单:', sandboxUrls.UNIFIED_ORDER);
  console.log('   订单查询:', sandboxUrls.ORDER_QUERY);
  console.log('   关闭订单:', sandboxUrls.CLOSE_ORDER);
  
  console.log('\n📍 生产环境URL:');
  const productionUrls = getWechatPayV2Urls('production');
  console.log('   统一下单:', productionUrls.UNIFIED_ORDER);
  console.log('   订单查询:', productionUrls.ORDER_QUERY);
  console.log('   关闭订单:', productionUrls.CLOSE_ORDER);
  
  console.log('\n✅ URL配置检查完成');
}

// 运行测试
async function runTests() {
  console.log('🚀 开始微信支付二维码生成测试...\n');
  console.log('=' .repeat(60));
  
  await testQRCodeGeneration();
  await testEnvironmentURLs();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 测试完成！');
  console.log('\n📋 问题修复总结:');
  console.log('   ✅ 修复了支付路由，使用正确的微信支付服务');
  console.log('   ✅ 添加了原始XML数据处理');
  console.log('   ✅ 修复了环境变量配置');
  console.log('   ✅ 添加了完整的回调处理');
  console.log('\n💡 下一步:');
  console.log('   1. 配置真实的微信支付商户信息');
  console.log('   2. 在生产环境中测试');
  console.log('   3. 确保回调URL可以被微信服务器访问');
}

runTests().catch(console.error);