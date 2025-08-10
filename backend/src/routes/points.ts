import { Router, Request, Response } from 'express';
import { PointService } from '../services/PointService';
import { ResponseUtils } from '../utils/response';
import { QuestionType } from '../types/points';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const pointService = new PointService();

// 所有积分路由都需要认证
router.use(authMiddleware);

/**
 * 获取用户积分余额
 * GET /api/points/balance
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return ResponseUtils.unauthorized(res, '用户未认证');
    }

    const points = await pointService.getUserPoints(userId);
    
    ResponseUtils.success(res, {
      points,
      message: '获取积分余额成功'
    });
  } catch (error) {
    console.error('获取积分余额失败:', error);
    ResponseUtils.internalError(res, '获取积分余额失败');
  }
});

/**
 * 充值积分
 * POST /api/points/recharge
 * Body: { amount: number, description?: string }
 */
router.post('/recharge', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return ResponseUtils.unauthorized(res, '用户未认证');
    }

    const { amount, description } = req.body;

    // 参数验证
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return ResponseUtils.error(res, '充值金额必须是大于0的数字');
    }

    if (amount > 10000) {
      return ResponseUtils.error(res, '单次充值金额不能超过10000积分');
    }

    const result = await pointService.rechargePoints(userId, amount, description);
    
    if (result.success) {
      ResponseUtils.success(res, {
        newBalance: result.newBalance,
        transactionId: result.transactionId,
        message: result.message
      });
    } else {
      ResponseUtils.error(res, result.message);
    }
  } catch (error) {
    console.error('充值积分失败:', error);
    ResponseUtils.internalError(res, '充值积分失败');
  }
});

/**
 * 获取积分交易记录
 * GET /api/points/transactions?limit=20&offset=0
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return ResponseUtils.unauthorized(res, '用户未认证');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await pointService.getUserTransactions(userId, limit, offset);
    
    ResponseUtils.success(res, {
      transactions,
      pagination: {
        limit,
        offset,
        total: transactions.length
      },
      message: '获取交易记录成功'
    });
  } catch (error) {
    console.error('获取交易记录失败:', error);
    ResponseUtils.internalError(res, '获取交易记录失败');
  }
});

/**
 * 预检查搜题成本
 * POST /api/points/check-cost
 * Body: { modelName: string, questionType: 'multiple_choice' | 'programming' }
 */
router.post('/check-cost', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return ResponseUtils.unauthorized(res, '用户未认证');
    }

    const { modelName, questionType } = req.body;

    // 参数验证
    if (!modelName || typeof modelName !== 'string') {
      return ResponseUtils.error(res, '模型名称不能为空');
    }

    if (!questionType || !Object.values(QuestionType).includes(questionType)) {
      return ResponseUtils.error(res, '题目类型无效');
    }

    const result = await pointService.checkSufficientPoints(userId, modelName, questionType);
    
    ResponseUtils.success(res, {
      sufficient: result.sufficient,
      currentPoints: result.currentPoints,
      requiredPoints: result.requiredPoints,
      canSearch: result.sufficient,
      message: result.message
    });
  } catch (error) {
    console.error('预检查搜题成本失败:', error);
    ResponseUtils.internalError(res, '预检查搜题成本失败');
  }
});

export default router; 