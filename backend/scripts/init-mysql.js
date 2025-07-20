#!/usr/bin/env node

const mysql = require('mysql2/promise');
require('dotenv').config();

// 解析数据库URL
function parseDatabaseUrl(url) {
  const matches = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!matches) {
    throw new Error('Invalid DATABASE_URL format');
  }
  
  return {
    username: matches[1],
    password: matches[2],
    host: matches[3],
    port: parseInt(matches[4]),
    database: matches[5]
  };
}

async function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 环境变量未设置');
    process.exit(1);
  }

  const config = parseDatabaseUrl(databaseUrl);
  
  try {
    // 连接MySQL（不指定数据库）
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password
    });

    console.log('✅ 成功连接到MySQL服务器');

    // 创建数据库（如果不存在）
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 "${config.database}" 已创建或已存在`);

    // 关闭连接
    await connection.end();
    
    console.log('🎉 MySQL数据库初始化完成');
    console.log('');
    console.log('下一步：');
    console.log('1. 运行 npm run generate 生成Prisma客户端');
    console.log('2. 运行 npm run migrate 创建数据表');
    console.log('3. 运行 npm run dev 启动开发服务');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  }
}

// 检查MySQL连接
async function checkMysqlConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 环境变量未设置');
    return false;
  }

  const config = parseDatabaseUrl(databaseUrl);

  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database
    });

    await connection.execute('SELECT 1');
    await connection.end();
    
    console.log('✅ MySQL数据库连接正常');
    return true;
  } catch (error) {
    console.error('❌ MySQL数据库连接失败:', error.message);
    return false;
  }
}

// 命令行参数处理
const command = process.argv[2];

switch (command) {
  case 'init':
    initializeDatabase();
    break;
  case 'check':
    checkMysqlConnection();
    break;
  default:
    console.log('用法:');
    console.log('  node scripts/init-mysql.js init   - 初始化数据库');
    console.log('  node scripts/init-mysql.js check  - 检查数据库连接');
    break;
} 