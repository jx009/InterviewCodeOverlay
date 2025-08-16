// 强制修复线上服务器问题的脚本
const express = require('express');
const cors = require('cors');
const Database = require('./database');

// 创建临时API服务器来替代有问题的线上API
const app = express();
const db = new Database();

// 添加CORS支持
app.use(cors({
  origin: '*',
  credentials: true
}));

// 强制重新定义getPaymentPackages方法
db.getPaymentPackages = async function() {
  try {
    console.log('🔄 强制执行getPaymentPackages方法...');
    
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
    
    console.log(`📦 查询到 ${packages.length} 个套餐`);
    
    const result = packages.map(pkg => ({
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
    
    console.log('✅ 数据处理完成:', result.length, '个套餐');
    return result;
    
  } catch (error) {
    console.error('❌ 方法执行失败:', error);
    return [];
  }
};

// 创建临时API端点
app.get('/api/payment/packages', async (req, res) => {
  try {
    console.log('\n🚀 临时API被调用:', new Date().toISOString());
    
    const packages = await db.getPaymentPackages();
    
    const response = {
      success: true,
      data: packages,
      message: '获取套餐列表成功'
    };
    
    console.log('📤 返回数据:', JSON.stringify(response, null, 2));
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ API错误:', error);
    res.status(500).json({
      success: false,
      message: '获取支付套餐列表失败: ' + error.message
    });
  }
});

// 添加健康检查端点
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '临时服务器运行正常',
    timestamp: new Date().toISOString()
  });
});

const PORT = 3001; // 使用和线上服务器相同的端口

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 临时修复服务器启动成功！`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`🔗 API端点: http://localhost:${PORT}/api/payment/packages`);
  console.log(`💡 这个服务器将提供正确的套餐数据`);
  
  // 立即测试一次
  setTimeout(async () => {
    try {
      console.log('\n🧪 立即测试API...');
      const packages = await db.getPaymentPackages();
      console.log(`📊 测试结果: ${packages.length} 个套餐`);
      
      if (packages.length > 0) {
        console.log('\n📦 套餐列表:');
        packages.forEach((pkg, index) => {
          console.log(`   ${index + 1}. ${pkg.name} - ¥${pkg.amount} - ${pkg.totalPoints}积分`);
        });
        console.log('\n✅ 数据准备就绪！前端现在应该能获取到正确数据了。');
      } else {
        console.log('❌ 还是没有数据，需要进一步检查数据库');
      }
    } catch (error) {
      console.error('❌ 测试失败:', error);
    }
  }, 1000);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭临时服务器...');
  process.exit(0);
});

console.log('🔧 临时修复服务器准备中...');