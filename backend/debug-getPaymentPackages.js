// 调试getPaymentPackages方法的问题
const Database = require('./database');

async function debugGetPaymentPackages() {
  console.log('🔍 调试getPaymentPackages方法...\n');
  
  try {
    const db = new Database();
    
    // 1. 直接测试Prisma查询
    console.log('1️⃣ 直接测试Prisma查询:');
    const directQuery = await db.prisma.paymentPackage.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { isRecommended: 'desc' },
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });
    console.log(`   查询结果数量: ${directQuery.length}`);
    console.log('   查询结果:', directQuery);
    
    // 2. 测试getPaymentPackages方法（如果存在）
    console.log('\n2️⃣ 测试getPaymentPackages方法:');
    if (typeof db.getPaymentPackages === 'function') {
      console.log('   方法存在，正在调用...');
      const methodResult = await db.getPaymentPackages();
      console.log(`   方法结果数量: ${methodResult.length}`);
      console.log('   方法结果:', methodResult);
    } else {
      console.log('   ❌ getPaymentPackages方法不存在！');
      console.log('   🔧 正在添加方法...');
      
      // 添加方法
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
      
      console.log('   ✅ 方法已添加，正在测试...');
      const newMethodResult = await db.getPaymentPackages();
      console.log(`   新方法结果数量: ${newMethodResult.length}`);
      console.log('   新方法结果:', newMethodResult);
    }
    
    // 3. 检查数据库连接状态
    console.log('\n3️⃣ 检查数据库连接状态:');
    try {
      await db.prisma.$queryRaw`SELECT 1 as test`;
      console.log('   ✅ 数据库连接正常');
    } catch (error) {
      console.log('   ❌ 数据库连接异常:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

debugGetPaymentPackages();