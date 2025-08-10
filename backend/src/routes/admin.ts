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
    console.log('🔐 Session认证中间件 - 开始验证');
    console.log('请求路径:', req.path);
    console.log('请求方法:', req.method);
    
    const sessionId = req.headers['x-session-id'];
    console.log('会话ID:', sessionId);
    
    if (!sessionId) {
      console.log('❌ 未提供会话ID');
      return ResponseUtils.unauthorized(res, '未提供会话ID');
    }

    // 延迟初始化SessionManager
    if (!sessionManager) {
      console.log('🔧 初始化SessionManager');
      sessionManager = new SessionManager();
    }

    console.log('🔍 验证会话...');
    const sessionValidation = await sessionManager.validateSession(sessionId);
    console.log('会话验证结果:', sessionValidation);
    
    if (!sessionValidation.valid) {
      console.log('❌ 会话无效');
      return ResponseUtils.unauthorized(res, '会话已过期或无效');
    }

    // 获取用户信息
    console.log('👤 查询用户信息...');
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
      console.log('❌ 用户不存在');
      return ResponseUtils.unauthorized(res, '用户不存在');
    }

    if (!user.isActive) {
      console.log('❌ 用户账户已被禁用');
      return ResponseUtils.forbidden(res, '用户账户已被禁用');
    }

    console.log('✅ Session认证成功:', user.username);
    // 将用户信息添加到请求对象
    req.user = { userId: user.id, username: user.username, email: user.email };
    next();
  } catch (error) {
    console.error('❌ Session认证失败:', error);
    ResponseUtils.internalError(res, '认证服务异常');
  }
};

// 管理员权限检查中间件
const adminMiddleware = async (req: any, res: Response, next: any) => {
  try {
    console.log('👑 管理员权限检查 - 开始验证');
    const userId = req.user?.userId;
    console.log('用户ID:', userId);
    
    if (!userId) {
      console.log('❌ 用户未认证');
      return ResponseUtils.unauthorized(res, '用户未认证');
    }

    // 查询用户角色
    console.log('🔍 查询用户角色...');
    const user = await prisma.user.findUnique({
      where: { id: userId }
    }) as any;

    if (!user) {
      console.log('❌ 用户不存在');
      return ResponseUtils.unauthorized(res, '用户不存在');
    }

    console.log('用户信息:', { username: user.username, role: user.role });

    if (user.role !== 'ADMIN') {
      console.log('❌ 权限不足，需要管理员权限');
      return ResponseUtils.forbidden(res, '需要管理员权限');
    }

    console.log(`✅ 管理员权限验证成功: ${user.username} (角色: ${user.role})`);
    next();
  } catch (error) {
    console.error('❌ 管理员权限检查失败:', error);
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

/**
 * 获取所有充值套餐
 * GET /api/admin/payment-packages
 */
router.get('/payment-packages', async (req: Request, res: Response) => {
  try {
    console.log('🔍 开始查询充值套餐...');
    
    const packages = await prisma.paymentPackage.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    console.log(`✅ 查询成功，找到 ${packages.length} 个套餐`);
    console.log('套餐数据:', packages);

    ResponseUtils.success(res, {
      packages,
      total: packages.length,
      message: '获取充值套餐成功'
    });
  } catch (error) {
    console.error('❌ 获取充值套餐失败:', error);
    console.error('错误详情:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    ResponseUtils.internalError(res, '获取充值套餐失败');
  }
});

/**
 * 创建充值套餐
 * POST /api/admin/payment-packages
 * Body: { name, description, amount, points, bonusPoints }
 */
router.post('/payment-packages', async (req: Request, res: Response) => {
  try {
    const { name, description, amount, points, bonusPoints } = req.body;

    // 参数验证
    if (!name || typeof name !== 'string') {
      return ResponseUtils.error(res, '套餐名称不能为空');
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return ResponseUtils.error(res, '套餐价格必须是大于0的数字');
    }

    if (!points || isNaN(parseInt(points)) || parseInt(points) <= 0) {
      return ResponseUtils.error(res, '积分数量必须是大于0的整数');
    }

    const bonusPointsValue = bonusPoints ? parseInt(bonusPoints) : 0;
    if (bonusPointsValue < 0) {
      return ResponseUtils.error(res, '奖励积分不能为负数');
    }

    // 创建套餐
    const newPackage = await prisma.paymentPackage.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        amount: parseFloat(amount),
        points: parseInt(points),
        bonusPoints: bonusPointsValue,
        isActive: true,
        sortOrder: 0
      }
    });

    ResponseUtils.success(res, {
      package: newPackage,
      message: '创建充值套餐成功'
    });
  } catch (error) {
    console.error('创建充值套餐失败:', error);
    ResponseUtils.internalError(res, '创建充值套餐失败');
  }
});

/**
 * 更新充值套餐
 * PUT /api/admin/payment-packages/:id
 * Body: { name, description, amount, points, bonusPoints }
 */
router.put('/payment-packages/:id', async (req: Request, res: Response) => {
  try {
    const packageId = parseInt(req.params.id);
    const { name, description, amount, points, bonusPoints } = req.body;

    if (isNaN(packageId)) {
      return ResponseUtils.error(res, '套餐ID无效');
    }

    // 参数验证
    if (!name || typeof name !== 'string') {
      return ResponseUtils.error(res, '套餐名称不能为空');
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return ResponseUtils.error(res, '套餐价格必须是大于0的数字');
    }

    if (!points || isNaN(parseInt(points)) || parseInt(points) <= 0) {
      return ResponseUtils.error(res, '积分数量必须是大于0的整数');
    }

    const bonusPointsValue = bonusPoints ? parseInt(bonusPoints) : 0;
    if (bonusPointsValue < 0) {
      return ResponseUtils.error(res, '奖励积分不能为负数');
    }

    // 检查套餐是否存在
    const existingPackage = await prisma.paymentPackage.findUnique({
      where: { id: packageId }
    });

    if (!existingPackage) {
      return ResponseUtils.notFound(res, '套餐不存在');
    }

    // 更新套餐
    const updatedPackage = await prisma.paymentPackage.update({
      where: { id: packageId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        amount: parseFloat(amount),
        points: parseInt(points),
        bonusPoints: bonusPointsValue
      }
    });

    ResponseUtils.success(res, {
      package: updatedPackage,
      message: '更新充值套餐成功'
    });
  } catch (error) {
    console.error('更新充值套餐失败:', error);
    ResponseUtils.internalError(res, '更新充值套餐失败');
  }
});

/**
 * 删除充值套餐
 * DELETE /api/admin/payment-packages/:id
 */
router.delete('/payment-packages/:id', async (req: Request, res: Response) => {
  try {
    const packageId = parseInt(req.params.id);

    if (isNaN(packageId)) {
      return ResponseUtils.error(res, '套餐ID无效');
    }

    // 检查套餐是否存在
    const existingPackage = await prisma.paymentPackage.findUnique({
      where: { id: packageId }
    });

    if (!existingPackage) {
      return ResponseUtils.notFound(res, '套餐不存在');
    }

    // 检查是否有关联的订单
    const orderCount = await prisma.paymentOrder.count({
      where: { packageId: packageId }
    });

    if (orderCount > 0) {
      return ResponseUtils.error(res, '该套餐已有订单记录，无法删除');
    }

    // 删除套餐
    await prisma.paymentPackage.delete({
      where: { id: packageId }
    });

    ResponseUtils.success(res, {
      message: '删除充值套餐成功'
    });
  } catch (error) {
    console.error('删除充值套餐失败:', error);
    ResponseUtils.internalError(res, '删除充值套餐失败');
  }
});

/**
 * 获取使用情况统计 - 交易记录
 * GET /api/admin/usage-stats/transactions
 */
router.get('/usage-stats/transactions', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, transactionType, userEmail, startDate, endDate } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // 构建查询条件
    const where: any = {};
    
    if (transactionType && transactionType !== 'all') {
      where.transactionType = transactionType;
    }
    
    if (startDate) {
      where.createdAt = { gte: new Date(startDate as string) };
    }
    
    if (endDate) {
      where.createdAt = { 
        ...where.createdAt,
        lte: new Date(endDate as string) 
      };
    }

    // 如果有用户邮箱筛选，需要通过用户表关联查询
    let userWhere = {};
    if (userEmail) {
      userWhere = {
        email: { contains: userEmail as string, mode: 'insensitive' as any }
      };
    }

    const transactions = await prisma.pointTransaction.findMany({
      skip,
      take,
      where: {
        ...where,
        ...(userEmail ? { user: userWhere } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.pointTransaction.count({
      where: {
        ...where,
        ...(userEmail ? { user: userWhere } : {})
      }
    });

    ResponseUtils.success(res, {
      transactions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      },
      message: '获取交易记录成功'
    });
  } catch (error) {
    console.error('获取交易记录失败:', error);
    ResponseUtils.internalError(res, '获取交易记录失败');
  }
});

/**
 * 获取使用情况统计 - 摘要信息
 * GET /api/admin/usage-stats/summary
 */
