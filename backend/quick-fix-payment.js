/**
 * 快速修复支付问题脚本
 * 用于立即处理已支付但未充值的订单
 */

require('dotenv').config();
const WechatPayV2Service = require('./src/services/WechatPayV2Service');
const Database = require('./database');

const wechatPay = new WechatPayV2Service();
const db = new Database();

async function quickFixPayment() {
  try {
    console.log('🚀 开始快速修复支付问题...');

    // 查找最近的PENDING状态订单
    const pendingOrders = await db.prisma.paymentOrder.findMany({
      where: {
        paymentStatus: 'PENDING',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
        }
      },
      select: {
        orderNo: true,
        outTradeNo: true,
        userId: true,
        amount: true,
        points: true,
        bonusPoints: true,
        paymentStatus: true,
        packageId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`📋 找到 ${pendingOrders.length} 个待处理订单`);

    for (const order of pendingOrders) {
      console.log(`\n🔍 检查订单: ${order.orderNo} (${order.outTradeNo})`);
      
      try {
        // 查询微信支付状态
        const wechatResult = await wechatPay.queryOrder(order.outTradeNo);
        console.log(`   微信状态: ${wechatResult.tradeState || '查询失败'}`);
        
        if (wechatResult.success && wechatResult.tradeState === 'SUCCESS') {
          console.log('   🎉 发现已支付订单，开始处理...');
          
          // 使用事务处理
          await db.prisma.$transaction(async (prisma) => {
            // 1. 更新订单状态
            await prisma.paymentOrder.update({
              where: { orderNo: order.orderNo },
              data: {
                paymentStatus: 'PAID',
                paymentTime: wechatResult.timeEnd ? new Date(wechatResult.timeEnd) : new Date(),
                transactionId: wechatResult.transactionId,
                notifyTime: new Date()
              }
            });

            // 2. 充值积分
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

            // 3. 记录交易
            await prisma.pointTransaction.create({
              data: {
                userId: order.userId,
                transactionType: 'RECHARGE',
                amount: totalPoints,
                balanceAfter: updatedUser.points,
                description: `快速修复充值 - 订单${order.orderNo}`,
                metadata: JSON.stringify({
                  orderNo: order.orderNo,
                  outTradeNo: order.outTradeNo,
                  transactionId: wechatResult.transactionId,
                  packageId: order.packageId,
                  basePoints: order.points,
                  bonusPoints: order.bonusPoints,
                  fixMethod: 'QUICK_FIX'
                })
              }
            });

            console.log(`   ✅ 用户 ${updatedUser.username} 充值成功: +${totalPoints}积分，余额: ${updatedUser.points}`);
          });
          
        } else {
          console.log(`   ⏳ 订单未支付: ${wechatResult.tradeState || '未知状态'}`);
        }
        
      } catch (error) {
        console.error(`   ❌ 处理订单 ${order.orderNo} 失败:`, error.message);
      }
    }
    
    console.log('\n🏁 快速修复完成！');
    
  } catch (error) {
    console.error('❌ 快速修复失败:', error);
  } finally {
    await db.close();
  }
}

// 运行修复
if (require.main === module) {
  quickFixPayment()
    .then(() => {
      console.log('\n✅ 快速修复脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 快速修复脚本异常:', error);
      process.exit(1);
    });
}

module.exports = { quickFixPayment };