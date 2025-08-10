/**
 * 测试订单修复脚本
 */

require('dotenv').config();
const Database = require('./database');

async function testOrderFix() {
  const db = new Database();
  
  try {
    console.log('🧪 测试订单查询修复...');
    
    // 模拟原来的查询（没有userId）
    const orderNo = 'ORDER17522949299208385'; // 请替换为实际的订单号
    const userId = 1; // 测试用户ID
    
    console.log(`查询订单: ${orderNo}, 用户: ${userId}`);
    
    const order = await db.prisma.paymentOrder.findFirst({
      where: {
        orderNo,
        userId
      },
      select: {
        orderNo: true,
        outTradeNo: true,
        userId: true, // 现在包含了userId
        paymentStatus: true,
        amount: true,
        points: true,
        bonusPoints: true,
        paymentTime: true,
        expireTime: true,
        failReason: true,
        packageId: true
      }
    });
    
    if (order) {
      console.log('✅ 订单查询成功:');
      console.log(`  订单号: ${order.orderNo}`);
      console.log(`  用户ID: ${order.userId} (类型: ${typeof order.userId})`);
      console.log(`  状态: ${order.paymentStatus}`);
      console.log(`  金额: ${order.amount}`);
      console.log(`  积分: ${order.points + order.bonusPoints}`);
      
      // 测试用户查询
      if (order.userId) {
        const user = await db.prisma.user.findUnique({
          where: { id: order.userId },
          select: { id: true, username: true, points: true }
        });
        
        if (user) {
          console.log('✅ 用户查询成功:');
          console.log(`  用户ID: ${user.id}`);
          console.log(`  用户名: ${user.username}`);
          console.log(`  当前积分: ${user.points}`);
        } else {
          console.log('❌ 用户不存在');
        }
      } else {
        console.log('❌ 订单中userId仍然为空');
      }
    } else {
      console.log('❌ 订单不存在');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await db.close();
  }
}

testOrderFix();