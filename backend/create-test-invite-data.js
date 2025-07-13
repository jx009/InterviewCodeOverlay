const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestInviteData() {
  try {
    console.log('🔍 创建测试邀请数据...');
    
    // 1. 创建邀请人用户（用户ID=8）
    const inviter = await prisma.user.upsert({
      where: { id: 8 },
      update: {},
      create: {
        id: 8,
        username: 'inviter_user',
        email: 'inviter@example.com',
        password: 'hashed_password',
        points: 1000,
        inviteCode: 'INVITE123'
      }
    });
    console.log('✅ 邀请人用户创建成功:', inviter.username);
    
    // 2. 创建被邀请的用户
    const invitedUser1 = await prisma.user.upsert({
      where: { id: 9 },
      update: {},
      create: {
        id: 9,
        username: 'invited_user1',
        email: 'invited1@example.com',
        password: 'hashed_password',
        points: 100,
        inviterId: 8, // 被用户8邀请
        invitedAt: new Date('2024-01-01')
      }
    });
    console.log('✅ 被邀请用户1创建成功:', invitedUser1.username);
    
    const invitedUser2 = await prisma.user.upsert({
      where: { id: 10 },
      update: {},
      create: {
        id: 10,
        username: 'invited_user2',
        email: 'invited2@example.com',
        password: 'hashed_password',
        points: 200,
        inviterId: 8, // 被用户8邀请
        invitedAt: new Date('2024-01-02')
      }
    });
    console.log('✅ 被邀请用户2创建成功:', invitedUser2.username);
    
    // 3. 创建充值订单
    const paymentOrder1 = await prisma.paymentOrder.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        orderNo: 'ORDER_001',
        outTradeNo: 'OUT_001',
        userId: 9, // 被邀请用户1的充值
        amount: 100.00,
        points: 1000,
        paymentMethod: 'WECHAT_PAY',
        paymentStatus: 'PAID',
        paymentTime: new Date('2024-01-03'),
        expireTime: new Date('2024-01-04')
      }
    });
    console.log('✅ 充值订单1创建成功:', paymentOrder1.orderNo);
    
    const paymentOrder2 = await prisma.paymentOrder.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        orderNo: 'ORDER_002',
        outTradeNo: 'OUT_002',
        userId: 10, // 被邀请用户2的充值
        amount: 200.00,
        points: 2000,
        paymentMethod: 'ALIPAY',
        paymentStatus: 'PAID',
        paymentTime: new Date('2024-01-05'),
        expireTime: new Date('2024-01-06')
      }
    });
    console.log('✅ 充值订单2创建成功:', paymentOrder2.orderNo);
    
    console.log('\n🎉 测试数据创建完成！');
    console.log('现在可以测试邀请API了:');
    console.log('- 邀请注册记录: http://localhost:3001/api/invite/registrations?userId=8&page=1&limit=10');
    console.log('- 邀请充值记录: http://localhost:3001/api/invite/recharges?userId=8&page=1&limit=10');
    
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestInviteData(); 