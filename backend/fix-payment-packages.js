// 修复支付套餐接口的脚本
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 模拟正确的支付套餐接口实现
async function getPaymentPackages() {
  try {
    console.log('📦 获取支付套餐列表');

    const packages = await prisma.paymentPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    console.log(`✅ 获取到 ${packages.length} 个有效套餐`);
    
    // 返回标准格式
    return {
      success: true,
      data: packages,
      message: '获取套餐列表成功'
    };

  } catch (error) {
    console.error('❌ 获取支付套餐失败:', error);
    return {
      success: false,
      data: [],
      message: `获取套餐失败: ${error.message}`
    };
  }
}

// 测试接口
async function testPaymentPackagesAPI() {
  console.log('测试支付套餐接口...');
  
  const result = await getPaymentPackages();
  
  console.log('接口返回结果:');
  console.log(JSON.stringify(result, null, 2));
  
  // 验证数据格式
  if (result.success && result.data && result.data.length > 0) {
    console.log('\n✅ 接口工作正常，数据格式正确');
    console.log(`返回了 ${result.data.length} 个套餐:`);
    result.data.forEach(pkg => {
      console.log(`  - ${pkg.name}: ¥${pkg.amount} = ${pkg.points}积分`);
    });
  } else {
    console.log('\n❌ 接口返回数据异常');
  }
  
  await prisma.$disconnect();
}

testPaymentPackagesAPI();