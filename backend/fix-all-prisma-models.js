// 完整的Prisma模型名称修复脚本
const { PrismaClient } = require('@prisma/client');

async function testAllPrismaModels() {
  console.log('🔍 开始检测所有Prisma模型名称...');
  
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log('✅ 数据库连接成功');
    
    // 获取所有可用的模型
    const allProps = Object.getOwnPropertyNames(prisma);
    const models = allProps.filter(prop => {
      const obj = prisma[prop];
      return obj && 
             typeof obj === 'object' && 
             (typeof obj.findMany === 'function' || typeof obj.findUnique === 'function');
    });
    
    console.log('\n📋 发现的Prisma模型:');
    console.log('==========================================');
    
    for (const modelName of models.sort()) {
      const model = prisma[modelName];
      const methods = [];
      
      if (typeof model.findMany === 'function') methods.push('findMany');
      if (typeof model.findUnique === 'function') methods.push('findUnique');
      if (typeof model.create === 'function') methods.push('create');
      if (typeof model.update === 'function') methods.push('update');
      if (typeof model.count === 'function') methods.push('count');
      
      console.log(`✅ ${modelName} - 可用方法: [${methods.join(', ')}]`);
      
      // 测试count方法来验证模型是否工作
      try {
        if (typeof model.count === 'function') {
          const count = await model.count();
          console.log(`   📊 记录数: ${count}`);
        }
      } catch (error) {
        console.log(`   ❌ 测试失败: ${error.message}`);
      }
    }
    
    console.log('\n🔧 常见模型映射:');
    console.log('==========================================');
    console.log('Schema表名 → Prisma模型名');
    console.log('users → users');
    console.log('user_configs → user_configs');
    console.log('payment_packages → payment_packages');
    console.log('payment_orders → payment_orders');
    console.log('model_point_configs → model_point_configs');
    console.log('point_transactions → point_transactions');
    
    console.log('\n💡 修复建议:');
    console.log('==========================================');
    console.log('将代码中的以下引用进行替换:');
    console.log('❌ this.prisma.user → ✅ this.prisma.users');
    console.log('❌ this.prisma.userConfig → ✅ this.prisma.user_configs');
    console.log('❌ this.prisma.paymentPackage → ✅ this.prisma.payment_packages');
    console.log('❌ this.prisma.paymentOrder → ✅ this.prisma.payment_orders');
    console.log('❌ this.prisma.modelPointConfig → ✅ this.prisma.model_point_configs');
    console.log('❌ this.prisma.pointTransaction → ✅ this.prisma.point_transactions');
    
  } catch (error) {
    console.error('❌ 检测失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 创建临时修复函数用于测试
async function testPaymentPackages() {
  console.log('\n🧪 测试充值套餐查询...');
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    
    // 测试正确的模型名称
    const packages = await prisma.payment_packages.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        amount: true,
        points: true,
        bonusPoints: true
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });
    
    console.log('✅ 充值套餐查询成功!');
    console.log(`📦 找到 ${packages.length} 个活跃套餐:`);
    
    packages.forEach(pkg => {
      console.log(`   - ${pkg.name}: ¥${pkg.amount} → ${pkg.points}积分 + ${pkg.bonusPoints}奖励`);
    });
    
  } catch (error) {
    console.error('❌ 充值套餐查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testAllPrismaModels()
    .then(() => testPaymentPackages())
    .catch(console.error);
}

module.exports = { testAllPrismaModels, testPaymentPackages };