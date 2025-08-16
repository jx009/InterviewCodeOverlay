// 最终诊断：创建一个临时API端点来测试
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

// 确保getPaymentPackages方法存在
db.getPaymentPackages = async function() {
  try {
    console.log('🔍 执行getPaymentPackages方法...');
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
    
    console.log(`📦 从数据库获取到 ${packages.length} 个套餐`);
    
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
    
    console.log('✅ 方法执行成功，返回数据:', result);
    return result;
  } catch (error) {
    console.error('❌ 方法执行失败:', error);
    return [];
  }
};

// 创建诊断端点
app.get('/api/test/packages', async (req, res) => {
  try {
    console.log('\n🚀 诊断端点被调用');
    const packages = await db.getPaymentPackages();
    
    res.json({
      success: true,
      data: packages,
      message: '诊断端点获取套餐成功',
      timestamp: new Date().toISOString(),
      debug: {
        methodExists: typeof db.getPaymentPackages === 'function',
        packageCount: packages.length
      }
    });
  } catch (error) {
    console.error('❌ 诊断端点错误:', error);
    res.status(500).json({
      success: false,
      message: '诊断端点失败: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 创建标准端点（模拟线上的）
app.get('/api/payment/packages', async (req, res) => {
  try {
    console.log('\n🔍 标准端点被调用');
    
    // 检查方法是否存在
    if (typeof db.getPaymentPackages !== 'function') {
      console.log('❌ getPaymentPackages方法不存在！');
      return res.json({
        success: true,
        data: [],
        message: '方法不存在 - 获取套餐列表成功'
      });
    }
    
    const packages = await db.getPaymentPackages();
    console.log(`📦 标准端点获取到 ${packages.length} 个套餐`);
    
    res.json({
      success: true,
      data: packages,
      message: '获取套餐列表成功'
    });
  } catch (error) {
    console.error('❌ 标准端点错误:', error);
    res.status(500).json({
      success: false,
      message: '获取支付套餐列表失败: ' + error.message
    });
  }
});

// 添加管理员API路由（模拟admin.ts的实现）
app.get('/api/admin/payment-packages', async (req, res) => {
  try {
    console.log('\n🔐 管理员API被调用 - /api/admin/payment-packages');
    console.log('请求头:', req.headers);
    
    // 简化版本：跳过权限验证，直接返回数据
    console.log('🔍 开始查询充值套餐...');
    
    const packages = await db.getPaymentPackages();
    console.log(`✅ 查询成功，找到 ${packages.length} 个套餐`);
    
    // 返回与admin.ts相同的格式
    res.json({
      success: true,
      packages: packages,
      total: packages.length,
      message: '获取充值套餐成功'
    });
  } catch (error) {
    console.error('❌ 管理员API错误:', error);
    res.status(500).json({
      success: false,
      message: '获取充值套餐失败'
    });
  }
});

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`🚀 诊断服务器启动在 http://localhost:${PORT}`);
  console.log(`📋 诊断端点: http://localhost:${PORT}/api/test/packages`);
  console.log(`📋 标准端点: http://localhost:${PORT}/api/payment/packages`);
  console.log(`📋 管理员端点: http://localhost:${PORT}/api/admin/payment-packages`);
  
  // 立即测试
  setTimeout(async () => {
    try {
      console.log('\n🧪 立即测试方法调用...');
      const packages = await db.getPaymentPackages();
      console.log(`✅ 直接调用结果: ${packages.length} 个套餐`);
      
      if (packages.length > 0) {
        console.log('📦 套餐详情:');
        packages.forEach((pkg, index) => {
          console.log(`   ${index + 1}. ${pkg.name} - ¥${pkg.amount} - ${pkg.totalPoints}积分`);
        });
      }
    } catch (error) {
      console.error('❌ 直接测试失败:', error);
    }
  }, 1000);
});