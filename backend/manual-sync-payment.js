/**
 * 手动同步支付状态脚本
 * 用于强制检查和同步微信支付状态
 */

require('dotenv').config();
const WechatPayV2Service = require('./src/services/WechatPayV2Service');
const Database = require('./database');

const wechatPay = new WechatPayV2Service();
const db = new Database();

async function syncPaymentStatus(orderNo) {
  try {
    console.log(`🔄 开始同步订单支付状态: ${orderNo}`);

    // 1. 查询本地订单
    const order = await db.prisma.paymentOrder.findFirst({
      where: { orderNo },
      select: {
        orderNo: true,
        outTradeNo: true,
        userId: true,
        amount: true,
        points: true,
        bonusPoints: true,
        paymentStatus: true,
        packageId: true
      }
    });

    if (!order) {
      console.error('❌ 订单不存在:', orderNo);
      return false;
    }

    console.log('📋 订单信息:', {
      orderNo: order.orderNo,
      outTradeNo: order.outTradeNo,
      status: order.paymentStatus,
      amount: order.amount
    });

    // 2. 查询微信支付状态
    console.log('🔍 查询微信支付状态...');
    const wechatResult = await wechatPay.queryOrder(order.outTradeNo);
    console.log('📊 微信支付查询结果:', JSON.stringify(wechatResult, null, 2));

    // 3. 处理支付状态
    if (wechatResult.success && wechatResult.tradeState === 'SUCCESS') {
      if (order.paymentStatus === 'PAID') {
        console.log('⚠️ 订单已处理过，跳过重复处理');
        return true;
      }

      console.log('🎉 检测到支付成功，开始处理积分充值...');
      
      // 使用事务处理支付成功
      await db.prisma.$transaction(async (prisma) => {
        // 4. 更新订单状态
        await prisma.paymentOrder.update({
          where: { orderNo: order.orderNo },
          data: {
            paymentStatus: 'PAID',
            paymentTime: wechatResult.timeEnd ? new Date(wechatResult.timeEnd) : new Date(),
            transactionId: wechatResult.transactionId,
            notifyTime: new Date()
          }
        });

        // 5. 给用户充值积分
        const totalPoints = order.points + order.bonusPoints;
        
        const updatedUser = await prisma.user.update({
          where: { id: order.userId },
          data: {
            points: {
              increment: totalPoints
            }
          },
          select: { points: true, username: true }
        });

        // 6. 记录积分交易
        await prisma.pointTransaction.create({
          data: {
            userId: order.userId,
            transactionType: 'RECHARGE',
            amount: totalPoints,
            balanceAfter: updatedUser.points,
            description: `手动同步充值成功 - 订单${order.orderNo}`,
            metadata: JSON.stringify({
              orderNo: order.orderNo,
              packageId: order.packageId,
              basePoints: order.points,
              bonusPoints: order.bonusPoints,
              transactionId: wechatResult.transactionId,
              syncMethod: 'MANUAL'
            })
          }
        });

        console.log(`✅ 用户 ${updatedUser.username} (ID: ${order.userId}) 积分充值成功:`);
        console.log(`   +${totalPoints}积分，当前余额: ${updatedUser.points}`);
      });

      return true;

    } else {
      console.log(`📊 当前支付状态: ${wechatResult.tradeState || '查询失败'}`);
      
      // 更新订单状态映射
      let localStatus = 'PENDING';
      switch (wechatResult.tradeState) {
        case 'NOTPAY':
          localStatus = 'PENDING';
          break;
        case 'CLOSED':
          localStatus = 'EXPIRED';
          break;
        case 'PAYERROR':
          localStatus = 'FAILED';
          break;
        case 'REVOKED':
          localStatus = 'CANCELLED';
          break;
      }

      if (localStatus !== order.paymentStatus) {
        await db.prisma.paymentOrder.update({
          where: { orderNo: order.orderNo },
          data: { paymentStatus: localStatus }
        });
        console.log(`🔄 订单状态已更新: ${order.paymentStatus} → ${localStatus}`);
      }

      return false;
    }

  } catch (error) {
    console.error('❌ 同步支付状态失败:', error);
    return false;
  }
}

// 命令行调用
if (require.main === module) {
  const orderNo = process.argv[2];
  
  if (!orderNo) {
    console.log('使用方法: node manual-sync-payment.js <订单号>');
    console.log('示例: node manual-sync-payment.js ORDER17522949299208385');
    process.exit(1);
  }

  syncPaymentStatus(orderNo)
    .then((success) => {
      if (success) {
        console.log('\n🎊 支付状态同步成功！');
      } else {
        console.log('\n⚠️ 支付状态同步完成，但订单未支付或处理失败');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 同步脚本异常:', error);
      process.exit(1);
    });
}

module.exports = { syncPaymentStatus };