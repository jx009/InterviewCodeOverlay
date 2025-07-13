require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('🔍 测试数据库连接...');
  console.log('📋 数据库配置:');
  console.log('  - Host: localhost');
  console.log('  - Port: 3306');
  console.log('  - User: root');
  console.log('  - Password: 123456');
  console.log('  - Database: interview_coder');
  console.log('  - DATABASE_URL:', process.env.DATABASE_URL);
  
  try {
    // 测试连接
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '123456',
      database: 'interview_coder'
    });
    
    console.log('✅ 数据库连接成功！');
    
    // 测试查询
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 查询测试成功:', rows);
    
    // 检查表是否存在
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 数据库表列表:');
    tables.forEach(table => {
      console.log('  -', Object.values(table)[0]);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    console.error('🔍 错误详情:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 可能的解决方案:');
      console.log('1. 确认MySQL服务正在运行');
      console.log('2. 检查端口3306是否正确');
      console.log('3. 验证用户名和密码是否正确');
      console.log('4. 确认数据库"interview_coder"已创建');
    }
  }
}

testConnection();