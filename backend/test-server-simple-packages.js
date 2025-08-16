// 测试server-simple.js中的套餐API修改
const Database = require('./database');

async function testServerSimplePackages() {
  try {
    console.log('🔍 测试server-simple.js中的getPaymentPackages方法...\n');
    
    const db = new Database();
    
    // 模拟server-simple.js中的方法定义
    db.getPaymentPackages = async function() {
      try {
        const packages = await this.prisma.paymentPackage.findMany({
          where: {
            isActive: true
          },
          orderBy: [
            { isRecommended: 'desc' },
            { sortOrder: 'asc' },
            { id: 'asc' }
          ]
        });
        
        return packages.map(pkg => ({
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
      } catch (error) {
        console.error('从数据库获取套餐失败:', error);
        return [];
      }
    };
    
    // 测试方法调用
    const packages = await db.getPaymentPackages();
    
    console.log(`✅ 成功获取 ${packages.length} 个套餐:\n`);
    
    packages.forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.name} - ¥${pkg.amount}`);
      console.log(`   积分: ${pkg.points} + ${pkg.bonusPoints} = ${pkg.totalPoints}`);
      console.log(`   标签: ${pkg.label || '无'} (${pkg.labelColor || '无'})`);
      console.log(`   推荐: ${pkg.isRecommended ? '是' : '否'}`);
      console.log('');
    });
    
    console.log('🔄 API应该返回的数据格式:');
    console.log(JSON.stringify({
      success: true,
      data: packages,
      message: '获取套餐列表成功'
    }, null, 2));
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testServerSimplePackages();