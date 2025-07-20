import express from 'express';
import { body, validationResult } from 'express-validator';
import { searchService } from '../services/SearchService';
import { QuestionType } from '../types/points';

const router = express.Router();

// 中间件：验证请求参数
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: '请求参数错误',
      details: errors.array()
    });
    return;
  }
  next();
};

// 中间件：提取用户ID
const getUserId = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const userId = req.headers['x-user-id'] || req.body.userId;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: '未提供用户ID'
    });
    return;
  }
  const parsedUserId = parseInt(userId as string);
  if (isNaN(parsedUserId)) {
    res.status(400).json({
      success: false,
      error: '用户ID格式错误'
    });
    return;
  }
  req.userId = parsedUserId;
  next();
};

/**
 * 预检查搜题成本
 * POST /api/search/check-cost
 */
router.post('/check-cost',
  [
    body('modelName').notEmpty().withMessage('模型名称不能为空'),
    body('questionType').isIn(['multiple_choice', 'programming']).withMessage('题目类型必须是 multiple_choice 或 programming'),
    validateRequest,
    getUserId
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const { modelName, questionType } = req.body;
      const result = await searchService.preCheckSearchCost(
        req.userId!,
        modelName,
        questionType as QuestionType
      );
      
      res.json(result);
    } catch (error) {
      console.error('预检查搜题成本失败:', error);
      res.status(500).json({
        success: false,
        error: '预检查搜题成本失败'
      });
    }
  }
);

/**
 * 执行搜题（集成积分扣除）
 * POST /api/search/execute
 */
router.post('/execute',
  [
    body('modelName').notEmpty().withMessage('模型名称不能为空'),
    body('questionType').isIn(['multiple_choice', 'programming']).withMessage('题目类型必须是 multiple_choice 或 programming'),
    body('query').notEmpty().withMessage('搜题内容不能为空'),
    body('metadata').optional().isObject(),
    validateRequest,
    getUserId
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const { modelName, questionType, query, metadata } = req.body;
      
      const result = await searchService.searchWithPointsCheck({
        userId: req.userId!,
        modelName,
        questionType: questionType as QuestionType,
        query,
        metadata
      });
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            searchResult: result.data,
            pointsInfo: {
              consumed: result.pointsConsumed,
              remaining: result.remainingPoints,
              transactionId: result.transactionId
            }
          },
          message: result.message
        });
      } else {
        // 积分不足或其他错误
        res.status(400).json({
          success: false,
          error: result.message,
          data: {
            remainingPoints: result.remainingPoints
          }
        });
      }
    } catch (error) {
      console.error('执行搜题失败:', error);
      res.status(500).json({
        success: false,
        error: '执行搜题失败'
      });
    }
  }
);

/**
 * 获取可用模型列表及成本
 * GET /api/search/models
 */
router.get('/models',
  async (req: express.Request, res: express.Response) => {
    try {
      const result = await searchService.getAvailableModels();
      res.json(result);
    } catch (error) {
      console.error('获取可用模型失败:', error);
      res.status(500).json({
        success: false,
        error: '获取可用模型失败'
      });
    }
  }
);

/**
 * 批量搜题（可选功能）
 * POST /api/search/batch
 */
router.post('/batch',
  [
    body('searches').isArray({ min: 1, max: 10 }).withMessage('搜题列表必须是1-10个元素的数组'),
    body('searches.*.modelName').notEmpty().withMessage('模型名称不能为空'),
    body('searches.*.questionType').isIn(['multiple_choice', 'programming']).withMessage('题目类型必须是 multiple_choice 或 programming'),
    body('searches.*.query').notEmpty().withMessage('搜题内容不能为空'),
    validateRequest,
    getUserId
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const { searches } = req.body;
      const results = [];
      
      // 串行执行搜题（避免并发问题）
      for (const search of searches) {
        const result = await searchService.searchWithPointsCheck({
          userId: req.userId!,
          modelName: search.modelName,
          questionType: search.questionType as QuestionType,
          query: search.query,
          metadata: search.metadata
        });
        
        results.push({
          query: search.query,
          result
        });
        
        // 如果某个搜题失败且是积分不足，停止后续搜题
        if (!result.success && result.message.includes('积分不足')) {
          break;
        }
      }
      
      res.json({
        success: true,
        data: {
          results,
          totalProcessed: results.length,
          totalRequested: searches.length
        },
        message: `批量搜题完成，处理了 ${results.length}/${searches.length} 个请求`
      });
    } catch (error) {
      console.error('批量搜题失败:', error);
      res.status(500).json({
        success: false,
        error: '批量搜题失败'
      });
    }
  }
);

// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      userId: number;
    }
  }
}

export default router; 