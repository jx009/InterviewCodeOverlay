// 测试API端点是否正常工作
const express = require('express');
const Database = require('./database');

// 创建数据库实例
const db = new Database();

// 添加支付套餐方法
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

async function testAPIEndpoint() {
  try {
    console.log('🔍 测试API端点 /api/payment/packages...\n');
    
    // 直接调用数据库方法
    const packages = await db.getPaymentPackages();
    
    console.log(`✅ 成功获取 ${packages.length} 个套餐:\n`);
    
    const response = {
      success: true,
      data: packages,
      message: '获取套餐列表成功'
    };
    
    console.log('API响应数据:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\n🎯 前端应该接收到以上数据格式');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testAPIEndpoint();