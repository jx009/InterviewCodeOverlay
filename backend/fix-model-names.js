const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixModelNames() {
  try {
    console.log('🔧 修复数据库中的模型名称为正确的API模型名称...');
    
    // 根据用户提供的模型列表更新配置
    const modelMapping = {
      'claude-3-5-sonnet-20241022': 'claude-sonnet-4-20250514', // 更新为用户列表中的模型
      'claude-sonnet-4-20250514': 'claude-sonnet-4-20250514', // 保持不变
      'claude-sonnet-4-20250514-thinking': 'claude-sonnet-4-20250514-thinking', // 保持不变
      'claude-opus-4-20250514-thinking': 'claude-opus-4-20250514-thinking', // 保持不变
      'gemini-2.5-flash-preview-04-17': 'gemini-2.5-flash-preview-04-17', // 保持不变
      'gemini-2.5-pro-preview-06-05': 'gemini-2.5-pro-preview-06-05', // 保持不变
      'chatgpt-4o-latest': 'chatgpt-4o-latest', // 保持不变
      'o3-mini': 'o3-mini' // 保持不变
    };
    
    const configs = await prisma.userConfig.findMany();
    
    for (const config of configs) {
      const updates = {};
      
      // 检查并更新 programmingModel
      if (config.programmingModel && modelMapping[config.programmingModel]) {
        updates.programmingModel = modelMapping[config.programmingModel];
      } else if (!config.programmingModel || /^\d+$/.test(config.programmingModel)) {
        // 如果是空或数字ID，设置默认值
        updates.programmingModel = 'claude-sonnet-4-20250514';
      }
      
      // 检查并更新 multipleChoiceModel  
      if (config.multipleChoiceModel && modelMapping[config.multipleChoiceModel]) {
        updates.multipleChoiceModel = modelMapping[config.multipleChoiceModel];
      } else if (!config.multipleChoiceModel || /^\d+$/.test(config.multipleChoiceModel)) {
        // 如果是空或数字ID，设置默认值
        updates.multipleChoiceModel = 'claude-sonnet-4-20250514';
      }
      
      // 检查并更新 aiModel
      if (config.aiModel && modelMapping[config.aiModel]) {
        updates.aiModel = modelMapping[config.aiModel];
      } else if (!config.aiModel || /^\d+$/.test(config.aiModel)) {
        // 如果是空或数字ID，设置默认值
        updates.aiModel = 'claude-sonnet-4-20250514';
      }
      
      // 执行更新
      if (Object.keys(updates).length > 0) {
        console.log(`\n更新用户 ${config.userId}:`);
        if (updates.programmingModel) {
          console.log(`  programmingModel: "${config.programmingModel}" -> "${updates.programmingModel}"`);
        }
        if (updates.multipleChoiceModel) {
          console.log(`  multipleChoiceModel: "${config.multipleChoiceModel}" -> "${updates.multipleChoiceModel}"`);
        }
        if (updates.aiModel) {
          console.log(`  aiModel: "${config.aiModel}" -> "${updates.aiModel}"`);
        }
        
        await prisma.userConfig.update({
          where: { id: config.id },
          data: updates
        });
        
        console.log(`  ✅ 已更新`);
      } else {
        console.log(`\n用户 ${config.userId}: 配置已是正确格式，无需更新`);
      }
    }
    
    console.log('\n📋 最终配置结果:');
    const finalConfigs = await prisma.userConfig.findMany({
      select: {
        userId: true,
        programmingModel: true,
        multipleChoiceModel: true,
        aiModel: true
      }
    });
    
    finalConfigs.forEach(config => {
      console.log(`用户 ${config.userId}:`);
      console.log(`  - programmingModel: "${config.programmingModel}"`);
      console.log(`  - multipleChoiceModel: "${config.multipleChoiceModel}"`);  
      console.log(`  - aiModel: "${config.aiModel}"`);
      console.log('');
    });
    
    console.log('🎉 所有模型名称已更新为正确的API模型名称！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixModelNames();