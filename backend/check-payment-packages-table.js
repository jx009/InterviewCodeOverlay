const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPaymentPackagesTable() {
  try {
    console.log('🔍 检查payment_packages表中的实际数据...\n');
    
    // 查询所有套餐（包括非活跃的）
    const allPackages = await prisma.paymentPackage.findMany({
      orderBy: [
        { id: 'asc' }
      ]
    });
    
    console.log(`📦 payment_packages表中总共有 ${allPackages.length} 条记录:\n`);
    
    allPackages.forEach((pkg, index) => {
      console.log(`${index + 1}. ID: ${pkg.id}`);
      console.log(`   名称: ${pkg.name}`);
      console.log(`   描述: ${pkg.description}`);
      console.log(`   价格: ¥${parseFloat(pkg.amount)}`);
      console.log(`   基础积分: ${pkg.points}`);
      console.log(`   奖励积分: ${pkg.bonusPoints}`);
      console.log(`   总积分: ${pkg.points + pkg.bonusPoints}`);
      console.log(`   是否活跃: ${pkg.isActive ? '是' : '否'}`);
      console.log(`   是否推荐: ${pkg.isRecommended ? '是' : '否'}`);
      console.log(`   排序权重: ${pkg.sortOrder}`);
      console.log(`   标签: ${pkg.label || '无'}`);
      console.log(`   标签颜色: ${pkg.labelColor || '无'}`);
      console.log(`   创建时间: ${pkg.createdAt}`);
      console.log('');
    });
    
    // 查询活跃套餐（前端应该显示的）
    console.log('🎯 活跃套餐（前端应该显示的）:');
    const activePackages = allPackages.filter(pkg => pkg.isActive);
    console.log(`活跃套餐数量: ${activePackages.length}\n`);
    
    if (activePackages.length > 0) {
      activePackages.forEach((pkg, index) => {
        console.log(`活跃套餐 ${index + 1}: ${pkg.name} - ¥${parseFloat(pkg.amount)} - ${pkg.points + pkg.bonusPoints}积分`);
      });
    } else {
      console.log('❌ 没有找到活跃的套餐！');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentPackagesTable();