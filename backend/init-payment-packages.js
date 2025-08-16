const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initPaymentPackages() {
  try {
    console.log('🚀 开始初始化充值套餐数据...');

    // 先清空现有数据
    await prisma.paymentPackage.deleteMany({});
    console.log('✅ 已清空现有套餐数据');

    // 插入3个套餐数据
    const packages = [
      {
        name: '基础套餐',
        description: '适合新手用户，满足日常AI答题需求',
        amount: 9.90,
        points: 100,
        bonusPoints: 20,
        isActive: true,
        sortOrder: 1,
        label: 'best_value',
        labelColor: 'blue',
        isRecommended: false
      },
      {
        name: '标准套餐',
        description: '最受欢迎的选择，积分充足性价比高',
        amount: 19.90,
        points: 220,
        bonusPoints: 50,
        isActive: true,
        sortOrder: 2,
        label: 'hot_sale',
        labelColor: 'red',
        isRecommended: true
      },
      {
        name: '专业套餐',
        description: '高频使用用户首选，送积分最多',
        amount: 39.90,
        points: 500,
        bonusPoints: 120,
        isActive: true,
        sortOrder: 3,
        label: 'limited_time',
        labelColor: 'orange',
        isRecommended: false
      }
    ];

    // 批量插入数据
    const result = await prisma.paymentPackage.createMany({
      data: packages
    });

    console.log(`🎉 成功插入 ${result.count} 个充值套餐`);
    
    // 验证插入结果
    const allPackages = await prisma.paymentPackage.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log('\n📋 已创建的套餐列表:');
    allPackages.forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.name} - ¥${pkg.amount}`);
      console.log(`   基础积分: ${pkg.points}, 赠送积分: ${pkg.bonusPoints}`);
      console.log(`   标签: ${pkg.label} (${pkg.labelColor}), 推荐: ${pkg.isRecommended ? '是' : '否'}`);
      console.log('');
    });

    console.log('✅ 初始化完成！');
    
  } catch (error) {
    console.error('❌ 初始化充值套餐失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  initPaymentPackages()
    .then(() => {
      console.log('🎯 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { initPaymentPackages };