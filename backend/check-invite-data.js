const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInviteData() {
  try {
    console.log('🔍 检查邀请数据...');
    
    // 1. 检查用户数据
    const users = await prisma.user.findMany({
      where: {
        id: { in: [8, 9, 10] }
      },
      select: {
        id: true,
        username: true,
        email: true,
        inviterId: true,
        invitedAt: true
      }
    });
    console.log('👥 用户数据:', users);
    
    // 2. 检查充值订单数据
    const paymentOrders = await prisma.paymentOrder.findMany({
      where: {
        userId: { in: [9, 10] }
      },
      select: {
        id: true,
        orderNo: true,
        userId: true,
        amount: true,
        paymentStatus: true,
        paymentTime: true
      }
    });
    console.log('💰 充值订单数据:', paymentOrders);
    
    // 3. 检查被邀请用户列表
    const invitedUsers = await prisma.user.findMany({
      where: {
        inviterId: 8
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      }
    });
    console.log('🎯 被用户8邀请的用户:', invitedUsers);
    
    // 4. 检查这些用户的充值记录
    const invitedIds = invitedUsers.map(u => u.id);
    const rechargeRecords = await prisma.paymentOrder.findMany({
      where: {
        userId: { in: invitedIds },
        paymentStatus: 'PAID'
      },
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      }
    });
    console.log('💳 被邀请用户的充值记录:', rechargeRecords);
    
  } catch (error) {
    console.error('❌ 检查数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInviteData(); 