router.get('/usage-stats/summary', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, userEmail } = req.query;
    
    // 构建时间范围条件
    const dateWhere: any = {};
    if (startDate) {
      dateWhere.createdAt = { gte: new Date(startDate as string) };
    }
    if (endDate) {
      dateWhere.createdAt = { 
        ...dateWhere.createdAt,
        lte: new Date(endDate as string) 
      };
    }

    // 用户筛选条件
    let userWhere = {};
    if (userEmail) {
      userWhere = {
        email: { contains: userEmail as string, mode: 'insensitive' as any }
      };
    }

    // 获取总用户数
    const totalUsers = await prisma.user.count({
      where: userEmail ? userWhere : {}
    });

    // 获取活跃用户数（有积分交易的用户）
    const activeUsers = await prisma.pointTransaction.groupBy({
      by: ['userId'],
      where: {
        ...dateWhere,
        ...(userEmail ? { user: userWhere } : {})
      }
    });

    // 获取交易统计
    const transactionStats = await prisma.pointTransaction.aggregate({
      where: {
        ...dateWhere,
        ...(userEmail ? { user: userWhere } : {})
      },
      _count: { id: true },
      _sum: { amount: true }
    });

    // 按交易类型统计
    const transactionByType = await prisma.pointTransaction.groupBy({
      by: ['transactionType'],
      where: {
        ...dateWhere,
        ...(userEmail ? { user: userWhere } : {})
      },
      _count: { id: true },
      _sum: { amount: true }
    });

    ResponseUtils.success(res, {
      summary: {
        totalUsers,
        activeUsers: activeUsers.length,
        totalTransactions: transactionStats._count.id || 0,
        totalAmount: transactionStats._sum.amount || 0,
        transactionsByType: transactionByType.map(item => ({
          type: item.transactionType,
          count: item._count.id,
          amount: item._sum.amount || 0
        }))
      },
      message: '获取使用统计成功'
    });
  } catch (error) {
    console.error('获取使用统计失败:', error);
    ResponseUtils.internalError(res, '获取使用统计失败');
  }
});

/**
 * 获取公告列表
 * GET /api/admin/announcements
 */
router.get('/announcements', async (req: Request, res: Response) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    ResponseUtils.success(res, {
      announcements,
      total: announcements.length,
      message: '获取公告列表成功'
    });
  } catch (error) {
    console.error('获取公告列表失败:', error);
    ResponseUtils.internalError(res, '获取公告列表失败');
  }
});

/**
 * 创建公告
 * POST /api/admin/announcements
 */
router.post('/announcements', async (req: Request, res: Response) => {
  try {
    const { title, content, showStyle = 'info', isActive = true, priority = 0, startTime, endTime } = req.body;

    if (!title || !content) {
      return ResponseUtils.error(res, '标题和内容不能为空');
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        showStyle,
        isActive,
        priority: parseInt(priority) || 0,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null
      }
    });

    ResponseUtils.success(res, {
      announcement,
      message: '创建公告成功'
    });
  } catch (error) {
    console.error('创建公告失败:', error);
    ResponseUtils.internalError(res, '创建公告失败');
  }
});

/**
 * 更新公告
 * PUT /api/admin/announcements/:id
 */
router.put('/announcements/:id', async (req: Request, res: Response) => {
  try {
    const announcementId = parseInt(req.params.id);
    const { title, content, showStyle, isActive, priority, startTime, endTime } = req.body;

    if (isNaN(announcementId)) {
      return ResponseUtils.error(res, '公告ID无效');
    }

    if (!title || !content) {
      return ResponseUtils.error(res, '标题和内容不能为空');
    }

    // 检查公告是否存在
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });

    if (!existingAnnouncement) {
      return ResponseUtils.notFound(res, '公告不存在');
    }

    const announcement = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        title,
        content,
        showStyle,
        isActive,
        priority: priority !== undefined ? parseInt(priority) : undefined,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null
      }
    });

    ResponseUtils.success(res, {
      announcement,
      message: '更新公告成功'
    });
  } catch (error) {
    console.error('更新公告失败:', error);
    ResponseUtils.internalError(res, '更新公告失败');
  }
});

/**
 * 删除公告
 * DELETE /api/admin/announcements/:id
 */
router.delete('/announcements/:id', async (req: Request, res: Response) => {
  try {
    const announcementId = parseInt(req.params.id);

    if (isNaN(announcementId)) {
      return ResponseUtils.error(res, '公告ID无效');
    }

    // 检查公告是否存在
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });

    if (!existingAnnouncement) {
      return ResponseUtils.notFound(res, '公告不存在');
    }

    await prisma.announcement.delete({
      where: { id: announcementId }
    });

    ResponseUtils.success(res, {
      message: '删除公告成功'
    });
  } catch (error) {
    console.error('删除公告失败:', error);
    ResponseUtils.internalError(res, '删除公告失败');
  }
});

export default router; 