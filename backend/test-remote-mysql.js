#!/usr/bin/env node

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testRemoteConnection() {
  console.log('🔗 Testing connection to remote MySQL server...');
  console.log('HOST: 159.75.174.234:3306');
  console.log('USER: root');
  console.log('DATABASE: interview_coder');
  
  try {
    // First, try to connect without specifying database
    const connection = await mysql.createConnection({
      host: '159.75.174.234',
      port: 3306,
      user: 'root',
      password: 'e123456@',
      connectTimeout: 10000,
      acquireTimeout: 10000,
      timeout: 10000
    });

    console.log('✅ Successfully connected to MySQL server');

    // Check if database exists
    const [databases] = await connection.execute('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === 'interview_coder');
    
    if (!dbExists) {
      console.log('📝 Creating interview_coder database...');
      await connection.execute('CREATE DATABASE interview_coder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database interview_coder already exists');
    }

    // Switch to the database
    await connection.execute('USE interview_coder');
    
    // Check existing tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📊 Found ${tables.length} existing tables:`, tables.map(t => Object.values(t)[0]));

    await connection.end();
    console.log('🎉 Connection test completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    return false;
  }
}

testRemoteConnection().then(success => {
  process.exit(success ? 0 : 1);
});