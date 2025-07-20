// 微信支付V2测试脚本
const { WechatPayV2Service, getWechatPayV2Service } = require('./dist/services/WechatPayV2Service');
const { printConfigDetection, detectPaymentConfig } = require('./dist/payment/config/payment-detector');

async function testWechatPayV2() {
  console.log('🧪 开始测试微信支付V2功能...\n');

  try {
    // 检查配置
    printConfigDetection();
    
    const detection = detectPaymentConfig();
    if (!detection.isV2) {
      console.error('❌ 微信支付V2配置不完整，无法进行测试');
      console.log('请检查以下环境变量：');
      console.log('- WECHAT_PAY_V2_APP_ID');
      console.log('- WECHAT_PAY_V2_MCH_ID');
      console.log('- WECHAT_PAY_V2_API_KEY');
      console.log('- WECHAT_PAY_V2_NOTIFY_URL');
      console.log('- WECHAT_PAY_V2_SIGN_TYPE');
      return;
    }

    // 创建服务实例
    const wechatPayV2Service = getWechatPayV2Service();
    const serviceInfo = wechatPayV2Service.getServiceInfo();
    
    console.log('✅ 微信支付V2服务初始化成功');
    console.log('服务信息:', serviceInfo);

    // 测试创建订单
    console.log('\n🚀 测试创建Native支付订单...');
    
    const testOrderRequest = {
      outTradeNo: `TEST_${Date.now()}`,
      totalFee: 1, // 1元
      body: '测试商品 - 1积分',
      attach: JSON.stringify({
        userId: 1,
        packageId: 1,
        orderType: 'test'
      }),
      timeExpire: new Date(Date.now() + 15 * 60 * 1000), // 15分钟后过期
      spbillCreateIp: '127.0.0.1'
    };

    const orderResult = await wechatPayV2Service.createNativeOrder(testOrderRequest);
    
    if (orderResult.success) {
      console.log('✅ 创建订单成功!');
      console.log('订单信息:', {
        outTradeNo: orderResult.data?.outTradeNo,
        prepayId: orderResult.data?.prepayId,
        codeUrl: orderResult.data?.codeUrl ? '已生成' : '未生成'
      });
      
      // 如果有二维码URL，显示支付提示
      if (orderResult.data?.codeUrl) {
        console.log('\n📱 支付二维码已生成，用户可以扫码支付');
        console.log('二维码URL:', orderResult.data.codeUrl);
      }
      
      // 测试查询订单
      console.log('\n🔍 测试查询订单状态...');
      const queryResult = await wechatPayV2Service.queryOrder(testOrderRequest.outTradeNo);
      
      if (queryResult.success) {
        console.log('✅ 查询订单成功!');
        console.log('订单状态:', {
          tradeState: queryResult.data?.tradeState,
          tradeStateDesc: queryResult.data?.tradeStateDesc,
          outTradeNo: queryResult.data?.outTradeNo
        });
      } else {
        console.log('⚠️ 查询订单失败:', queryResult.message);
      }
      
      // 测试关闭订单
      console.log('\n🔒 测试关闭订单...');
      const closeResult = await wechatPayV2Service.closeOrder(testOrderRequest.outTradeNo);
      
      if (closeResult.success) {
        console.log('✅ 关闭订单成功!');
      } else {
        console.log('⚠️ 关闭订单失败:', closeResult.message);
      }
      
    } else {
      console.error('❌ 创建订单失败:', orderResult.message);
      console.log('错误代码:', orderResult.errorCode);
      
      // 根据错误代码提供解决建议
      if (orderResult.errorCode === 'SIGNERROR') {
        console.log('\n💡 解决建议:');
        console.log('1. 检查 WECHAT_PAY_V2_API_KEY 是否正确');
        console.log('2. 确认 WECHAT_PAY_V2_SIGN_TYPE 设置为 MD5');
        console.log('3. 确认 WECHAT_PAY_V2_APP_ID 和 WECHAT_PAY_V2_MCH_ID 匹配');
      } else if (orderResult.errorCode === 'APPID_MCHID_NOT_MATCH') {
        console.log('\n💡 解决建议:');
        console.log('1. 检查 WECHAT_PAY_V2_APP_ID 和 WECHAT_PAY_V2_MCH_ID 是否匹配');
        console.log('2. 确认在微信商户平台中已绑定该应用');
      } else if (orderResult.errorCode === 'NOAUTH') {
        console.log('\n💡 解决建议:');
        console.log('1. 确认商户号已开通Native支付权限');
        console.log('2. 联系微信支付客服确认权限状态');
      }
    }

    console.log('\n🎉 微信支付V2测试完成!');
    
  } catch (error) {
    console.error('❌ 测试过程中发生异常:', error);
    console.log('\n💡 排查建议:');
    console.log('1. 检查网络连接');
    console.log('2. 确认环境变量配置正确');
    console.log('3. 检查微信支付服务是否正常');
  }
}

// 运行测试
if (require.main === module) {
  testWechatPayV2().catch(console.error);
}

module.exports = { testWechatPayV2 }; 