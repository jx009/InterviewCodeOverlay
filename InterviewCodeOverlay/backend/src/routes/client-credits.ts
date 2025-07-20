import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { validateRequest } from '../middleware/validation';
import { ResponseUtils } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 统一获取用户ID的中间件
const getUserId = (req: Request, res: Response, next: NextFunction) => {
  const userId = res.locals.userId;
  if (!userId) {
    return ResponseUtils.error(res, '未找到用户ID', 401);
  }
  req.userId = userId;
  next();
};

/**
 * 获取用户积分余额
 * GET /api/client/credits/balance
 */
router.get('/balance', 
  authMiddleware, 
  getUserId,
  async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { points: true }
      });

      if (!user) {
        return ResponseUtils.error(res, '用户不存在', 404);
      }

      ResponseUtils.success(res, { points: user.points });
    } catch (error) {
      console.error('获取积分余额失败:', error);
      ResponseUtils.internalError(res, '获取积分余额失败');
    }
  }
);

/**
 * 检查并扣除积分（合并操作，减少网络请求）
 * POST /api/client/credits/check-and-deduct
 * Body: { modelName: string, questionType: "multiple_choice" | "programming", operationId: string }
 */
router.post('/check-and-deduct', 
  authMiddleware, 
  getUserId,
  [
    body('modelName').notEmpty().withMessage('模型名称不能为空'),
    body('questionType').isIn(['multiple_choice', 'programming']).withMessage('题目类型必须是 multiple_choice 或 programming'),
    body('operationId').notEmpty().withMessage('操作ID不能为空'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      console.time('credits-check-and-deduct');
      const { modelName, questionType, operationId } = req.body;
      
      // 使用事务在一次数据库操作中完成检查和扣除
      try {
        // 使用事务
        const result = await prisma.$transaction(async (tx) => {
          // 1. 获取用户当前积分
          const user = await tx.user.findUnique({
            where: { id: req.userId },
            select: { points: true }
          });

          if (!user) {
            throw new Error('用户不存在');
          }

          // 2. 获取模型配置
          const config = await tx.modelPointConfig.findUnique({
            where: {
              unique_model_question_type: {
                modelName: modelName,
                questionType: questionType.toUpperCase() as any
              }
            }
          });
          
          if (!config) {
            throw new Error(`未找到模型 ${modelName} 的 ${questionType} 类型配置`);
          }

          // 3. 检查积分是否充足
          const sufficient = user.points >= config.cost;
          if (!sufficient) {
            return {
              success: false,
              sufficient: false,
              currentPoints: user.points,
              requiredPoints: config.cost,
              message: `积分不足。本次操作需要 ${config.cost} 积分，您当前拥有 ${user.points} 积分。`
            };
          }

          // 4. 扣除积分
          const newBalance = user.points - config.cost;
          await tx.user.update({
            where: { id: req.userId },
            data: { points: newBalance }
          });

          // 5. 记录交易
          const description = `搜题操作 [${operationId}]: 使用${modelName}模型处理${questionType === 'multiple_choice' ? '选择题' : '编程题'}`;
          const transaction = await tx.pointTransaction.create({
            data: {
              userId: req.userId,
              transactionType: 'CONSUME',
              amount: -config.cost,
              balanceAfter: newBalance,
              modelName,
              questionType: questionType.toUpperCase() as any,
              description,
            }
          });

          return {
            success: true,
            sufficient: true,
            currentPoints: user.points,
            newBalance,
            deductedAmount: config.cost,
            transactionId: transaction.id,
            operationId,
            message: `成功扣除 ${config.cost} 积分，余额: ${newBalance}`
          };
        });

        console.timeEnd('credits-check-and-deduct');
        
        if (result.success) {
          ResponseUtils.success(res, result);
        } else {
          ResponseUtils.error(res, result.message, 400);
        }
      } catch (txError) {
        console.error('检查和扣除积分事务失败:', txError);
        ResponseUtils.error(res, txError instanceof Error ? txError.message : '积分处理失败');
      }
    } catch (error) {
      console.error('检查并扣除积分失败:', error);
      ResponseUtils.internalError(res, '检查并扣除积分失败');
    }
  }
);

/**
 * 退款API - 处理操作失败时的积分退还
 * POST /api/client/credits/refund
 * Body: { operationId: string, amount?: number, reason: string }
 */
router.post('/refund', 
  authMiddleware,
  getUserId,
  [
    body('operationId').notEmpty().withMessage('操作ID不能为空'),
    body('reason').notEmpty().withMessage('退款原因不能为空'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const { operationId, amount, reason } = req.body;
      
      // 开始事务
      const result = await prisma.$transaction(async (tx) => {
        // 1. 查找相关交易记录
        const transaction = await tx.pointTransaction.findFirst({
          where: {
            description: { contains: operationId },
            transactionType: 'CONSUME',
            userId: req.userId
          }
        });
        
        if (!transaction) {
          return {
            success: false,
            message: `未找到操作ID为 ${operationId} 的交易记录`
          };
        }
        
        // 2. 查找用户
        const user = await tx.user.findUnique({
          where: { id: req.userId },
          select: { points: true }
        });
        
        if (!user) {
          return {
            success: false,
            message: '用户不存在'
          };
        }
        
        // 3. 计算退款金额
        const refundAmount = amount || Math.abs(transaction.amount);
        const newBalance = user.points + refundAmount;
        
        // 4. 更新用户积分
        await tx.user.update({
          where: { id: req.userId },
          data: { points: newBalance }
        });
        
        // 5. 创建退款交易记录
        const refundTransaction = await tx.pointTransaction.create({
          data: {
            userId: req.userId,
            transactionType: 'REFUND',
            amount: refundAmount,
            balanceAfter: newBalance,
            modelName: transaction.modelName,
            questionType: transaction.questionType,
            description: `退款 [${operationId}]: ${reason}`,
            relatedTransactionId: transaction.id
          }
        });
        
        return {
          success: true,
          refundAmount,
          newBalance,
          transactionId: refundTransaction.id,
          message: `成功退款 ${refundAmount} 积分，当前余额: ${newBalance}`
        };
      });
      
      if (result.success) {
        ResponseUtils.success(res, result);
      } else {
        ResponseUtils.error(res, result.message, 400);
      }
    } catch (error) {
      console.error('处理积分退款失败:', error);
      ResponseUtils.internalError(res, '处理积分退款失败');
    }
  }
);

export default router; 