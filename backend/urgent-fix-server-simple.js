// 紧急修复：直接在server-simple.js的API端点中硬编码查询
// 这是一个临时解决方案，确保API能正常工作

console.log('🔧 正在应用紧急修复...');

// 读取server-simple.js文件内容
const fs = require('fs');
const path = require('path');

const serverFilePath = path.join(__dirname, 'server-simple.js');

try {
  let serverContent = fs.readFileSync(serverFilePath, 'utf8');
  
  console.log('📖 读取server-simple.js文件成功');
  
  // 查找API端点并替换
  const oldApiCode = `app.get('/api/payment/packages', optionalVerifyToken, async (req, res) => {
  try {
    console.log('🔍 前端请求 /api/payment/packages');
    // 获取支付套餐列表
    const packages = await db.getPaymentPackages();
    
    console.log('📦 返回套餐数据:', packages);
    
    res.json({
      success: true, 
      data: packages,
      message: '获取套餐列表成功'
    });
  } catch (error) {
    console.error('获取支付套餐列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支付套餐列表失败: ' + error.message
    });
  }
});`;

  const newApiCode = `app.get('/api/payment/packages', optionalVerifyToken, async (req, res) => {
  try {
    console.log('🔍 前端请求 /api/payment/packages - 使用紧急修复版本');
    
    // 直接查询数据库，绕过可能有问题的getPaymentPackages方法
    const packages = await db.prisma.paymentPackage.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { isRecommended: 'desc' },
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });
    
    console.log('📦 直接查询结果:', packages.length, '个套餐');
    
    // 直接在这里处理数据格式化
    const formattedPackages = packages.map(pkg => ({
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
    
    console.log('📦 格式化后数据:', formattedPackages);
    
    res.json({
      success: true, 
      data: formattedPackages,
      message: '获取套餐列表成功'
    });
  } catch (error) {
    console.error('获取支付套餐列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支付套餐列表失败: ' + error.message
    });
  }
});`;

  if (serverContent.includes(oldApiCode)) {
    serverContent = serverContent.replace(oldApiCode, newApiCode);
    console.log('✅ 找到并替换了API端点代码');
  } else {
    console.log('⚠️ 没有找到完全匹配的API端点代码，尝试部分替换...');
    
    // 尝试更宽松的匹配
    const apiPattern = /app\.get\('\/api\/payment\/packages'[^}]+}\);/s;
    if (apiPattern.test(serverContent)) {
      serverContent = serverContent.replace(apiPattern, newApiCode);
      console.log('✅ 使用模式匹配替换了API端点代码');
    } else {
      console.log('❌ 无法找到API端点代码进行替换');
    }
  }
  
  // 写回文件
  fs.writeFileSync(serverFilePath + '.fixed', serverContent);
  console.log('💾 修复后的代码已保存到 server-simple.js.fixed');
  
  console.log('\n🚀 应用修复:');
  console.log('1. 将 server-simple.js.fixed 重命名为 server-simple.js');
  console.log('2. 重启服务器');
  console.log('3. 测试API是否返回正确数据');
  
} catch (error) {
  console.error('❌ 修复失败:', error);
}