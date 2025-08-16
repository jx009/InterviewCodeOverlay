const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPackages() {
  console.log('检查充值套餐数据...');
  
  try {
    // 检查所有套餐
    const allPackages = await prisma.paymentPackage.findMany();
    console.log(`数据库中总共有 ${allPackages.length} 个套餐`);
    
    // 检查活跃套餐
    const activePackages = await prisma.paymentPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log(`其中有 ${activePackages.length} 个活跃套餐:`);
    activePackages.forEach(pkg => {
      console.log(`- ${pkg.name}: ${pkg.amount}元 = ${pkg.points}积分 (活跃: ${pkg.isActive})`);
    });
    
    // 模拟接口返回格式
    const response = {
      success: true,
      data: activePackages,
      message: '获取套餐列表成功'
    };
    
    console.log('\n接口应该返回的数据格式:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPackages();