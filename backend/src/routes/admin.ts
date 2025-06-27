import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ResponseUtils } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { PointService } from '../services/PointService';
import { QuestionType } from '../types/points';
import { SessionManager } from '../config/redis-simple';

const router = Router();
const prisma = new PrismaClient();
const pointService = new PointService();
const sessionManager = new SessionManager();

// Session认证中间件
const sessionAuthMiddleware = async (req: any, res: Response, next: any) => {
  try {
    const sessionId = req.headers['x-session-id'];
    
    if (!sessionId) {
      return ResponseUtils.unauthorized(res, '未提供会话ID');
    }

    const sessionValidation = await sessionManager.validateSession(sessionId);
    
    if (!sessionValidation.valid) {
      return ResponseUtils.unauthorized(res, '会话已过期或无效');
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: sessionValidation.userId },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true
      }
    });

    if (!user) {
      return ResponseUtils.unauthorized(res, '用户不存在');
    }

    if (!user.isActive) {
      return ResponseUtils.forbidden(res, '用户账户已被禁用');
    }

    // 将用户信息添加到请求对象
    req.user = { userId: user.id, username: user.username, email: user.email };
    next();
  } catch (error) {
    console.error('Session认证失败:', error);
    ResponseUtils.internalError(res, '认证服务异常');
  }
};

// 管理员权限检查中间件
const adminMiddleware = async (req: any, res: Response, next: any) => {
  try {
    const username = req.user?.username;
    
    if (!username) {
      return ResponseUtils.unauthorized(res, '用户未认证');
    }

    if (username !== 'admin') {
      return ResponseUtils.forbidden(res, '需要管理员权限');
    }

    next();
  } catch (error) {
    console.error('管理员权限检查失败:', error);
    ResponseUtils.internalError(res, '权限检查失败');
  }
};

// 应用认证和管理员权限中间件
router.use(sessionAuthMiddleware);
router.use(adminMiddleware);

/**
 * 获取系统统计信息
 * GET /api/admin/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // 获取用户统计
    const userCount = await prisma.user.count();
    
    // 获取最近注册用户
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true
      }
    });

    // 使用原生SQL查询积分统计
    const pointsStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as userCount,
        AVG(points) as avgPoints, 
        SUM(points) as totalPoints 
      FROM users 
      WHERE points IS NOT NULL
    ` as any[];

    const stats = pointsStats[0] || { userCount: 0, avgPoints: 0, totalPoints: 0 };

    ResponseUtils.success(res, {
      users: {
        total: userCount,
        averagePoints: Math.round(Number(stats.avgPoints) || 0),
        totalPoints: Number(stats.totalPoints) || 0,
        recent: recentUsers
      },
      message: '获取系统统计成功'
    });
  } catch (error) {
    console.error('获取系统统计失败:', error);
    ResponseUtils.internalError(res, '获取系统统计失败');
  }
});

/**
 * 获取用户列表
 * GET /api/admin/users?page=1&limit=20&search=keyword
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    // 构建搜索条件
    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } }
      ];
    }

    // 获取用户列表
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    // 使用原生SQL获取积分信息
    const userIds = users.map(u => u.id);
    const pointsData = await prisma.$queryRaw`
      SELECT id, points FROM users WHERE id IN (${userIds.join(',')})
    ` as any[];

    // 合并积分数据
    const usersWithPoints = users.map(user => {
      const pointsInfo = pointsData.find(p => p.id === user.id);
      return {
        ...user,
        points: pointsInfo?.points || 0
      };
    });

    ResponseUtils.success(res, {
      users: usersWithPoints,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      message: '获取用户列表成功'
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    ResponseUtils.internalError(res, '获取用户列表失败');
  }
});

/**
 * 更新用户状态
 * PUT /api/admin/users/:id/status
 * Body: { isActive: boolean }
 */
router.put('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { isActive } = req.body;

    if (isNaN(userId)) {
      return ResponseUtils.error(res, '用户ID无效');
    }

    if (typeof isActive !== 'boolean') {
      return ResponseUtils.error(res, '状态值必须是布尔类型');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true
      }
    });

    ResponseUtils.success(res, {
      user,
      message: `用户状态已${isActive ? '激活' : '禁用'}`
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    ResponseUtils.internalError(res, '更新用户状态失败');
  }
});

/**
 * 为用户充值积分
 * POST /api/admin/users/:id/recharge
 * Body: { amount: number, description?: string }
 */
router.post('/users/:id/recharge', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { amount, description } = req.body;
    const adminUserId = (req as any).user?.userId;

    if (isNaN(userId)) {
      return ResponseUtils.error(res, '用户ID无效');
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return ResponseUtils.error(res, '充值金额必须是大于0的数字');
    }

    // 使用原生SQL更新积分
    await prisma.$executeRaw`
      UPDATE users 
      SET points = points + ${amount} 
      WHERE id = ${userId}
    `;

    // 获取更新后的用户信息
    const updatedUser = await prisma.$queryRaw`
      SELECT id, username, email, points 
      FROM users 
      WHERE id = ${userId}
    ` as any[];

    if (updatedUser.length === 0) {
      return ResponseUtils.error(res, '用户不存在');
    }

    ResponseUtils.success(res, {
      user: updatedUser[0],
      message: `成功为用户充值 ${amount} 积分`
    });
  } catch (error) {
    console.error('管理员充值失败:', error);
    ResponseUtils.internalError(res, '管理员充值失败');
  }
});

