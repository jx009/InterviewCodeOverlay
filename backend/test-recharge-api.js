const express = require('express');
const cors = require('cors');

const app = express();

// 基本中间件
app.use(cors());
app.use(express.json());

// 模拟数据
const mockPackages = [
  {
    id: 1,
    name: '基础套餐',
    description: '适合新手用户',
    amount: 9.90,
    points: 100,
    bonusPoints: 20,
    sortOrder: 1,
    isActive: true,
    isRecommended: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: '标准套餐',
    description: '最受欢迎的选择',
    amount: 19.90,
    points: 220,
    bonusPoints: 50,
    sortOrder: 2,
    isActive: true,
    isRecommended: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    name: '专业套餐',
    description: '高频使用用户首选',
    amount: 39.90,
    points: 500,
    bonusPoints: 120,
    sortOrder: 3,
    isActive: true,
    isRecommended: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockStats = {
  total: {
    orders: 150,
    amount: 2980.50,
    points: 45600
  },
  today: {
    orders: 5,
    amount: 99.50,
    points: 1240
  },
  weekly: [
    { date: '2024-01-20', orders: 10, amount: 199.00, points: 2400 },
    { date: '2024-01-19', orders: 8, amount: 159.20, points: 1920 }
  ],
  packages: mockPackages.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    orders: Math.floor(Math.random() * 50) + 10,
    amount: Math.floor(Math.random() * 1000) + 500,
    points: Math.floor(Math.random() * 10000) + 5000
  })),
  recentOrders: [
    {
      id: 1,
      orderNo: 'ORDER001',
      amount: 19.90,
      points: 270,
      packageName: '标准套餐',
      username: 'testuser',
      paymentTime: new Date().toISOString()
    }
  ]
};

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 充值管理API
app.get('/api/admin/recharge/packages', (req, res) => {
  console.log('📦 收到获取充值套餐请求');
  res.json({
    success: true,
    data: {
      packages: mockPackages,
      total: mockPackages.length,
      message: '获取充值套餐成功'
    }
  });
});

app.post('/api/admin/recharge/packages', (req, res) => {
  console.log('📦 收到创建充值套餐请求:', req.body);
  const newPackage = {
    id: mockPackages.length + 1,
    ...req.body,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  mockPackages.push(newPackage);
  
  res.json({
    success: true,
    data: {
      package: newPackage,
      message: '充值套餐创建成功'
    }
  });
});

app.put('/api/admin/recharge/packages/:id', (req, res) => {
  const packageId = parseInt(req.params.id);
  console.log('📦 收到更新充值套餐请求:', { packageId, data: req.body });
  
  const packageIndex = mockPackages.findIndex(pkg => pkg.id === packageId);
  if (packageIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '套餐不存在'
    });
  }
  
  mockPackages[packageIndex] = {
    ...mockPackages[packageIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: {
      package: mockPackages[packageIndex],
      message: '充值套餐更新成功'
    }
  });
});

app.delete('/api/admin/recharge/packages/:id', (req, res) => {
  const packageId = parseInt(req.params.id);
  console.log('📦 收到删除充值套餐请求:', packageId);
  
  const packageIndex = mockPackages.findIndex(pkg => pkg.id === packageId);
  if (packageIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '套餐不存在'
    });
  }
  
  const deletedPackage = mockPackages.splice(packageIndex, 1)[0];
  
  res.json({
    success: true,
    data: {
      deletedPackage: { id: deletedPackage.id, name: deletedPackage.name },
      message: '充值套餐删除成功'
    }
  });
});

app.get('/api/admin/recharge/stats', (req, res) => {
  console.log('📊 收到获取充值统计请求');
  res.json({
    success: true,
    data: {
      stats: mockStats,
      message: '获取充值统计成功'
    }
  });
});

// 启动服务器
const PORT = 3001;
app.listen(PORT, () => {
  console.log('');
  console.log('🎉 测试服务器启动成功!');
  console.log(`🚀 服务器运行在端口: ${PORT}`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health`);
  console.log(`📦 充值套餐API: http://localhost:${PORT}/api/admin/recharge/packages`);
  console.log('');
});