import { PrismaClient } from '@prisma/client';
import { 
  QuestionType, 
  TransactionType, 
  PointCheckResult, 
  ConsumePointsResult, 
  ModelPointConfig 
} from '../types/points';

const prisma = new PrismaClient();

export class PointService {
  /**
   * 检查用户积分是否充足
   */
  async checkSufficientPoints(
    userId: number, 
    modelName: string, 
    questionType: QuestionType
  ): Promise<PointCheckResult> {
    try {
      // 获取用户当前积分
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { points: true }
      });

      if (!user) {
        return {
          sufficient: false,
          currentPoints: 0,
          requiredPoints: 0,
          message: '用户不存在'
        };
      }

      // 获取模型配置
      const config = await this.getModelConfig(modelName, questionType);
      if (!config) {
        return {
          sufficient: false,
          currentPoints: user.points,
          requiredPoints: 0,
          message: `未找到模型 ${modelName} 的 ${questionType} 类型配置`
        };
      }

      const sufficient = user.points >= config.cost;
      
      return {
        sufficient,
        currentPoints: user.points,
        requiredPoints: config.cost,
        message: sufficient 
          ? '积分充足' 
          : `积分不足。本次操作需要 ${config.cost} 积分，您当前拥有 ${user.points} 积分。`
      };
    } catch (error) {
      console.error('检查积分时出错:', error);
      return {
        sufficient: false,
        currentPoints: 0,
        requiredPoints: 0,
        message: '检查积分时发生错误'
      };
    }
  }

  /**
   * 消费积分（原子操作）
   */
  async consumePoints(
    userId: number, 
    modelName: string, 
    questionType: QuestionType,
    description?: string
  ): Promise<ConsumePointsResult> {
    try {
      // 使用事务确保原子性
      const result = await prisma.$transaction(async (tx) => {
        // 1. 获取用户当前积分（加锁）
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { points: true }
        });

        if (!user) {
          throw new Error('用户不存在');
        }

        // 2. 获取模型配置
        const config = await this.getModelConfig(modelName, questionType);
        if (!config) {
          throw new Error(`未找到模型 ${modelName} 的 ${questionType} 类型配置`);
        }

        // 3. 检查积分是否充足
        if (user.points < config.cost) {
          throw new Error(`积分不足。需要 ${config.cost} 积分，当前 ${user.points} 积分`);
        }

        // 4. 扣除积分
        const newBalance = user.points - config.cost;
        await tx.user.update({
          where: { id: userId },
          data: { points: newBalance }
        });

        // 5. 记录交易
        const transaction = await tx.pointTransaction.create({
          data: {
            userId,
            transactionType: TransactionType.CONSUME,
            amount: -config.cost,
            balanceAfter: newBalance,
            modelName,
            questionType,
            description: description || `使用 ${modelName} 处理 ${questionType} 类型题目`,
          }
        });

        return {
          success: true,
          newBalance,
          transactionId: transaction.id,
          message: `成功扣除 ${config.cost} 积分，余额: ${newBalance}`
        };
      });

      return result;
    } catch (error) {
      console.error('消费积分时出错:', error);
      return {
        success: false,
        newBalance: 0,
        transactionId: 0,
        message: error instanceof Error ? error.message : '消费积分时发生错误'
      };
    }
  }

  /**
   * 充值积分
   */
  async rechargePoints(
    userId: number, 
    amount: number, 
    description?: string
  ): Promise<ConsumePointsResult> {
    try {
      if (amount <= 0) {
        return {
          success: false,
          newBalance: 0,
          transactionId: 0,
          message: '充值金额必须大于0'
        };
      }

      const result = await prisma.$transaction(async (tx) => {
        // 获取用户当前积分
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { points: true }
        });

        if (!user) {
          throw new Error('用户不存在');
        }

        // 增加积分
        const newBalance = user.points + amount;
        await tx.user.update({
          where: { id: userId },
          data: { points: newBalance }
        });

        // 记录交易
        const transaction = await tx.pointTransaction.create({
          data: {
            userId,
            transactionType: TransactionType.RECHARGE,
            amount,
            balanceAfter: newBalance,
            description: description || `积分充值 +${amount}`,
          }
        });

        return {
          success: true,
          newBalance,
          transactionId: transaction.id,
          message: `成功充值 ${amount} 积分，余额: ${newBalance}`
        };
      });

      return result;
    } catch (error) {
      console.error('充值积分时出错:', error);
      return {
        success: false,
        newBalance: 0,
        transactionId: 0,
        message: error instanceof Error ? error.message : '充值积分时发生错误'
      };
    }
  }

  /**
   * 获取用户积分余额
   */
  async getUserPoints(userId: number): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { points: true }
      });
      return user?.points || 0;
    } catch (error) {
      console.error('获取用户积分时出错:', error);
      return 0;
    }
  }

  /**
   * 获取用户积分交易记录
   */
  async getUserTransactions(
    userId: number, 
    limit: number = 20, 
    offset: number = 0
  ) {
    try {
      return await prisma.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          transactionType: true,
          amount: true,
          balanceAfter: true,
          modelName: true,
          questionType: true,
          description: true,
          createdAt: true
        }
      });
    } catch (error) {
      console.error('获取交易记录时出错:', error);
      return [];
    }
  }

  /**
   * 获取模型积分配置
   */
  async getModelConfig(
    modelName: string, 
    questionType: QuestionType
  ): Promise<ModelPointConfig | null> {
    try {
      const config = await prisma.modelPointConfig.findUnique({
        where: {
          unique_model_question_type: {
            modelName,
            questionType
          }
        }
      });
      
      if (!config) return null;
      
      return {
        ...config,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString()
      };
    } catch (error) {
      console.error('获取模型配置时出错:', error);
      return null;
    }
  }

  /**
   * 获取所有模型配置
   */
  async getAllModelConfigs(): Promise<ModelPointConfig[]> {
    try {
      const configs = await prisma.modelPointConfig.findMany({
        orderBy: [
          { modelName: 'asc' },
          { questionType: 'asc' }
        ]
      });
      
      return configs.map(config => ({
        ...config,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error('获取所有模型配置时出错:', error);
      return [];
    }
  }

  /**
   * 创建或更新模型配置
   */
  async upsertModelConfig(
    modelName: string,
    questionType: QuestionType,
    cost: number,
    description?: string
  ) {
    try {
      const config = await prisma.modelPointConfig.upsert({
        where: {
          unique_model_question_type: {
            modelName,
            questionType
          }
        },
        update: {
          cost,
          description,
          updatedAt: new Date()
        },
        create: {
          modelName,
          questionType,
          cost,
          description,
          isActive: true
        }
      });

      return {
        success: true,
        config,
        message: '模型配置更新成功'
      };
    } catch (error) {
      console.error('更新模型配置时出错:', error);
      return {
        success: false,
        config: null,
        message: error instanceof Error ? error.message : '更新模型配置时发生错误'
      };
    }
  }

  /**
   * 删除模型配置
   */
  async deleteModelConfig(
    modelName: string,
    questionType: QuestionType
  ): Promise<boolean> {
    try {
      await prisma.modelPointConfig.delete({
        where: {
          unique_model_question_type: {
            modelName,
            questionType
          }
        }
      });
      return true;
    } catch (error) {
      console.error('删除模型配置时出错:', error);
      return false;
    }
  }

  /**
   * 退款积分（用于搜题失败等情况）
   */
  async refundPoints(
    userId: number,
    amount: number,
    description?: string
  ): Promise<ConsumePointsResult> {
    try {
      if (amount <= 0) {
        return {
          success: false,
          newBalance: 0,
          transactionId: 0,
          message: '退款金额必须大于0'
        };
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { points: true }
        });

        if (!user) {
          throw new Error('用户不存在');
        }

        const newBalance = user.points + amount;
        await tx.user.update({
          where: { id: userId },
          data: { points: newBalance }
        });

        const transaction = await tx.pointTransaction.create({
          data: {
            userId,
            transactionType: TransactionType.REFUND,
            amount,
            balanceAfter: newBalance,
            description: description || `积分退款 +${amount}`,
          }
        });

        return {
          success: true,
          newBalance,
          transactionId: transaction.id,
          message: `成功退款 ${amount} 积分，余额: ${newBalance}`
        };
      });

      return result;
    } catch (error) {
      console.error('退款积分时出错:', error);
      return {
        success: false,
        newBalance: 0,
        transactionId: 0,
        message: error instanceof Error ? error.message : '退款积分时发生错误'
      };
    }
  }

  /**
   * 获取积分统计信息（管理员用）
   */
  async getPointsStatistics() {
    try {
      const [
        totalUsers,
        totalPoints,
        totalTransactions,
        recentTransactions
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.aggregate({
          _sum: { points: true }
        }),
        prisma.pointTransaction.count(),
        prisma.pointTransaction.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { username: true }
            }
          }
        })
      ]);

      return {
        totalUsers,
        totalPoints: totalPoints._sum.points || 0,
        totalTransactions,
        recentTransactions
      };
    } catch (error) {
      console.error('获取积分统计时出错:', error);
      return {
        totalUsers: 0,
        totalPoints: 0,
        totalTransactions: 0,
        recentTransactions: []
      };
    }
  }

  /**
   * 清理三个月前的积分交易记录
   * 此方法应该由定时任务调用，例如每天凌晨执行一次
   */
  async cleanupOldTransactions(): Promise<{success: boolean, count: number}> {
    try {
      // 计算三个月前的时间
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      // 删除三个月前的记录
      const result = await prisma.pointTransaction.deleteMany({
        where: {
          createdAt: {
            lt: threeMonthsAgo
          }
        }
      });
      
      console.log(`已清理 ${result.count} 条三个月前的交易记录`);
      
      return {
        success: true,
        count: result.count
      };
    } catch (error) {
      console.error('清理旧交易记录时出错:', error);
      return {
        success: false,
        count: 0
      };
    }
  }
}

// 导出单例
export const pointService = new PointService(); 