const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllModels() {
  try {
    console.log('📋 检查所有用户配置中的模型字段...');
    
    const configs = await prisma.userConfig.findMany();
    
    for (const config of configs) {
      console.log(`\n用户 ${config.userId} (ID: ${config.id}):`);
      console.log(`  - programmingModel: "${config.programmingModel}"`);
      console.log(`  - multipleChoiceModel: "${config.multipleChoiceModel}"`);
      console.log(`  - aiModel: "${config.aiModel}"`);
      console.log(`  - extractionModel: "${config.extractionModel}"`);
      console.log(`  - solutionModel: "${config.solutionModel}"`);
      console.log(`  - debuggingModel: "${config.debuggingModel}"`);
      
      // 检查是否有数字ID
      const fields = [
        'programmingModel', 'multipleChoiceModel', 'aiModel', 
        'extractionModel', 'solutionModel', 'debuggingModel'
      ];
      
      const hasNumberId = fields.some(field => 
        config[field] && /^\d+$/.test(config[field])
      );
      
      if (hasNumberId) {
        console.log(`  ⚠️  检测到数字ID！`);
        
        // 修复所有数字ID
        const updates = {};
                 const idToModel = {
           '1': 'chatgpt-4o-latest',
           '2': 'claude-3-opus',
           '3': 'claude-3-sonnet', 
           '4': 'claude-sonnet-4-20250514',
           '5': 'gemini-2.5-pro-preview-06-05',
           '6': 'gemini-2.5-flash-preview-04-17',
           '7': 'gemini-2.5-flash-preview-04-17',
           '8': 'gemini-2.5-pro-preview-06-05',
           '9': 'gemini-2.5-pro-preview-06-05-thinking',
           '10': 'o3-mini'
         };
         
         // 强制修复所有用户的配置为一个稳定可用的模型
         const stableModel = 'gemini-2.5-flash-preview-04-17';
         updates = {
           programmingModel: stableModel,
           multipleChoiceModel: stableModel,
           aiModel: stableModel,
           extractionModel: stableModel,
           solutionModel: stableModel,
           debuggingModel: stableModel
         };
         console.log(`  🔄 强制统一所有配置为: ${stableModel}`);
        
        fields.forEach(field => {
          if (config[field] && /^\d+$/.test(config[field])) {
            const newValue = idToModel[config[field]] || 'claude-sonnet-4-20250514';
            updates[field] = newValue;
            console.log(`  🔄 修复 ${field}: "${config[field]}" -> "${newValue}"`);
          }
        });
        
        if (Object.keys(updates).length > 0) {
          await prisma.userConfig.update({
            where: { id: config.id },
            data: updates
          });
          console.log(`  ✅ 已修复`);
        }
      } else {
        console.log(`  ✅ 无数字ID`);
      }
    }
    
    console.log('\n🔍 修复后的配置:');
    const finalConfigs = await prisma.userConfig.findMany();
    
    finalConfigs.forEach(config => {
      console.log(`\n用户 ${config.userId}:`);
      console.log(`  - programmingModel: "${config.programmingModel}"`);
      console.log(`  - multipleChoiceModel: "${config.multipleChoiceModel}"`);
      console.log(`  - aiModel: "${config.aiModel}"`);
      console.log(`  - extractionModel: "${config.extractionModel}"`);
      console.log(`  - solutionModel: "${config.solutionModel}"`);
      console.log(`  - debuggingModel: "${config.debuggingModel}"`);
    });
    
    console.log('\n🎉 所有模型字段检查完成！');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllModels(); 