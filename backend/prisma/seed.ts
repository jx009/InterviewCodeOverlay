import { PrismaClient } from '@prisma/client';
import { SUPPORTED_MODELS } from '../src/types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始种子数据初始化...');

  // 清理现有的AI模型数据
  await prisma.aIModel.deleteMany({});
  console.log('🧹 清理现有AI模型数据');

  // 插入AI模型数据
  const modelData = [];
  let priority = 100;

  // Claude模型
  for (const model of SUPPORTED_MODELS.claude) {
    modelData.push({
      modelId: model.id,
      name: model.name,
      provider: 'claude',
      category: model.category,
      isActive: true,
      priority: priority--
    });
  }

  // Gemini模型
  for (const model of SUPPORTED_MODELS.gemini) {
    modelData.push({
      modelId: model.id,
      name: model.name,
      provider: 'gemini',
      category: model.category,
      isActive: true,
      priority: priority--
    });
  }

  // OpenAI模型
  for (const model of SUPPORTED_MODELS.openai) {
    modelData.push({
      modelId: model.id,
      name: model.name,
      provider: 'openai',
      category: model.category,
      isActive: true,
      priority: priority--
    });
  }

  // 批量插入模型数据
  await prisma.aIModel.createMany({
    data: modelData
  });

  console.log(`✅ 已插入 ${modelData.length} 个AI模型`);

  // 统计各提供商的模型数量
  const stats = await prisma.aIModel.groupBy({
    by: ['provider'],
    _count: {
      provider: true
    }
  });

  console.log('📊 AI模型统计:');
  stats.forEach(stat => {
    console.log(`  - ${stat.provider}: ${stat._count.provider} 个模型`);
  });

  console.log('🎉 种子数据初始化完成!');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 