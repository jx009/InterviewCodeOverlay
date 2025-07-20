import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 支付套餐初始数据
const PAYMENT_PACKAGES = [
  {
    name: '体验套餐',
    description: '轻量级使用，适合初次体验',
    amount: 9.90,
    points: 100,
    bonusPoints: 10,
    isActive: true,
    sortOrder: 1,
    icon: '🎯',
    tags: JSON.stringify(['新手推荐']),
    isRecommended: false
  },
  {
    name: '标准套餐',
    description: '日常使用首选，性价比最高',
    amount: 29.90,
    points: 300,
    bonusPoints: 50,
    isActive: true,
    sortOrder: 0,
    icon: '⭐',
    tags: JSON.stringify(['热门', '推荐']),
    isRecommended: true
  },
  {
    name: '专业套餐',
    description: '重度使用，功能全面解锁',
    amount: 59.90,
    points: 600,
    bonusPoints: 150,
    isActive: true,
    sortOrder: 2,
    icon: '💎',
    tags: JSON.stringify(['专业版']),
    isRecommended: false
  },
  {
    name: '旗舰套餐',
    description: '超值套餐，享受最高性价比',
    amount: 99.90,
    points: 1000,
    bonusPoints: 300,
    isActive: true,
    sortOrder: 3,
    icon: '👑',
    tags: JSON.stringify(['超值', '旗舰']),
    isRecommended: false
  },
  {
    name: '企业套餐',
    description: '企业级服务，大量积分优惠',
    amount: 199.90,
    points: 2000,
    bonusPoints: 800,
    isActive: true,
    sortOrder: 4,
    icon: '🏢',
    tags: JSON.stringify(['企业版', '批量优惠']),
    isRecommended: false
  }
];

async function initPaymentPackages() {
  console.log('🚀 开始初始化支付套餐数据...');

  try {
    // 检查是否已经有数据
    const existingPackages = await prisma.paymentPackage.findMany();
    
    if (existingPackages.length > 0) {
      console.log(`⚠️ 已存在 ${existingPackages.length} 个支付套餐，跳过初始化`);
      return;
    }

    // 创建支付套餐
    const createdPackages = [];
    
    for (const packageData of PAYMENT_PACKAGES) {
      const created = await prisma.paymentPackage.create({
        data: packageData
      });
      createdPackages.push(created);
      console.log(`✅ 创建套餐: ${packageData.name} - ¥${packageData.amount} (${packageData.points + packageData.bonusPoints}积分)`);
    }

    console.log(`🎉 成功初始化 ${createdPackages.length} 个支付套餐`);
    
    // 显示创建的套餐信息
    console.log('\n📋 支付套餐列表:');
    createdPackages.forEach((pkg, index) => {
      const totalPoints = pkg.points + pkg.bonusPoints;
      const pricePerPoint = (Number(pkg.amount) / totalPoints).toFixed(3);
      console.log(`${index + 1}. ${pkg.name}`);
      console.log(`   价格: ¥${pkg.amount}`);
      console.log(`   积分: ${pkg.points} + ${pkg.bonusPoints}(赠送) = ${totalPoints}`);
      console.log(`   性价比: ${pricePerPoint}元/积分`);
      console.log(`   推荐: ${pkg.isRecommended ? '是' : '否'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 初始化支付套餐失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initPaymentPackages().catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

export { initPaymentPackages, PAYMENT_PACKAGES }; 