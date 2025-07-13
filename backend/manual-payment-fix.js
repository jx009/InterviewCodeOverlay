const mysql = require('mysql2/promise');
const WechatPayV2Service = require('./src/services/WechatPayV2Service');

async function fixPaymentOrder() {
  const orderNo = 'RECHARGE_ORDER17522530522711786';
  
  try {
    console.log('🔧 手动修复支付订单');
    console.log(`📋 订单号: ${orderNo}`);
    
    // 1. 查询微信支付状态
    console.log('\n🔍 Step 1: 查询微信支付真实状态...');
    const wechatPay = new WechatPayV2Service();
    const paymentResult = await wechatPay.queryOrder(orderNo);
    
    if (!paymentResult.success || paymentResult.tradeState !== 'SUCCESS') {
      console.log('❌ 微信支付状态不是成功，无需修复');
      console.log('📊 当前状态:', paymentResult.tradeState);
      return;
    }
    
    console.log('✅ 微信支付状态: SUCCESS');
    console.log('🆔 微信订单号:', paymentResult.transactionId);
    console.log('💰 支付金额:', paymentResult.totalFee, '分');
    console.log('⏰ 支付时间:', paymentResult.timeEnd);
    
    // 2. 连接数据库
    console.log('\n🔍 Step 2: 连接数据库...');
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'username',
      password: 'password',
      database: 'interview_coder'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 3. 查找订单
    console.log('\n🔍 Step 3: 查找订单记录...');
    const [orderRows] = await connection.execute(
      'SELECT * FROM payment_orders WHERE order_no = ? OR out_trade_no = ?',
      [orderNo, orderNo]
    );
    
    if (orderRows.length === 0) {
      console.log('❌ 数据库中未找到订单记录');
      await connection.end();
      return;
    }
    
    const order = orderRows[0];
    console.log('✅ 找到订单记录');
    console.log('📊 当前状态:', order.payment_status);
    console.log('👤 用户ID:', order.user_id);
    console.log('💰 订单金额:', order.amount);
    
    if (order.payment_status === 'PAID') {
      console.log('✅ 订单已经是已支付状态，检查积分是否发放...');
    }
    
    // 4. 更新订单状态
    console.log('\n🔍 Step 4: 更新订单状态...');
    await connection.execute(
      `UPDATE payment_orders SET 
        payment_status = 'PAID',
        transaction_id = ?,
        payment_time = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [paymentResult.transactionId, paymentResult.timeEnd, order.id]
    );
    
    console.log('✅ 订单状态更新完成');
    
    // 5. 发放积分
    console.log('\n🔍 Step 5: 发放积分...');
    
    // 查询用户当前积分
    const [userRows] = await connection.execute(
      'SELECT points FROM users WHERE id = ?',
      [order.user_id]
    );
    
    if (userRows.length === 0) {
      console.log('❌ 用户不存在');
      await connection.end();
      return;
    }
    
    const currentPoints = userRows[0].points || 0;
    console.log('📊 用户当前积分:', currentPoints);
    
    // 计算要发放的积分 (测试套餐1000积分)
    const pointsToAdd = 1000; // 0.01元测试套餐给1000积分
    const newPoints = currentPoints + pointsToAdd;
    
    console.log('💰 要发放的积分:', pointsToAdd);
    console.log('🎯 发放后总积分:', newPoints);
    
    // 更新用户积分
    await connection.execute(
      'UPDATE users SET points = ? WHERE id = ?',
      [newPoints, order.user_id]
    );
    
    console.log('✅ 用户积分更新完成');
    
    // 6. 记录积分交易 (如果表存在)
    console.log('\n🔍 Step 6: 记录积分交易...');
    try {
      await connection.execute(
        `INSERT INTO point_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
         VALUES (?, 'RECHARGE', ?, ?, ?, NOW())`,
        [order.user_id, pointsToAdd, newPoints, `充值订单: ${orderNo}`]
      );
      console.log('✅ 积分交易记录完成');
    } catch (error) {
      console.log('⚠️ 积分交易记录失败 (可能表不存在):', error.message);
    }
    
    // 7. 最终验证
    console.log('\n🔍 Step 7: 最终验证...');
    const [finalUserRows] = await connection.execute(
      'SELECT username, points FROM users WHERE id = ?',
      [order.user_id]
    );
    
    const [finalOrderRows] = await connection.execute(
      'SELECT payment_status, transaction_id FROM payment_orders WHERE id = ?',
      [order.id]
    );
    
    console.log('✅ 修复完成！');
    console.log('📊 最终状态:');
    console.log('  - 用户:', finalUserRows[0].username);
    console.log('  - 积分:', finalUserRows[0].points);
    console.log('  - 订单状态:', finalOrderRows[0].payment_status);
    console.log('  - 微信订单号:', finalOrderRows[0].transaction_id);
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

fixPaymentOrder().catch(console.error);