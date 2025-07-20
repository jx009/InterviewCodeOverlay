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

async function fixMysqlAuth() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 环境变量未设置');
    process.exit(1);
  }

  const config = parseDatabaseUrl(databaseUrl);
  
  try {
    console.log('🔧 开始修复 MySQL 认证插件问题...');
    
    // 使用 root 用户连接（需要管理员权限）
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: 'root', // 使用 root 用户
      password: config.password // 假设使用相同密码，如果不同请修改
    });

    console.log('✅ 成功连接到MySQL服务器');

    // 修复用户认证插件
    console.log(`🔧 修复用户 "${config.username}" 的认证插件...`);
    
    // 方法1：修改现有用户的认证插件
    try {
      await connection.execute(
        `ALTER USER '${config.username}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${config.password}'`
      );
      console.log('✅ 成功修改用户认证插件为 mysql_native_password');
    } catch (error) {
      console.log('⚠️  用户可能不存在，尝试创建新用户...');
      
      // 方法2：创建新用户（如果不存在）
      await connection.execute(
        `CREATE USER IF NOT EXISTS '${config.username}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${config.password}'`
      );
      console.log('✅ 成功创建用户并设置认证插件');
    }

    // 确保数据库存在
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 "${config.database}" 已创建或已存在`);

    // 授权
    await connection.execute(`GRANT ALL PRIVILEGES ON \`${config.database}\`.* TO '${config.username}'@'localhost'`);
    await connection.execute('FLUSH PRIVILEGES');
    console.log('✅ 用户权限已设置');

    // 关闭连接
    await connection.end();
    
    console.log('🎉 MySQL 认证插件修复完成！');
    console.log('');
    console.log('现在可以尝试重新启动应用程序。');
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    console.log('');
    console.log('🔧 手动修复步骤：');
    console.log('1. 以 root 用户登录 MySQL:');
    console.log('   mysql -u root -p');
    console.log('');
    console.log('2. 执行以下 SQL 命令:');
    console.log(`   ALTER USER '${config.username}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${config.password}';`);
    console.log('   FLUSH PRIVILEGES;');
    console.log('');
    console.log('3. 退出 MySQL 并重新启动应用程序');
    process.exit(1);
  }
}

// 测试修复后的连接
async function testConnection() {
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
    
    console.log('✅ MySQL 数据库连接测试成功！');
    return true;
  } catch (error) {
    console.error('❌ MySQL 数据库连接测试失败:', error.message);
    return false;
  }
}

// 命令行参数处理
const command = process.argv[2];

switch (command) {
  case 'fix':
    fixMysqlAuth();
    break;
  case 'test':
    testConnection();
    break;
  default:
    console.log('MySQL 认证插件修复工具');
    console.log('');
    console.log('用法:');
    console.log('  node fix-mysql-auth.js fix   - 修复认证插件问题');
    console.log('  node fix-mysql-auth.js test  - 测试数据库连接');
    console.log('');
    console.log('问题说明:');
    console.log('MySQL 8.0 默认使用 caching_sha2_password 认证插件，');
    console.log('但某些客户端（包括 Prisma）可能不支持此插件。');
    console.log('此脚本将用户认证插件改为 mysql_native_password。');
    break;
} 