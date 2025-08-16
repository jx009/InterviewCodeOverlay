// 诊断线上环境的具体问题
const Database = require('./database');

async function diagnoseOnlineEnvironment() {
  console.log('🔍 诊断线上环境问题...\n');
  
  try {
    const db = new Database();
    
    // 1. 检查数据库连接
    console.log('1️⃣ 检查数据库连接:');
    await db.prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ 数据库连接正常');
    
    // 2. 检查数据库名称和表信息
    console.log('\n2️⃣ 检查数据库信息:');
    const dbInfo = await db.prisma.$queryRaw`SELECT DATABASE() as current_db`;
    console.log('   当前数据库:', dbInfo[0].current_db);
    
    // 3. 检查payment_packages表是否存在
    console.log('\n3️⃣ 检查payment_packages表:');
    try {
      const tableExists = await db.prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'payment_packages'
      `;
      console.log('   表存在:', tableExists[0].count > 0);
      
      if (tableExists[0].count > 0) {
        // 4. 检查表中数据
        console.log('\n4️⃣ 检查表中数据:');
        const totalCount = await db.prisma.$queryRaw`SELECT COUNT(*) as count FROM payment_packages`;
        console.log('   总记录数:', totalCount[0].count);
        
        const activeCount = await db.prisma.$queryRaw`SELECT COUNT(*) as count FROM payment_packages WHERE is_active = 1`;
        console.log('   活跃记录数:', activeCount[0].count);
        
        // 5. 查看所有数据
        console.log('\n5️⃣ 查看所有数据:');
        const allData = await db.prisma.$queryRaw`SELECT * FROM payment_packages`;
        console.log('   所有数据:', allData);
        
        // 6. 测试具体的查询条件
        console.log('\n6️⃣ 测试查询条件:');
        const queryResult = await db.prisma.$queryRaw`
          SELECT * FROM payment_packages 
          WHERE is_active = 1 
          ORDER BY is_recommended DESC, sort_order ASC, id ASC
        `;
        console.log('   查询结果:', queryResult);
        
        if (queryResult.length === 0) {
          console.log('\n❌ 发现问题: SQL查询返回空结果!');
          console.log('   可能原因:');
          console.log('   1. is_active字段的值不是1');
          console.log('   2. 数据被意外删除');
          console.log('   3. 字段类型不匹配');
          
          // 检查is_active字段的实际值
          const activeCheck = await db.prisma.$queryRaw`
            SELECT id, name, is_active, 
                   is_active = 1 as is_one,
                   is_active = true as is_true,
                   TYPEOF(is_active) as type
            FROM payment_packages
          `;
          console.log('\n🔍 字段值检查:', activeCheck);
        }
      }
    } catch (tableError) {
      console.log('   ❌ 表不存在或查询失败:', tableError.message);
    }
    
    // 7. 测试Prisma ORM查询
    console.log('\n7️⃣ 测试Prisma ORM查询:');
    try {
      const prismaResult = await db.prisma.paymentPackage.findMany({
        where: { isActive: true }
      });
      console.log('   Prisma查询结果数量:', prismaResult.length);
      console.log('   Prisma查询结果:', prismaResult);
    } catch (prismaError) {
      console.log('   ❌ Prisma查询失败:', prismaError.message);
    }
    
    // 8. 测试getPaymentPackages方法
    console.log('\n8️⃣ 测试getPaymentPackages方法:');
    
    // 重新定义方法以确保存在
    db.getPaymentPackages = async function() {
      try {
        console.log('   🔄 执行getPaymentPackages...');
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
        
        console.log('   📦 原始查询结果:', packages);
        
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
        
        console.log('   📤 处理后结果:', result);
        return result;
      } catch (error) {
        console.error('   ❌ 方法内部错误:', error);
        return [];
      }
    };
    
    const methodResult = await db.getPaymentPackages();
    console.log('   方法最终结果数量:', methodResult.length);
    
  } catch (error) {
    console.error('❌ 诊断失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

diagnoseOnlineEnvironment();