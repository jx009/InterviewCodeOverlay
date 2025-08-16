// 检查线上服务器getPaymentPackages方法的具体错误
const Database = require('./database');

async function checkServerError() {
  console.log('🔍 检查getPaymentPackages方法的具体错误...\n');
  
  try {
    const db = new Database();
    
    // 重新定义方法，添加详细的错误日志
    db.getPaymentPackages = async function() {
      try {
        console.log('🔄 开始执行getPaymentPackages方法...');
        console.log('🔍 检查Prisma客户端:', this.prisma ? '存在' : '不存在');
        
        if (!this.prisma) {
          throw new Error('Prisma客户端未初始化');
        }
        
        console.log('📋 执行数据库查询...');
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
        
        console.log(`✅ 查询成功，获取到 ${packages.length} 条记录`);
        console.log('📦 原始数据:', packages);
        
        console.log('🔄 开始数据映射...');
        const result = packages.map((pkg, index) => {
          console.log(`   处理第 ${index + 1} 条数据: ${pkg.name}`);
          return {
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
          };
        });
        
        console.log('✅ 数据映射完成');
        console.log('📤 最终返回数据:', result);
        return result;
        
      } catch (error) {
        console.error('❌ getPaymentPackages方法内部错误:');
        console.error('   错误类型:', error.constructor.name);
        console.error('   错误消息:', error.message);
        console.error('   错误堆栈:', error.stack);
        
        // 检查是否是数据库连接问题
        if (error.message.includes('connect') || error.message.includes('connection')) {
          console.error('🔗 可能是数据库连接问题');
        }
        
        // 检查是否是表不存在问题
        if (error.message.includes('table') || error.message.includes('relation')) {
          console.error('📋 可能是数据表不存在问题');
        }
        
        // 检查是否是字段问题
        if (error.message.includes('column') || error.message.includes('field')) {
          console.error('📝 可能是字段名称问题');
        }
        
        return [];
      }
    };
    
    // 测试方法调用
    console.log('🧪 测试方法调用...');
    const result = await db.getPaymentPackages();
    
    console.log(`\n📊 最终结果: ${result.length} 个套餐`);
    if (result.length === 0) {
      console.log('❌ 方法返回空数组 - 这就是API返回空数组的原因！');
    } else {
      console.log('✅ 方法正常工作，问题可能在其他地方');
    }
    
  } catch (outerError) {
    console.error('❌ 外层测试失败:', outerError);
    console.error('这可能表示Database类初始化失败');
  }
}

checkServerError();