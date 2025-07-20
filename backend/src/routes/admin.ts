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
let sessionManager: SessionManager;

// Session认证中间件
const sessionAuthMiddleware = async (req: any, res: Response, next: any) => {
  try {
    const sessionId = req.headers['x-session-id'];
    
    if (!sessionId) {
      return ResponseUtils.unauthorized(res, '未提供会话ID');
    }

    // 延迟初始化SessionManager
    if (!sessionManager) {
      sessionManager = new SessionManager();
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
    const userId = req.user?.userId;
    
    if (!userId) {
      return ResponseUtils.unauthorized(res, '用户未认证');
    }

    // 查询用户角色
    const user = await prisma.user.findUnique({
      where: { id: userId }
    }) as any;

    if (!user) {
      return ResponseUtils.unauthorized(res, '用户不存在');
    }

    if (user.role !== 'ADMIN') {
      return ResponseUtils.forbidden(res, '需要管理员权限');
    }

    console.log(`✅ 管理员权限验证成功: ${user.username} (角色: ${user.role})`);
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
    console.log('🔍 获取用户列表...');
    
    const users = await prisma.user.findMany({
      orderBy: [
        { createdAt: 'desc' } // 创建时间倒序
      ]
    }) as any;

    console.log(`✅ 获取用户列表成功，共 ${users.length} 个用户`);

    ResponseUtils.success(res, {
      users,
      total: users.length
    }, '获取用户列表成功');
  } catch (error) {
    console.error('❌ 获取用户列表失败:', error);
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

// 更新用户角色 (管理员权限)
router.put('/users/role', async (req: any, res: Response) => {
  try {
    const { userId, role } = req.body;
    const currentUserId = req.user?.userId;

    console.log('🔄 更新用户角色:', { userId, role, currentUserId });

    // 验证输入
    if (!userId || !role) {
      return ResponseUtils.error(res, '用户ID和角色不能为空', 400);
    }

    if (!['USER', 'ADMIN'].includes(role)) {
      return ResponseUtils.error(res, '角色必须是 USER 或 ADMIN', 400);
    }

    // 防止用户修改自己的角色
    if (parseInt(userId) === currentUserId) {
      return ResponseUtils.forbidden(res, '不能修改自己的角色');
    }

    // 查询目标用户
    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    }) as any;

    if (!targetUser) {
      return ResponseUtils.notFound(res, '目标用户不存在');
    }

    // 检查是否是最后一个管理员
    if (targetUser.role === 'ADMIN' && role === 'USER') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' } as any
      });

      if (adminCount <= 1) {
        return ResponseUtils.forbidden(res, '系统至少需要保留一个管理员账号');
      }
    }

    // 更新用户角色
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { role: role as any }
    }) as any;

    console.log(`✅ 用户角色更新成功: ${updatedUser.username} -> ${role}`);

    ResponseUtils.success(res, {
      user: updatedUser
    }, `用户 ${updatedUser.username} 的角色已更新为 ${role === 'ADMIN' ? '管理员' : '普通用户'}`);

  } catch (error: any) {
    console.error('❌ 更新用户角色失败:', error);
    ResponseUtils.internalError(res, `更新用户角色失败: ${error.message}`);
  }
});

/**
 * 管理员更新用户积分
 * PUT /api/admin/users/credits
 * Body: { userId: number, operation: 'add' | 'set', amount: number, description?: string }
 */
router.put('/users/credits', sessionAuthMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('🔄 管理员积分更新请求:', {
      body: req.body,
      adminUserId: (req as any).user?.userId,
      sessionId: req.headers['x-session-id']
    });

    const { userId, operation, amount, description } = req.body;
    const adminUserId = (req as any).user?.userId;

    // 参数验证
    if (!userId || isNaN(parseInt(userId))) {
      console.log('❌ 用户ID无效:', userId);
      return ResponseUtils.error(res, '用户ID无效');
    }

    if (!operation || !['add', 'set'].includes(operation)) {
      return ResponseUtils.error(res, '操作类型必须是 add 或 set');
    }

    if (amount === undefined || isNaN(parseInt(amount)) || amount < 0) {
      return ResponseUtils.error(res, '积分数量必须是非负数');
    }

    const targetUserId = parseInt(userId);
    const creditAmount = parseInt(amount);

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, email: true, points: true }
    });

    if (!targetUser) {
      return ResponseUtils.error(res, '目标用户不存在');
    }

    // 获取管理员信息
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { username: true, email: true }
    });

    let newPoints: number;
    let transactionDescription: string;

    if (operation === 'add') {
      newPoints = (targetUser.points || 0) + creditAmount;
      transactionDescription = description || `管理员 ${adminUser?.username || adminUserId} 增加积分`;
    } else { // operation === 'set'
      newPoints = creditAmount;
      transactionDescription = description || `管理员 ${adminUser?.username || adminUserId} 设置积分`;
    }

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 更新用户积分
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: { points: newPoints },
        select: { id: true, username: true, email: true, points: true }
      });

      // 记录积分交易
      await tx.pointTransaction.create({
        data: {
          userId: targetUserId,
          transactionType: operation === 'add' ? 'RECHARGE' : 'RECHARGE', // 都记录为充值类型
          amount: operation === 'add' ? creditAmount : (newPoints - (targetUser.points || 0)),
          balanceAfter: newPoints,
          description: transactionDescription,
        }
      });

      return updatedUser;
    });

    console.log(`管理员积分操作: ${adminUser?.username} ${operation} ${creditAmount} 积分给用户 ${targetUser.username}`);

    ResponseUtils.success(res, {
      user: result,
      operation,
      amount: creditAmount,
      newBalance: newPoints,
      message: `成功${operation === 'add' ? '增加' : '设置'}用户积分`
    });
  } catch (error) {
    console.error('更新用户积分失败:', error);
    ResponseUtils.internalError(res, '更新用户积分失败');
  }
});

export default router; 