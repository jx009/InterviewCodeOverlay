require('dotenv').config();

console.log('=== 环境变量检查 ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('');

console.log('=== 配置文件检查 ===');
try {
  const configLoader = require('./src/config/config-loader').default;
  const config = configLoader.loadConfig();
  console.log('MySQL配置:', {
    host: config.mysql.host,
    port: config.mysql.port,
    username: config.mysql.username,
    password: config.mysql.password ? '***' + config.mysql.password.slice(-3) : 'undefined',
    database: config.mysql.database
  });
  
  console.log('');
  console.log('=== 实际连接字符串 ===');
  console.log('MySQL连接:', configLoader.getMySQLConnectionString());
  
} catch (error) {
  console.error('配置加载失败:', error.message);
}

console.log('');
console.log('=== Prisma配置检查 ===');
try {
  const { PrismaClient } = require('@prisma/client');
  console.log('Prisma连接字符串:', process.env.DATABASE_URL || '使用默认配置');
} catch (error) {
  console.error('Prisma检查失败:', error.message);
} 