/**
 * 获取系统健康状态
 * GET /api/admin/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // 检查数据库连接
    const dbCheck = await prisma.$queryRaw`SELECT 1 as status`;
    
    // 获取基本统计
    const userCount = await prisma.user.count();
    
    ResponseUtils.success(res, {
      database: 'connected',
      userCount,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      message: '系统健康状态正常'
    });
  } catch (error) {
    console.error('获取系统健康状态失败:', error);
    ResponseUtils.internalError(res, '获取系统健康状态失败');
  }
});

/**
 * 获取所有模型积分配置
 * GET /api/admin/model-configs
 */
router.get('/model-configs', async (req: Request, res: Response) => {
  try {
    const configs = await pointService.getAllModelConfigs();
    
    ResponseUtils.success(res, {
      configs,
      total: configs.length,
      message: '获取模型配置成功'
    });
  } catch (error) {
    console.error('获取模型配置失败:', error);
    ResponseUtils.internalError(res, '获取模型配置失败');
  }
});

/**
 * 创建或更新模型积分配置
 * PUT /api/admin/model-configs
 * Body: { modelName: string, questionType: QuestionType, cost: number, description?: string }
 */
router.put('/model-configs', async (req: Request, res: Response) => {
  try {
    const { modelName, questionType, cost, description } = req.body;

    // 参数验证
    if (!modelName || typeof modelName !== 'string') {
      return ResponseUtils.error(res, '模型名称不能为空');
    }

    if (!questionType || !Object.values(QuestionType).includes(questionType)) {
      return ResponseUtils.error(res, '题目类型无效');
    }

    if (!cost || typeof cost !== 'number' || cost <= 0) {
      return ResponseUtils.error(res, '积分消耗必须是大于0的数字');
    }

    const result = await pointService.upsertModelConfig(
      modelName,
      questionType,
      cost,
      description
    );

    if (result.success) {
      ResponseUtils.success(res, {
        config: result.config,
        message: result.message
      });
    } else {
      ResponseUtils.error(res, result.message);
    }
  } catch (error) {
    console.error('更新模型配置失败:', error);
    ResponseUtils.internalError(res, '更新模型配置失败');
  }
});

/**
 * 删除模型积分配置
 * DELETE /api/admin/model-configs
 * Body: { modelName: string, questionType: QuestionType }
 */
router.delete('/model-configs', async (req: Request, res: Response) => {
  try {
    const { modelName, questionType } = req.body;

    // 参数验证
    if (!modelName || typeof modelName !== 'string') {
      return ResponseUtils.error(res, '模型名称不能为空');
    }

    if (!questionType || !Object.values(QuestionType).includes(questionType)) {
      return ResponseUtils.error(res, '题目类型无效');
    }

    const success = await pointService.deleteModelConfig(modelName, questionType);

    if (success) {
      ResponseUtils.success(res, {
        message: '删除模型配置成功'
      });
    } else {
      ResponseUtils.error(res, '删除模型配置失败');
    }
  } catch (error) {
    console.error('删除模型配置失败:', error);
    ResponseUtils.internalError(res, '删除模型配置失败');
  }
});

/**
 * 批量更新模型积分配置
 * POST /api/admin/model-configs/batch
 * Body: { configs: Array<{modelName: string, questionType: QuestionType, cost: number, description?: string}> }
 */
router.post('/model-configs/batch', async (req: Request, res: Response) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return ResponseUtils.error(res, '配置列表不能为空');
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const config of configs) {
      try {
        const { modelName, questionType, cost, description } = config;

        // 参数验证
        if (!modelName || !questionType || !cost || cost <= 0) {
          errorCount++;
          results.push({
            modelName,
            questionType,
            success: false,
            error: '参数无效'
          });
          continue;
        }

        const result = await pointService.upsertModelConfig(
          modelName,
          questionType,
          cost,
          description
        );

        if (result.success) {
          successCount++;
          results.push({
            modelName,
            questionType,
            success: true,
            config: result.config
          });
        } else {
          errorCount++;
          results.push({
            modelName,
            questionType,
            success: false,
            error: result.message
          });
        }
      } catch (error) {
        errorCount++;
        results.push({
          modelName: config.modelName,
          questionType: config.questionType,
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    ResponseUtils.success(res, {
      results,
      summary: {
        total: configs.length,
        success: successCount,
        error: errorCount
      },
      message: `批量更新完成，成功: ${successCount}，失败: ${errorCount}`
    });
  } catch (error) {
    console.error('批量更新模型配置失败:', error);
    ResponseUtils.internalError(res, '批量更新模型配置失败');
  }
});

/**
 * 获取积分统计信息
 * GET /api/admin/points-stats
 */
router.get('/points-stats', async (req: Request, res: Response) => {
  try {
    const stats = await pointService.getPointsStatistics();
    
    ResponseUtils.success(res, {
      ...stats,
      message: '获取积分统计成功'
    });
  } catch (error) {
    console.error('获取积分统计失败:', error);
    ResponseUtils.internalError(res, '获取积分统计失败');
  }
});

export default router; 