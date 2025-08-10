import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 支付套餐初始数据
const PAYMENT_PACKAGES = [
  {
    name: '基础套餐',
    description: '适合新手用户，满足日常AI答题需求',
    amount: 9.90,
    points: 100,
    bonusPoints: 20,
    isActive: true,
    sortOrder: 1,
    icon: null,
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
    icon: null,
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
    icon: null,
    label: 'limited_time',
    labelColor: 'orange',
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