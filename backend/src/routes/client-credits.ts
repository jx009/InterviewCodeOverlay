import { Router, Request, Response } from 'express';
import { PointService } from '../services/PointService';
import { ResponseUtils } from '../utils/response';
import { QuestionType } from '../types/points';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { PrismaClient } from '@prisma/client';
import { SessionManager } from '../config/redis-simple';

const router = Router();
const pointService = new PointService();
const prisma = new PrismaClient();
const sessionManager = new SessionManager();

// 统一获取用户ID的中间件 - 支持JWT和Session两种认证方式
const getUserId = async (req: Request, res: Response, next: Function) => {
  try {
    // 首先尝试从JWT认证获取用户ID
    if ((req as any).user?.userId) {
      (req as any).userId = (req as any).user.userId;
      return next();
    }

    // 如果JWT认证失败，尝试Session认证
    const sessionId = req.headers['x-session-id'] as string;
    if (sessionId) {
      const sessionValidation = await sessionManager.validateSession(sessionId);
      if (sessionValidation.valid && sessionValidation.userId) {
        (req as any).userId = sessionValidation.userId;
        return next();
      }
    }

    // 两种认证都失败
    return ResponseUtils.unauthorized(res, '用户未认证');
  } catch (error) {
    console.error('认证中间件错误:', error);
    return ResponseUtils.unauthorized(res, '认证失败');
  }
};

/**
 * 获取用户积分余额
 * GET /api/client/credits
 */
router.get('/', authMiddleware, getUserId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return ResponseUtils.unauthorized(res, '用户ID无效');
    }
    
    const points = await pointService.getUserPoints(userId);
    
    ResponseUtils.success(res, {
      credits: points,
      message: '获取积分余额成功'
    });
  } catch (error) {
    console.error('获取积分余额失败:', error);
    ResponseUtils.internalError(res, '获取积分余额失败');
  }
});

/**
 * 检查积分是否足够
 * POST /api/client/credits/check
 * Body: { modelName: string, questionType: "multiple_choice" | "programming" }
 */
router.post('/check', 
  authMiddleware, 
  getUserId,
  [
    body('modelName').notEmpty().withMessage('模型名称不能为空'),
    body('questionType').isIn(['multiple_choice', 'programming']).withMessage('题目类型必须是 multiple_choice 或 programming'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return ResponseUtils.unauthorized(res, '用户ID无效');
      }
      
      const { modelName, questionType } = req.body;
      
      const result = await pointService.checkSufficientPoints(
        userId, 
        modelName, 
        questionType.toUpperCase() as QuestionType
      );
      
      ResponseUtils.success(res, {
        sufficient: result.sufficient,
        currentCredits: result.currentPoints,
        requiredCredits: result.requiredPoints,
        message: result.message
      });
    } catch (error) {
      console.error('检查积分失败:', error);
      ResponseUtils.internalError(res, '检查积分失败');
    }
  }
);

/**
 * 扣除积分
 * POST /api/client/credits/deduct
 * Body: { modelName: string, questionType: "multiple_choice" | "programming", operationId: string }
 */
router.post('/deduct', 
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
      const userId = (req as any).userId;
      if (!userId) {
        return ResponseUtils.unauthorized(res, '用户ID无效');
      }
      
      const { modelName, questionType, operationId } = req.body;
      
      // 描述信息增加操作ID，方便追踪
      const description = `搜题操作 [${operationId}]: 使用${modelName}模型处理${questionType === 'multiple_choice' ? '选择题' : '编程题'}`;
      
      const result = await pointService.consumePoints(
        userId, 
        modelName, 
        questionType.toUpperCase() as QuestionType,
        description
      );
      
      if (result.success) {
        ResponseUtils.success(res, {
          success: true,
          newCredits: result.newBalance,
          transactionId: result.transactionId,
          operationId,
          message: result.message
        });
      } else {
        ResponseUtils.error(res, result.message);
      }
    } catch (error) {
      console.error('扣除积分失败:', error);
      ResponseUtils.internalError(res, '扣除积分失败');
    }
  }
);

/**
 * 退款积分
 * POST /api/client/credits/refund
 * Body: { amount: number, operationId: string, reason: string }
 */
router.post('/refund', 
  authMiddleware, 
  getUserId,
  [
    body('amount').isInt({ min: 1 }).withMessage('退款积分必须大于0'),
    body('operationId').notEmpty().withMessage('操作ID不能为空'),
    body('reason').notEmpty().withMessage('退款原因不能为空'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return ResponseUtils.unauthorized(res, '用户ID无效');
      }
      
      const { amount, operationId, reason } = req.body;
      
      // 描述增加操作ID便于追踪
      const description = `搜题退款 [${operationId}]: ${reason}`;
      
      const result = await pointService.refundPoints(
        userId, 
        amount,
        description
      );
      
      if (result.success) {
        ResponseUtils.success(res, {
          success: true,
          newCredits: result.newBalance,
          transactionId: result.transactionId,
          message: `成功退款 ${amount} 积分，当前余额: ${result.newBalance}`
        });
      } else {
        ResponseUtils.error(res, result.message);
      }
    } catch (error) {
      console.error('退款失败:', error);
      ResponseUtils.internalError(res, '退款失败');
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
      const userId = (req as any).userId;
      if (!userId) {
        return ResponseUtils.unauthorized(res, '用户ID无效');
      }
      
      console.time('credits-check-and-deduct');
      const { modelName, questionType, operationId } = req.body;
      
      // 使用事务在一次数据库操作中完成检查和扣除
      try {
        // 使用PointService中的方法，通过扩展
        const result = await prisma.$transaction(async (tx) => {
          // 1. 获取用户当前积分
          const user = await tx.user.findUnique({
            where: { id: userId },
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
            where: { id: userId },
            data: { points: newBalance }
          });

          // 5. 记录交易
          const description = `搜题操作 [${operationId}]: 使用${modelName}模型处理${questionType === 'multiple_choice' ? '选择题' : '编程题'}`;
          const transaction = await tx.pointTransaction.create({
            data: {
              userId: userId,
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
 * 获取用户积分交易记录
 * GET /api/client/credits/transactions?limit=20&offset=0
 */
router.get('/transactions', 
  authMiddleware, 
  getUserId,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return ResponseUtils.unauthorized(res, '用户ID无效');
      }
      
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await pointService.getUserTransactions(userId, limit, offset);
      
      // 格式化交易记录以匹配前端期望
      const formattedTransactions = transactions.map((tx: any) => ({
        id: tx.id,
        type: tx.transactionType, // 使用 type 字段
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        modelName: tx.modelName,
        questionType: tx.questionType,
        description: tx.description,
        displayText: tx.displayText || tx.description, // 使用 displayText 或回退到 description
        createdAt: tx.createdAt
      }));
      
      // 获取总数用于分页（简单估算）
      const hasMore = transactions.length === limit;
      const totalPages = hasMore ? Math.ceil((offset + limit + 1) / limit) : Math.ceil((offset + transactions.length) / limit);
      
      ResponseUtils.success(res, {
        transactions: formattedTransactions,
        pagination: {
          currentPage: Math.floor(offset / limit) + 1,
          totalPages,
          limit,
          offset,
          total: offset + transactions.length + (hasMore ? 1 : 0) // 估算总数
        },
        message: '获取交易记录成功'
      });
    } catch (error) {
      console.error('获取交易记录失败:', error);
      ResponseUtils.internalError(res, '获取交易记录失败');
    }
  }
);

export default router; 