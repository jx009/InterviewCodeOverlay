const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndFixConfig() {
  try {
    console.log('📋 查看当前数据库中的模型配置...');
    
    const configs = await prisma.userConfig.findMany({
      select: {
        id: true,
        userId: true,
        programmingModel: true,
        multipleChoiceModel: true,
        aiModel: true
      }
    });
    
    console.log(`发现 ${configs.length} 个用户配置:`);
    
    for (const config of configs) {
      console.log(`\n用户 ${config.userId} (ID: ${config.id}):`);
      console.log(`  - programmingModel: "${config.programmingModel}"`);
      console.log(`  - multipleChoiceModel: "${config.multipleChoiceModel}"`);
      console.log(`  - aiModel: "${config.aiModel}"`);
      
      // 检查是否需要修复（如果是数字ID）
      const needsFix = (
        /^\d+$/.test(config.programmingModel) || 
        /^\d+$/.test(config.multipleChoiceModel) ||
        /^\d+$/.test(config.aiModel)
      );
      
      if (needsFix) {
        console.log(`  ⚠️  检测到数字ID，需要修复！`);
        
        // ID到模型名称的映射
        const idToModel = {
          '1': 'claude-sonnet-4-20250514-thinking',
          '2': 'claude-opus-4-20250514-thinking',
          '3': 'claude-sonnet-4-20250514',
          '4': 'gemini-2.5-flash-preview-04-17-thinking',
          '5': 'gemini-2.5-flash-preview-04-17',
          '6': 'gemini-2.5-pro-preview-06-05',
          '7': 'gemini-2.5-pro-preview-06-05-thinking',
          '8': 'chatgpt-4o-latest',
          '9': 'o3-mini'
        };
        
        const updates = {};
        
        if (/^\d+$/.test(config.programmingModel)) {
          updates.programmingModel = idToModel[config.programmingModel] || 'claude-sonnet-4-20250514';
          console.log(`  🔄 修复 programmingModel: "${config.programmingModel}" -> "${updates.programmingModel}"`);
        }
        
        if (/^\d+$/.test(config.multipleChoiceModel)) {
          updates.multipleChoiceModel = idToModel[config.multipleChoiceModel] || 'claude-sonnet-4-20250514';
          console.log(`  🔄 修复 multipleChoiceModel: "${config.multipleChoiceModel}" -> "${updates.multipleChoiceModel}"`);
        }
        
        if (/^\d+$/.test(config.aiModel)) {
          updates.aiModel = idToModel[config.aiModel] || 'claude-sonnet-4-20250514';
          console.log(`  🔄 修复 aiModel: "${config.aiModel}" -> "${updates.aiModel}"`);
        }
        
        // 执行更新
        if (Object.keys(updates).length > 0) {
          await prisma.userConfig.update({
            where: { id: config.id },
            data: updates
          });
          console.log(`  ✅ 用户 ${config.userId} 的配置已修复`);
        }
      } else {
        console.log(`  ✅ 配置正常，无需修复`);
      }
    }
    
    console.log('\n🎉 检查和修复完成！');
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixConfig(); 