#!/usr/bin/env node

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
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

async function createInviteTables() {
  // 从环境变量读取数据库连接，如果没有则使用提供的连接
  const databaseUrl = process.env.DATABASE_URL;
  const config = parseDatabaseUrl(databaseUrl);
  
  try {
    console.log('🔧 连接到 MySQL 数据库...');
    
    // 连接数据库
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database
    });

    console.log('✅ 数据库连接成功');

    // 读取 SQL 文件
    const sqlContent = fs.readFileSync(path.join(__dirname, 'create_invite_tables.sql'), 'utf8');
    
    // 分割 SQL 语句
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log('🔧 开始创建邀请系统表...');
    
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        try {
          await connection.execute(trimmedStatement);
          console.log('✅ 执行成功:', trimmedStatement.split('\n')[0].substring(0, 50) + '...');
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️  字段已存在，跳过:', trimmedStatement.split('\n')[0].substring(0, 50) + '...');
          } else if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('⚠️  表已存在，跳过:', trimmedStatement.split('\n')[0].substring(0, 50) + '...');
          } else {
            throw error;
          }
        }
      }
    }
    
    // 验证表是否创建成功
    console.log('🔧 验证表结构...');
    
    const [tables] = await connection.execute("SHOW TABLES LIKE 'invite_%'");
    console.log('✅ 邀请系统表:', tables.map(row => Object.values(row)[0]));
    
    // 验证 users 表的新字段
    const [columns] = await connection.execute("SHOW COLUMNS FROM users LIKE 'invite%'");
    console.log('✅ users 表新增字段:', columns.map(row => row.Field));
    
    await connection.end();
    
    console.log('🎉 邀请系统表创建完成！');
    
  } catch (error) {
    console.error('❌ 创建邀请系统表失败:', error.message);
    process.exit(1);
  }
}

// 运行脚本
createInviteTables(); 