const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 基本配置数据
const testConfigs = [
  { modelName: 'gpt-4', questionType: 'MULTIPLE_CHOICE', cost: 2, description: 'GPT-4 处理选择题' },
  { modelName: 'gpt-4', questionType: 'PROGRAMMING', cost: 5, description: 'GPT-4 处理编程题' },
  { modelName: 'gpt-3.5-turbo', questionType: 'MULTIPLE_CHOICE', cost: 1, description: 'GPT-3.5 处理选择题' },
  { modelName: 'gpt-3.5-turbo', questionType: 'PROGRAMMING', cost: 3, description: 'GPT-3.5 处理编程题' },
  { modelName: 'claude-3-sonnet', questionType: 'MULTIPLE_CHOICE', cost: 2, description: 'Claude-3-Sonnet 处理选择题' },
  { modelName: 'claude-3-sonnet', questionType: 'PROGRAMMING', cost: 4, description: 'Claude-3-Sonnet 处理编程题' },
];

async function createTestConfigs() {
  console.log('🚀 开始创建测试配置...');
  
  try {
    // 清理现有配置
    console.log('🧹 清理现有配置...');
    await prisma.modelPointConfig.deleteMany({});
    
    let successCount = 0;
    let errorCount = 0;

    for (const config of testConfigs) {
      try {
        const result = await prisma.modelPointConfig.create({
          data: {
            modelName: config.modelName,
            questionType: config.questionType,
            cost: config.cost,
            description: config.description,
            isActive: true
          }
        });
        successCount++;
        console.log(`✅ 创建配置: ${config.modelName} - ${config.questionType} (${config.cost}积分)`);
      } catch (error) {
        errorCount++;
        console.error(`❌ 创建配置失败: ${config.modelName} - ${config.questionType}`, error.message);
      }
    }

    console.log(`\n🎉 配置创建完成!`);
    console.log(`✅ 成功创建: ${successCount} 个配置`);
    console.log(`❌ 失败: ${errorCount} 个配置`);
    
    // 验证创建的配置
    console.log('\n📋 验证创建的配置:');
    const allConfigs = await prisma.modelPointConfig.findMany({
      orderBy: [
        { modelName: 'asc' },
        { questionType: 'asc' }
      ]
    });
    
    allConfigs.forEach(config => {
      console.log(`  - ${config.modelName} | ${config.questionType} | ${config.cost}积分 | ${config.isActive ? '启用' : '禁用'}`);
    });
    
  } catch (error) {
    console.error('❌ 创建配置时发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestConfigs(); 