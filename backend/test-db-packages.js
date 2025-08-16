const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabasePackages() {
  try {
    console.log('🔍 测试数据库中的套餐数据...\n');
    
    // 从数据库读取套餐
    const packages = await prisma.paymentPackage.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { isRecommended: 'desc' },
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });
    
    console.log(`📦 数据库中找到 ${packages.length} 个活跃套餐:\n`);
    
    packages.forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.name}`);
      console.log(`   价格: ¥${parseFloat(pkg.amount)}`);
      console.log(`   积分: ${pkg.points} + ${pkg.bonusPoints} = ${pkg.points + pkg.bonusPoints}`);
      console.log(`   标签: ${pkg.label || '无'} (${pkg.labelColor || '无颜色'})`);
      console.log(`   推荐: ${pkg.isRecommended ? '是' : '否'}`);
      console.log('');
    });
    
    // 测试API格式化
    console.log('🔄 测试API数据格式化...\n');
    const apiFormattedData = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      amount: parseFloat(pkg.amount),
      points: pkg.points,
      bonusPoints: pkg.bonusPoints,
      totalPoints: pkg.points + pkg.bonusPoints,
      isRecommended: pkg.isRecommended,
      icon: pkg.icon,
      label: pkg.label,
      labelColor: pkg.labelColor
    }));
    
    console.log('API应该返回的数据:');
    console.log(JSON.stringify({
      success: true,
      data: apiFormattedData
    }, null, 2));
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabasePackages();