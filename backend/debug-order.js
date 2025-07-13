/**
 * 调试订单数据脚本
 */

require('dotenv').config();
const Database = require('./database');

async function debugOrder() {
  const db = new Database();
  
  try {
    console.log('🔍 查询最新的支付订单...');
    
    const orders = await db.prisma.paymentOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
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
      }
    });
    
    console.log('📋 最新订单列表:');
    orders.forEach((order, index) => {
      console.log(`[${index + 1}] 订单号: ${order.orderNo}`);
      console.log(`    商户订单号: ${order.outTradeNo}`);
      console.log(`    用户ID: ${order.userId} (类型: ${typeof order.userId})`);
      console.log(`    金额: ${order.amount}`);
      console.log(`    积分: ${order.points}`);
      console.log(`    状态: ${order.paymentStatus}`);
      console.log(`    创建时间: ${order.createdAt}`);
      console.log('');
    });
    
    // 检查具体的问题订单
    const problemOrder = orders.find(o => o.outTradeNo === 'RECHARGE_ORDER17522949299208385');
    if (problemOrder) {
      console.log('🔍 问题订单详情:');
      console.log(JSON.stringify(problemOrder, null, 2));
      
      // 检查用户是否存在
      if (problemOrder.userId) {
        const user = await db.prisma.user.findUnique({
          where: { id: problemOrder.userId },
          select: { id: true, username: true, email: true, points: true }
        });
        
        if (user) {
          console.log('✅ 对应用户存在:');
          console.log(JSON.stringify(user, null, 2));
        } else {
          console.log('❌ 用户不存在！');
        }
      } else {
        console.log('❌ 订单中userId为空！');
      }
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
  } finally {
    await db.close();
  }
}

debugOrder();