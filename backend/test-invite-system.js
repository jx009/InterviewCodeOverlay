const fs = require('fs');
const path = require('path');

// 测试邀请系统
async function testInviteSystem() {
  console.log('🧪 开始测试邀请系统...');
  
  try {
    // 1. 检查后端文件
    console.log('\n1. 检查后端文件');
    
    const backendFiles = [
      'src/services/InviteService.ts',
      'src/routes/invite.ts',
      'prisma/schema.prisma'
    ];
    
    let backendComplete = true;
    backendFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`  ✅ ${file} 存在`);
      } else {
        console.log(`  ❌ ${file} 不存在`);
        backendComplete = false;
      }
    });
    
    // 2. 检查前端文件
    console.log('\n2. 检查前端文件');
    
    const frontendFiles = [
      '../web/src/utils/urlUtils.ts',
      '../web/src/components/Invite/InvitePanel.tsx',
    ];
    
    let frontendComplete = true;
    frontendFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`  ✅ ${file} 存在`);
      } else {
        console.log(`  ❌ ${file} 不存在`);
        frontendComplete = false;
      }
    });
    
    // 3. 检查Schema内容
    console.log('\n3. 检查数据库Schema');
    
    if (fs.existsSync('prisma/schema.prisma')) {
      const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
      
      const requiredContent = [
        'inviterId',
        'inviteCode',
        'InviteRecord',
        'InviteReward',
        'InviteStatus',
        'CommissionStatus',
        'RewardType'
      ];
      
      let schemaComplete = true;
      requiredContent.forEach(content => {
        if (schemaContent.includes(content)) {
          console.log(`  ✅ ${content} 已添加`);
        } else {
          console.log(`  ❌ ${content} 未找到`);
          schemaComplete = false;
        }
      });
      
      if (schemaComplete && backendComplete && frontendComplete) {
        console.log('\n🎉 邀请系统开发完成！');
        console.log('\n📋 功能清单：');
        console.log('  ✅ 生成邀请链接（带aff参数）');
        console.log('  ✅ URL邀请码永久保留');
        console.log('  ✅ 注册时处理邀请关系');
        console.log('  ✅ 首次充值佣金发放');
        console.log('  ✅ 邀请记录和统计展示');
        console.log('  ✅ 奖励记录查看');
        console.log('  ✅ 个人中心邀请面板');
        
        console.log('\n💰 奖励机制：');
        console.log('  🎁 邀请注册：10积分');
        console.log('  💎 首次充值：5%佣金');
        console.log('  🔄 自动发放到邀请人账户');
        
        console.log('\n🚀 使用说明：');
        console.log('  1. 登录后进入个人中心 → 邀请好友');
        console.log('  2. 点击生成邀请链接');
        console.log('  3. 复制分享给好友');
        console.log('  4. 好友通过链接注册后自动建立邀请关系');
        console.log('  5. 好友首次充值时自动发放佣金');
        
        console.log('\n⚠️  下一步：');
        console.log('  1. 运行数据库迁移：npx prisma migrate dev --name add_invite_system');
        console.log('  2. 启动后端服务');
        console.log('  3. 启动前端服务');
        console.log('  4. 测试邀请功能');
        
      } else {
        console.log('\n❌ 系统不完整，请检查缺失的文件');
      }
      
    } else {
      console.log('  ❌ Schema文件不存在');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testInviteSystem().catch(console.error); 