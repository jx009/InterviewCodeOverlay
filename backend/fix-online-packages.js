// 修复线上套餐数据问题的脚本
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixOnlinePackages() {
  try {
    console.log('🔍 检查线上数据库payment_packages表...\n');
    
    // 1. 检查表是否存在以及数据
    const allPackages = await prisma.paymentPackage.findMany();
    console.log(`📦 payment_packages表中共有 ${allPackages.length} 条记录`);
    
    if (allPackages.length === 0) {
      console.log('❌ 表为空，需要插入数据\n');
      console.log('🔄 正在插入3个套餐数据...');
      
      const packageData = [
        {
          name: '基础套餐',
          description: '适合新手用户，满足日常AI答题需求',
          amount: new Prisma.Decimal('9.9'),
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
          amount: new Prisma.Decimal('19.9'),
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
          amount: new Prisma.Decimal('39.9'),
          points: 500,
          bonusPoints: 120,
          isActive: true,
          sortOrder: 3,
          label: 'limited_time',
          labelColor: 'orange',
          isRecommended: false
        }
      ];
      
      // 使用createMany插入数据
      const result = await prisma.paymentPackage.createMany({
        data: packageData,
        skipDuplicates: true
      });
      
      console.log(`✅ 成功插入 ${result.count} 条套餐数据\n`);
    } else {
      console.log('📋 现有数据:');
      allPackages.forEach((pkg, index) => {
        console.log(`${index + 1}. ID:${pkg.id} - ${pkg.name} - ¥${pkg.amount} - ${pkg.points + pkg.bonusPoints}积分 - 活跃:${pkg.isActive}`);
      });
      
      // 检查是否有活跃的套餐
      const activePackages = allPackages.filter(pkg => pkg.isActive);
      console.log(`\n🎯 活跃套餐数量: ${activePackages.length}`);
      
      if (activePackages.length === 0) {
        console.log('❌ 没有活跃的套餐！所有套餐的isActive都是false');
        console.log('🔄 正在将所有套餐设置为活跃状态...');
        
        await prisma.paymentPackage.updateMany({
          data: { isActive: true }
        });
        
        console.log('✅ 已将所有套餐设置为活跃状态');
      }
    }
    
    // 2. 最终验证
    console.log('\n🔍 最终验证 - 查询活跃套餐:');
    const finalPackages = await prisma.paymentPackage.findMany({
      where: { isActive: true },
      orderBy: [
        { isRecommended: 'desc' },
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });
    
    console.log(`✅ 活跃套餐数量: ${finalPackages.length}`);
    finalPackages.forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.name} - ¥${parseFloat(pkg.amount)} - ${pkg.points + pkg.bonusPoints}积分`);
    });
    
    // 3. 测试API格式化
    console.log('\n🎯 API应该返回的格式:');
    const apiData = finalPackages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      points: pkg.points,
      bonusPoints: pkg.bonusPoints,
      amount: parseFloat(pkg.amount),
      status: "active",
      isRecommended: pkg.isRecommended,
      sortOrder: pkg.sortOrder,
      label: pkg.label,
      labelColor: pkg.labelColor,
      totalPoints: pkg.points + pkg.bonusPoints
    }));
    
    console.log(JSON.stringify({ success: true, data: apiData, message: '获取套餐列表成功' }, null, 2));
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
    console.error('错误详情:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 导入Prisma命名空间以使用Decimal
const { Prisma } = require('@prisma/client');

fixOnlinePackages();