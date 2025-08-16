// 调试前端API调用，检查实际返回的数据格式
const express = require('express');
const cors = require('cors');
const Database = require('./database');

const app = express();
const db = new Database();

// 添加CORS支持
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// 复制server-simple.js中的getPaymentPackages方法
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

// 模拟API端点
app.get('/api/payment/packages', async (req, res) => {
  try {
    console.log('🔍 前端调用 /api/payment/packages');
    const packages = await db.getPaymentPackages();
    
    const response = {
      success: true, 
      data: packages,
      message: '获取套餐列表成功'
    };
    
    console.log('📤 返回给前端的数据:');
    console.log(JSON.stringify(response, null, 2));
    
    res.json(response);
  } catch (error) {
    console.error('❌ API调用失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支付套餐列表失败: ' + error.message
    });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🚀 调试服务器启动在 http://localhost:${PORT}`);
  console.log('📋 测试URL: http://localhost:3002/api/payment/packages');
  
  // 立即测试一次
  setTimeout(async () => {
    try {
      const packages = await db.getPaymentPackages();
      console.log('\n🎯 直接调用方法的结果:');
      packages.forEach((pkg, index) => {
        console.log(`${index + 1}. ${pkg.name} - ¥${pkg.amount} - ${pkg.totalPoints}积分`);
      });
    } catch (error) {
      console.error('❌ 直接调用失败:', error);
    }
  }, 1000);
});