// 初始化支付套餐脚本
import { PrismaClient } from '@prisma/client';
import { PAYMENT_CONFIG } from '../config/payment-config';

const prisma = new PrismaClient();

async function initPaymentPackages() {
  console.log('🚀 开始初始化支付套餐...');

  try {
    // 检查是否已有套餐数据
    const existingPackages = await prisma.paymentPackage.count();
    
    if (existingPackages > 0) {
      console.log(`📦 发现 ${existingPackages} 个现有套餐，跳过初始化`);
      return;
    }

    // 创建默认套餐
    const packages = PAYMENT_CONFIG.DEFAULT_PACKAGES;
    console.log(`📦 准备创建 ${packages.length} 个默认套餐...`);

    for (const packageData of packages) {
      const createdPackage = await prisma.paymentPackage.create({
        data: {
          name: packageData.name,
          description: packageData.description,
          amount: packageData.amount,
          points: packageData.points,
          bonusPoints: packageData.bonusPoints,
          sortOrder: packageData.sortOrder,
          tags: packageData.tags,
          isRecommended: packageData.isRecommended || false,
          isActive: true
        }
      });

      console.log(`✅ 创建套餐: ${createdPackage.name} (${createdPackage.amount}元 = ${createdPackage.points}积分)`);
    }

    console.log('🎉 支付套餐初始化完成!');

  } catch (error) {
    console.error('❌ 初始化支付套餐失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initPaymentPackages()
    .then(() => {
      console.log('✨ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error);
      process.exit(1);
    });
}

export { initPaymentPackages }; 