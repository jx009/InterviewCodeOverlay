#!/usr/bin/env node

/**
 * 数据库迁移脚本
 * 将本地数据库迁移到远程MySQL服务器
 * 
 * 目标服务器: 159.75.174.234:3306
 * 数据库: interview_coder
 * 用户: root
 * 密码: e123456@
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const REMOTE_CONFIG = {
  host: '159.75.174.234',
  port: 3306,
  user: 'root',
  password: 'e123456@',
  database: 'interview_coder',
  multipleStatements: true,
  connectTimeout: 15000
};

async function testConnection() {
  console.log('🔗 测试远程MySQL连接...');
  console.log(`Host: ${REMOTE_CONFIG.host}:${REMOTE_CONFIG.port}`);
  console.log(`User: ${REMOTE_CONFIG.user}`);
  console.log(`Database: ${REMOTE_CONFIG.database}`);
  
  try {
    // 先不指定数据库进行连接测试
    const testConfig = { ...REMOTE_CONFIG };
    delete testConfig.database;
    
    const connection = await mysql.createConnection(testConfig);
    console.log('✅ 成功连接到MySQL服务器');
    
    // 测试是否可以查看数据库
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('📊 可用数据库:', databases.map(db => Object.values(db)[0]).join(', '));
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    console.error('');
    console.error('可能的原因:');
    console.error('1. 服务器防火墙阻止外部连接');
    console.error('2. MySQL配置不允许远程连接');
    console.error('3. 网络连接问题');
    console.error('4. 用户名或密码错误');
    console.error('');
    console.error('解决方案:');
    console.error('1. 在服务器上直接运行SQL文件: mysql -u root -p < database-migration.sql');
    console.error('2. 配置MySQL允许远程连接');
    console.error('3. 检查防火墙设置');
    return false;
  }
}

async function executeMigration() {
  console.log('🚀 开始执行数据库迁移...');
  
  try {
    const connection = await mysql.createConnection(REMOTE_CONFIG);
    console.log('✅ 已连接到目标数据库');
    
    // 读取SQL迁移文件
    const sqlFile = path.join(__dirname, 'database-migration.sql');
    if (!fs.existsSync(sqlFile)) {
      throw new Error('迁移SQL文件不存在: ' + sqlFile);
    }
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    console.log('📄 已读取迁移SQL文件');
    
    // 执行SQL
    console.log('⏳ 正在执行数据库迁移...');
    await connection.query(sqlContent);
    console.log('✅ 数据库迁移执行完成');
    
    // 验证表是否创建成功
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📊 已创建 ${tables.length} 个表:`);
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    // 检查管理员用户是否创建
    const [users] = await connection.execute('SELECT username, role FROM users WHERE role = "admin"');
    if (users.length > 0) {
      console.log('👑 管理员用户:');
      users.forEach(user => {
        console.log(`  - ${user.username} (${user.role})`);
      });
    }
    
    await connection.end();
    console.log('🎉 数据库迁移完成!');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  }
}

async function updateLocalConfig() {
  console.log('🔧 更新本地配置文件...');
  
  const newDatabaseUrl = `mysql://root:e123456%40@159.75.174.234:3306/interview_coder`;
  
  // 更新 .env 文件
  const envFiles = ['.env', '.env.backup', '.env.example'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(__dirname, envFile);
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      
      // 更新DATABASE_URL
      content = content.replace(
        /DATABASE_URL="[^"]*"/g,
        `DATABASE_URL="${newDatabaseUrl}"`
      );
      
      fs.writeFileSync(envPath, content);
      console.log(`✅ 已更新 ${envFile}`);
    }
  }
  
  console.log('✅ 配置文件更新完成');
}

async function main() {
  console.log('=====================================================');
  console.log('🎯 InterviewCodeOverlay 数据库迁移工具');
  console.log('=====================================================');
  console.log('');
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'test':
        await testConnection();
        break;
        
      case 'migrate':
        const connected = await testConnection();
        if (connected) {
          await executeMigration();
          await updateLocalConfig();
        } else {
          console.log('');
          console.log('💡 提示: 如果无法远程连接，请在服务器上直接执行:');
          console.log('   mysql -u root -p interview_coder < database-migration.sql');
        }
        break;
        
      case 'config':
        await updateLocalConfig();
        break;
        
      default:
        console.log('用法:');
        console.log('  node migrate-to-remote-db.js test     - 测试数据库连接');
        console.log('  node migrate-to-remote-db.js migrate  - 执行完整迁移');
        console.log('  node migrate-to-remote-db.js config   - 只更新配置文件');
        console.log('');
        console.log('手动迁移步骤:');
        console.log('1. 将 database-migration.sql 文件复制到服务器');
        console.log('2. 在服务器上执行: mysql -u root -p < database-migration.sql');
        console.log('3. 运行: node migrate-to-remote-db.js config');
        break;
    }
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  }
}

main();