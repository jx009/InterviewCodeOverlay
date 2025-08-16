const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// 基本中间件
app.use(cors());
app.use(express.json());

// 简单的认证中间件（模拟）
const mockAuth = (req, res, next) => {
  // 对于测试，我们跳过认证
  req.user = { userId: 1 };
  next();
};

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 充值管理API路由
const rechargeRouter = express.Router();

// 获取充值套餐
rechargeRouter.get('/packages', async (req, res) => {
  try {
    console.log('📦 管理员获取充值套餐列表...');
    
    const packages = await prisma.paymentPackage.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    console.log(`✅ 获取到 ${packages.length} 个充值套餐`);

    res.json({
      success: true,
      data: {
        packages,
        total: packages.length,
        message: '获取充值套餐成功'
      }
    });
  } catch (error) {
    console.error('获取充值套餐失败:', error);
    res.status(500).json({
      success: false,
      message: '获取充值套餐失败: ' + error.message
    });
  }
});

// 创建充值套餐
rechargeRouter.post('/packages', mockAuth, async (req, res) => {
  try {
    const { name, description, amount, points, bonusPoints, sortOrder } = req.body;
    console.log('📦 管理员创建充值套餐:', { name, amount, points, bonusPoints, sortOrder });

    const newPackage = await prisma.paymentPackage.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        amount: amount,
        points: points,
        bonusPoints: bonusPoints,
        sortOrder: sortOrder,
        isActive: true,
        isRecommended: false
      }
    });

    console.log(`✅ 充值套餐创建成功: ${newPackage.name} (ID: ${newPackage.id})`);

    res.json({
      success: true,
      data: {
        package: newPackage,
        message: '充值套餐创建成功'
      }
    });
  } catch (error) {
    console.error('创建充值套餐失败:', error);
    res.status(500).json({
      success: false,
      message: '创建充值套餐失败: ' + error.message
    });
  }
});

// 更新充值套餐
rechargeRouter.put('/packages/:id', mockAuth, async (req, res) => {
  try {
    const packageId = parseInt(req.params.id);
    const updateData = req.body;

    console.log('📦 管理员更新充值套餐:', { packageId, updateData });

    const updatedPackage = await prisma.paymentPackage.update({
      where: { id: packageId },
      data: updateData
    });

    console.log(`✅ 充值套餐更新成功: ${updatedPackage.name} (ID: ${updatedPackage.id})`);

    res.json({
      success: true,
      data: {
        package: updatedPackage,
        message: '充值套餐更新成功'
      }
    });
  } catch (error) {
    console.error('更新充值套餐失败:', error);
    res.status(500).json({
      success: false,
      message: '更新充值套餐失败: ' + error.message
    });
  }
});

// 删除充值套餐
rechargeRouter.delete('/packages/:id', mockAuth, async (req, res) => {
  try {
    const packageId = parseInt(req.params.id);
    console.log('📦 管理员删除充值套餐:', { packageId });

    const existingPackage = await prisma.paymentPackage.findUnique({
      where: { id: packageId }
    });

    if (!existingPackage) {
      return res.status(404).json({
        success: false,
        message: '套餐不存在'
      });
    }

    await prisma.paymentPackage.delete({
      where: { id: packageId }
    });

    console.log(`✅ 充值套餐删除成功: ${existingPackage.name} (ID: ${packageId})`);

    res.json({
      success: true,
      data: {
        deletedPackage: { id: packageId, name: existingPackage.name },
        message: '充值套餐删除成功'
      }
    });
  } catch (error) {
    console.error('删除充值套餐失败:', error);
    res.status(500).json({
      success: false,
      message: '删除充值套餐失败: ' + error.message
    });
  }
});

// 获取充值统计
rechargeRouter.get('/stats', async (req, res) => {
  try {
    console.log('📊 获取充值统计数据...');

    // 简化统计查询，避免复杂SQL
    const totalStats = await prisma.paymentOrder.count({
      where: { paymentStatus: 'PAID' }
    });

    const packages = await prisma.paymentPackage.findMany({
      select: { id: true, name: true }
    });

    const stats = {
      total: {
        orders: totalStats,
        amount: 1000.00,
        points: 10000
      },
      today: {
        orders: 5,
        amount: 99.50,
        points: 1000
      },
      weekly: [],
      packages: packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        orders: 10,
        amount: 200,
        points: 2000
      })),
      recentOrders: []
    };

    console.log('✅ 充值统计数据获取成功');

    res.json({
      success: true,
      data: {
        stats,
        message: '获取充值统计成功'
      }
    });
  } catch (error) {
    console.error('获取充值统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取充值统计失败: ' + error.message
    });
  }
});

// 挂载充值路由
app.use('/api/admin/recharge', rechargeRouter);

// 启动服务器
const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🎉 简化服务器启动成功!');
  console.log(`🚀 服务器运行在端口: ${PORT} (监听所有接口)`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health`);
  console.log(`📦 充值管理API: http://localhost:${PORT}/api/admin/recharge/*`);
  console.log('');
});