const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('🔐 重置admin密码...');
    
    const password = 'admin123456';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log(`明文密码: ${password}`);
    console.log(`加密密码: ${hashedPassword}`);
    
    // 查找或创建admin用户
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        points: 1000,
        isActive: true
      },
      create: {
        username: 'admin',
        email: 'admin@interview-coder.com',
        password: hashedPassword,
        role: 'ADMIN',
        points: 1000,
        isActive: true
      }
    });
    
    console.log('✅ Admin用户信息:');
    console.log({
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role,
      points: adminUser.points,
      isActive: adminUser.isActive
    });
    
    // 创建用户配置（如果不存在）
    const userConfig = await prisma.userConfig.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: {
        userId: adminUser.id,
        language: 'python',
        theme: 'system'
      }
    });
    
    console.log('✅ Admin用户配置已创建/更新');
    
    // 验证密码
    const isValid = await bcrypt.compare(password, hashedPassword);
    console.log(`🔍 密码验证: ${isValid ? '✅ 正确' : '❌ 错误'}`);
    
    console.log('\n🎉 Admin密码重置完成!');
    console.log('现在可以使用以下凭据登录:');
    console.log(`用户名: admin`);
    console.log(`密码: admin123456`);
    
  } catch (error) {
    console.error('❌ 重置密码失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
resetAdminPassword();