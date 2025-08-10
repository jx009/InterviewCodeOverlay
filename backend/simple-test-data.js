const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSimpleTestData() {
  console.log('🔍 开始创建测试数据...');
  
  try {
    // 1. 创建被邀请用户
    console.log('创建被邀请用户...');
    await prisma.user.create({
      data: {
        username: 'invited_test_user',
        email: 'invited_test@example.com',
        password: 'password123',
        points: 100,
        inviterId: 8, // 被用户8邀请
        invitedAt: new Date()
      }
    });
    console.log('✅ 被邀请用户创建成功');
    
    // 2. 获取被邀请用户ID
    const invitedUser = await prisma.user.findFirst({
      where: { email: 'invited_test@example.com' }
    });
    console.log('被邀请用户ID:', invitedUser.id);
    
    // 3. 创建充值订单
    console.log('创建充值订单...');
    await prisma.paymentOrder.create({
      data: {
        orderNo: 'TEST_ORDER_001',
        outTradeNo: 'OUT_TEST_001',
        userId: invitedUser.id,
        amount: 100.00,
        points: 1000,
        paymentMethod: 'WECHAT_PAY',
        paymentStatus: 'PAID',
        paymentTime: new Date(),
        expireTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
    console.log('✅ 充值订单创建成功');
    
    console.log('🎉 测试数据创建完成！');
    
  } catch (error) {
    console.error('❌ 创建失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createSimpleTestData(); 