import { PrismaClient } from '@prisma/client';
import { QuestionType } from '../types/points';

const prisma = new PrismaClient();

// 默认模型积分配置
const defaultConfigs = [
  // GPT系列
  { modelName: 'gpt-4', questionType: QuestionType.MULTIPLE_CHOICE, cost: 2, description: 'GPT-4 处理选择题' },
  { modelName: 'gpt-4', questionType: QuestionType.PROGRAMMING, cost: 5, description: 'GPT-4 处理编程题' },
  { modelName: 'gpt-3.5-turbo', questionType: QuestionType.MULTIPLE_CHOICE, cost: 1, description: 'GPT-3.5 处理选择题' },
  { modelName: 'gpt-3.5-turbo', questionType: QuestionType.PROGRAMMING, cost: 3, description: 'GPT-3.5 处理编程题' },
  
  // Claude系列
  { modelName: 'claude-3-opus', questionType: QuestionType.MULTIPLE_CHOICE, cost: 3, description: 'Claude-3-Opus 处理选择题' },
  { modelName: 'claude-3-opus', questionType: QuestionType.PROGRAMMING, cost: 6, description: 'Claude-3-Opus 处理编程题' },
  { modelName: 'claude-3-sonnet', questionType: QuestionType.MULTIPLE_CHOICE, cost: 2, description: 'Claude-3-Sonnet 处理选择题' },
  { modelName: 'claude-3-sonnet', questionType: QuestionType.PROGRAMMING, cost: 4, description: 'Claude-3-Sonnet 处理编程题' },
  { modelName: 'claude-3-haiku', questionType: QuestionType.MULTIPLE_CHOICE, cost: 1, description: 'Claude-3-Haiku 处理选择题' },
  { modelName: 'claude-3-haiku', questionType: QuestionType.PROGRAMMING, cost: 2, description: 'Claude-3-Haiku 处理编程题' },
  
  // Claude 3.5系列
  { modelName: 'claude-3-5-sonnet-20241022', questionType: QuestionType.MULTIPLE_CHOICE, cost: 2, description: 'Claude-3.5-Sonnet 处理选择题' },
  { modelName: 'claude-3-5-sonnet-20241022', questionType: QuestionType.PROGRAMMING, cost: 4, description: 'Claude-3.5-Sonnet 处理编程题' },
  
  // Gemini系列
  { modelName: 'gemini-pro', questionType: QuestionType.MULTIPLE_CHOICE, cost: 2, description: 'Gemini-Pro 处理选择题' },
  { modelName: 'gemini-pro', questionType: QuestionType.PROGRAMMING, cost: 4, description: 'Gemini-Pro 处理编程题' },
  { modelName: 'gemini-1.5-pro', questionType: QuestionType.MULTIPLE_CHOICE, cost: 2, description: 'Gemini-1.5-Pro 处理选择题' },
  { modelName: 'gemini-1.5-pro', questionType: QuestionType.PROGRAMMING, cost: 4, description: 'Gemini-1.5-Pro 处理编程题' },
  
  // 其他常见模型
  { modelName: 'llama-2-70b', questionType: QuestionType.MULTIPLE_CHOICE, cost: 1, description: 'Llama-2-70B 处理选择题' },
  { modelName: 'llama-2-70b', questionType: QuestionType.PROGRAMMING, cost: 3, description: 'Llama-2-70B 处理编程题' },
];

async function initPointConfigs() {
  console.log('🚀 开始初始化积分配置...');
  
  try {
    // 检查是否已有配置
    const existingCount = await prisma.modelPointConfig.count();
    if (existingCount > 0) {
      console.log(`📊 已存在 ${existingCount} 个配置，跳过初始化`);
      return;
    }

    // 批量创建配置
    let successCount = 0;
    let errorCount = 0;

    for (const config of defaultConfigs) {
      try {
        await prisma.modelPointConfig.create({
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
        console.error(`❌ 创建配置失败: ${config.modelName} - ${config.questionType}`, error);
      }
    }

    console.log(`\n🎉 初始化完成!`);
    console.log(`✅ 成功创建: ${successCount} 个配置`);
    console.log(`❌ 失败: ${errorCount} 个配置`);
    
  } catch (error) {
    console.error('❌ 初始化积分配置失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initPointConfigs();
}

export { initPointConfigs }; 