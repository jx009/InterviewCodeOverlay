// 检查线上环境配置和数据库连接
const { PrismaClient } = require('@prisma/client');

async function checkOnlineEnvironment() {
  console.log('🔍 检查线上环境配置...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. 检查数据库连接
    console.log('1️⃣ 检查数据库连接:');
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ 数据库连接正常');
    
    // 2. 检查payment_packages表结构
    console.log('\n2️⃣ 检查payment_packages表结构:');
    const tableInfo = await prisma.$queryRaw`
      DESCRIBE payment_packages
    `;
    console.log('   表结构:', tableInfo);
    
    // 3. 检查表中数据总数
    console.log('\n3️⃣ 检查表中数据:');
    const totalCount = await prisma.paymentPackage.count();
    console.log('   总记录数:', totalCount);
    
    // 4. 检查活跃数据
    const activeCount = await prisma.paymentPackage.count({
      where: { isActive: true }
    });
    console.log('   活跃记录数:', activeCount);
    
    // 5. 查看所有数据（包括非活跃的）
    console.log('\n4️⃣ 查看所有数据:');
    const allData = await prisma.paymentPackage.findMany();
    allData.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ID:${pkg.id} - ${pkg.name} - ¥${pkg.amount} - 活跃:${pkg.isActive}`);
    });
    
    // 6. 测试查询条件
    console.log('\n5️⃣ 测试查询条件:');
    const queryResult = await prisma.paymentPackage.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { isRecommended: 'desc' },
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });
    console.log('   查询结果数量:', queryResult.length);
    
    if (queryResult.length === 0) {
      console.log('   ❌ 查询返回空结果！');
      console.log('   🔍 检查isActive字段值:');
      const activeCheck = await prisma.$queryRaw`
        SELECT id, name, is_active, is_active = true as is_true 
        FROM payment_packages
      `;
      console.log('   isActive字段检查:', activeCheck);
    } else {
      console.log('   ✅ 查询返回正确数据');
      queryResult.forEach((pkg, index) => {
        console.log(`   ${index + 1}. ${pkg.name} - 推荐:${pkg.isRecommended} - 排序:${pkg.sortOrder}`);
      });
    }
    
    // 7. 检查环境变量
    console.log('\n6️⃣ 检查关键环境变量:');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'undefined');
    console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
    console.error('错误详情:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOnlineEnvironment();