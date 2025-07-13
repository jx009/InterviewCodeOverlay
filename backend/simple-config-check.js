require('dotenv').config();

console.log('=== 当前环境变量 ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL || '未设置');
console.log('NODE_ENV:', process.env.NODE_ENV || '未设置');

// 检查.env文件内容
const fs = require('fs');
console.log('\n=== .env文件内容（DATABASE_URL行）===');
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const databaseLine = envContent.split('\n').find(line => line.includes('DATABASE_URL'));
  console.log(databaseLine || '未找到DATABASE_URL配置');
} catch (error) {
  console.log('无法读取.env文件:', error.message);
}

// 检查配置文件
console.log('\n=== 配置文件（database-config.json）===');
try {
  const configPath = './config/database-config.json';
  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(configContent);
  console.log('MySQL配置:');
  console.log('  主机:', config.mysql.host);
  console.log('  端口:', config.mysql.port);
  console.log('  用户名:', config.mysql.username);
  console.log('  密码:', '***' + (config.mysql.password || '').slice(-3));
  console.log('  数据库:', config.mysql.database);
} catch (error) {
  console.log('无法读取配置文件:', error.message);
} 