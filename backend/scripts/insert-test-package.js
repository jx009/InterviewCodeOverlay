// 插入测试套餐的脚本
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function insertTestPackage() {
  try {
    console.log('🔄 开始插入测试套餐...');
    
    const testPackage = await prisma.paymentPackage.upsert({
      where: { id: 999 },
      update: {
        name: '测试套餐',
        description: '仅供测试使用，1分钱体验充值功能',
        amount: 0.01,
        points: 1000,
        bonusPoints: 0,
        isActive: true,
        sortOrder: 0,
        icon: '🧪',
        tags: JSON.stringify(['测试专用']),
        isRecommended: false
      },
      create: {
        id: 999,
        name: '测试套餐',
        description: '仅供测试使用，1分钱体验充值功能',
        amount: 0.01,
        points: 1000,
        bonusPoints: 0,
        isActive: true,
        sortOrder: 0,
        icon: '🧪',
        tags: JSON.stringify(['测试专用']),
        isRecommended: false
      }
    });
    
    console.log('✅ 测试套餐插入成功:', testPackage);
    
  } catch (error) {
    console.error('❌ 插入测试套餐失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

insertTestPackage();