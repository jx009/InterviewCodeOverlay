import { pointService } from './PointService';
import { QuestionType } from '../types/points';

export interface SearchRequest {
  userId: number;
  modelName: string;
  questionType: QuestionType;
  query: string;
  metadata?: any;
}

export interface SearchResult {
  success: boolean;
  data?: any;
  message: string;
  pointsConsumed?: number;
  remainingPoints?: number;
  transactionId?: number;
}

export class SearchService {
  /**
   * 执行搜题（集成积分检查和扣除）
   */
  async searchWithPointsCheck(request: SearchRequest): Promise<SearchResult> {
    const { userId, modelName, questionType, query, metadata } = request;
    
    try {
      // 1. 检查积分是否充足
      console.log(`🔍 检查积分: 用户${userId}, 模型${modelName}, 类型${questionType}`);
      const pointCheck = await pointService.checkSufficientPoints(userId, modelName, questionType);
      
      if (!pointCheck.sufficient) {
        return {
          success: false,
          message: pointCheck.message,
          remainingPoints: pointCheck.currentPoints
        };
      }

      // 2. 扣除积分
      console.log(`💰 扣除积分: ${pointCheck.requiredPoints}积分`);
      const consumeResult = await pointService.consumePoints(
        userId, 
        modelName, 
        questionType,
        `搜题: ${query.substring(0, 50)}...`
      );

      if (!consumeResult.success) {
        return {
          success: false,
          message: consumeResult.message,
          remainingPoints: pointCheck.currentPoints
        };
      }

      // 3. 执行实际搜题逻辑
      console.log(`🚀 开始搜题: ${modelName}`);
      let searchResult;
      try {
        searchResult = await this.performActualSearch(modelName, questionType, query, metadata);
      } catch (searchError) {
        // 搜题失败，退款积分
        console.error('🔥 搜题失败，开始退款:', searchError);
        const refundResult = await pointService.refundPoints(
          userId,
          pointCheck.requiredPoints,
          `搜题失败退款: ${searchError instanceof Error ? searchError.message : '未知错误'}`
        );
        
        return {
          success: false,
          message: `搜题失败: ${searchError instanceof Error ? searchError.message : '未知错误'}${refundResult.success ? '，积分已退还' : ''}`,
          remainingPoints: refundResult.success ? refundResult.newBalance : consumeResult.newBalance
        };
      }

      // 4. 返回成功结果
      return {
        success: true,
        data: searchResult,
        message: '搜题成功',
        pointsConsumed: pointCheck.requiredPoints,
        remainingPoints: consumeResult.newBalance,
        transactionId: consumeResult.transactionId
      };

    } catch (error) {
      console.error('搜题服务错误:', error);
      return {
        success: false,
        message: '搜题服务出现错误',
        remainingPoints: 0
      };
    }
  }

  /**
   * 执行实际的搜题逻辑
   * 这个方法应该调用具体的AI模型进行搜题
   */
  private async performActualSearch(
    modelName: string, 
    questionType: QuestionType, 
    query: string, 
    metadata?: any
  ): Promise<any> {
    // 模拟搜题过程
    console.log(`🤖 使用模型 ${modelName} 处理 ${questionType} 类型题目`);
    console.log(`📝 题目内容: ${query}`);
    
    // 这里应该集成实际的AI模型调用逻辑
    // 例如调用OpenAI、Claude、Gemini等API
    
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 模拟不同类型题目的处理结果
    if (questionType === QuestionType.MULTIPLE_CHOICE) {
      return {
        type: 'multiple_choice',
        answer: 'A',
        explanation: `这是使用 ${modelName} 分析的选择题答案和解释...`,
        confidence: 0.95,
        processingTime: '1.2s'
      };
    } else {
      return {
        type: 'programming',
        solution: `// 使用 ${modelName} 生成的代码解决方案\nfunction solution() {\n  // 实现逻辑\n  return result;\n}`,
        explanation: `这是使用 ${modelName} 分析的编程题解决方案...`,
        complexity: 'O(n)',
        processingTime: '2.1s'
      };
    }
  }

  /**
   * 预检查搜题成本（不扣除积分）
   */
  async preCheckSearchCost(
    userId: number, 
    modelName: string, 
    questionType: QuestionType
  ) {
    try {
      const pointCheck = await pointService.checkSufficientPoints(userId, modelName, questionType);
      return {
        success: true,
        data: {
          sufficient: pointCheck.sufficient,
          currentPoints: pointCheck.currentPoints,
          requiredPoints: pointCheck.requiredPoints,
          canSearch: pointCheck.sufficient
        },
        message: pointCheck.message
      };
    } catch (error) {
      console.error('预检查搜题成本失败:', error);
      return {
        success: false,
        message: '预检查搜题成本失败'
      };
    }
  }

  /**
   * 获取可用的模型列表及其成本
   */
  async getAvailableModels() {
    try {
      const configs = await pointService.getAllModelConfigs();
      
      // 按模型分组
      const modelGroups: { [key: string]: any } = {};
      
      configs.forEach(config => {
        if (!modelGroups[config.modelName]) {
          modelGroups[config.modelName] = {
            modelName: config.modelName,
            costs: {}
          };
        }
        modelGroups[config.modelName].costs[config.questionType] = config.cost;
      });

      return {
        success: true,
        data: Object.values(modelGroups),
        message: '获取可用模型成功'
      };
    } catch (error) {
      console.error('获取可用模型失败:', error);
      return {
        success: false,
        message: '获取可用模型失败'
      };
    }
  }
}

// 导出单例
export const searchService = new SearchService(); 