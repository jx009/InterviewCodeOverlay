import { Router, Request, Response } from 'express';
import { ResponseUtils } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { MonitoringService } from '../services/MonitoringService';

const router = Router();
const monitoringService = MonitoringService.getInstance();

// 管理员权限检查中间件
const adminMiddleware = async (req: any, res: Response, next: any) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseUtils.unauthorized(res, '用户未认证');
    }

    // 检查用户是否为管理员（检查用户名是否为admin）
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    if (!user || user.username !== 'admin') {
      return ResponseUtils.forbidden(res, '需要管理员权限');
    }

    next();
  } catch (error) {
    console.error('管理员权限检查失败:', error);
    ResponseUtils.internalError(res, '权限检查失败');
  }
};

/**
 * 公共健康检查端点（无需认证）
 * GET /api/monitoring/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthCheck = await monitoringService.performHealthCheck();
    
    // 根据健康状态设置HTTP状态码
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json({
      success: healthCheck.status !== 'critical',
      data: {
        status: healthCheck.status,
        timestamp: new Date().toISOString(),
        services: healthCheck.services,
        uptime: process.uptime()
      },
      message: `系统状态: ${healthCheck.status}`
    });
  } catch (error) {
    console.error('健康检查失败:', error);
    res.status(503).json({
      success: false,
      error: '健康检查失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 以下路由需要管理员权限
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * 获取详细系统指标
 * GET /api/monitoring/metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await monitoringService.getCurrentMetrics();
    
    ResponseUtils.success(res, {
      metrics,
      message: '获取系统指标成功'
    });
  } catch (error) {
    console.error('获取系统指标失败:', error);
    ResponseUtils.internalError(res, '获取系统指标失败');
  }
});

/**
 * 获取指标历史记录
 * GET /api/monitoring/metrics/history?limit=50
 */
router.get('/metrics/history', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const history = monitoringService.getMetricsHistory(limit);
    
    ResponseUtils.success(res, {
      history,
      count: history.length,
      message: '获取指标历史成功'
    });
  } catch (error) {
    console.error('获取指标历史失败:', error);
    ResponseUtils.internalError(res, '获取指标历史失败');
  }
});

/**
 * 获取详细健康检查
 * GET /api/monitoring/health/detailed
 */
router.get('/health/detailed', async (req: Request, res: Response) => {
  try {
    const healthCheck = await monitoringService.performHealthCheck();
    
    ResponseUtils.success(res, {
      ...healthCheck,
      message: '获取详细健康检查成功'
    });
  } catch (error) {
    console.error('获取详细健康检查失败:', error);
    ResponseUtils.internalError(res, '获取详细健康检查失败');
  }
});

/**
 * 获取使用统计
 * GET /api/monitoring/usage
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const usage = await monitoringService.getUsageStatistics();
    
    ResponseUtils.success(res, {
      usage,
      message: '获取使用统计成功'
    });
  } catch (error) {
    console.error('获取使用统计失败:', error);
    ResponseUtils.internalError(res, '获取使用统计失败');
  }
});

/**
 * 记录错误日志
 * POST /api/monitoring/error
 * Body: { message: string, stack?: string, context?: any }
 */
router.post('/error', async (req: Request, res: Response) => {
  try {
    const { message, stack, context } = req.body;
    
    if (!message) {
      return ResponseUtils.error(res, '错误消息不能为空');
    }
    
    const error = new Error(message);
    if (stack) {
      error.stack = stack;
    }
    
    await monitoringService.logError(error, context);
    
    ResponseUtils.success(res, {
      message: '错误日志记录成功'
    });
  } catch (error) {
    console.error('记录错误日志失败:', error);
    ResponseUtils.internalError(res, '记录错误日志失败');
  }
});

/**
 * 获取系统信息概览
 * GET /api/monitoring/overview
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const [metrics, usage, healthCheck] = await Promise.all([
      monitoringService.getCurrentMetrics(),
      monitoringService.getUsageStatistics(),
      monitoringService.performHealthCheck()
    ]);
    
    // 格式化数据以便前端展示
    const overview = {
      status: healthCheck.status,
      uptime: {
        seconds: metrics.application.uptime,
        formatted: formatUptime(metrics.application.uptime)
      },
      system: {
        cpu: {
          usage: Math.round(metrics.cpu.usage * 100) / 100,
          loadAverage: metrics.cpu.loadAverage.map(load => Math.round(load * 100) / 100)
        },
        memory: {
          usage: Math.round(metrics.memory.usage * 100),
          used: formatBytes(metrics.memory.used),
          total: formatBytes(metrics.memory.total)
        },
        disk: {
          usage: Math.round(metrics.disk.usage * 100),
          used: formatBytes(metrics.disk.used),
          total: formatBytes(metrics.disk.total)
        }
      },
      services: healthCheck.services,
      users: usage.users,
      issues: healthCheck.issues,
      lastUpdate: metrics.timestamp
    };
    
    ResponseUtils.success(res, {
      overview,
      message: '获取系统概览成功'
    });
  } catch (error) {
    console.error('获取系统概览失败:', error);
    ResponseUtils.internalError(res, '获取系统概览失败');
  }
});

// 辅助函数：格式化运行时间
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟 ${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

// 辅助函数：格式化字节大小
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router; 