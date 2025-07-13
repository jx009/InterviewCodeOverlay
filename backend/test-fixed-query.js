const WechatPayV2Service = require('./src/services/WechatPayV2Service');

async function testQuery() {
  console.log('🎯 测试修复后的微信支付查询逻辑\n');
  
  const wechatPay = new WechatPayV2Service();
  
  try {
    console.log('🔍 开始查询订单状态...');
    const result = await wechatPay.queryOrder('RECHARGE_ORDER17522530522711786');
    
    console.log('\n📊 查询结果:');
    console.log(JSON.stringify(result, null, 2));
    
    // 模拟订单状态处理逻辑
    if (result.success && result.tradeState === 'SUCCESS') {
      console.log('\n✅ 支付成功检测逻辑:');
      console.log('🎉 订单支付成功！');
      console.log('💰 支付金额:', result.totalFee, '分');
      console.log('🆔 微信订单号:', result.transactionId);
      console.log('⏰ 支付时间:', result.timeEnd);
      console.log('📝 下一步: 更新订单状态并发放积分');
    } else {
      console.log('\n❌ 支付状态检测:');
      console.log('📊 当前状态:', result.tradeState || 'UNKNOWN');
      console.log('💡 说明: 订单尚未支付或状态异常');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

testQuery().catch(console.error);