import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authMiddleware } from '../middleware/auth';
import { SessionManager } from '../config/redis-simple';
import { ResponseUtils } from '../utils/response';

const router = express.Router();
const prisma = new PrismaClient();
const sessionManager = new SessionManager();

// 简单的测试路由
router.get('/llm/test', (req, res) => {
  console.log('📡 LLM测试路由被访问');
  res.json({ success: true, message: 'LLM配置路由工作正常', timestamp: new Date().toISOString() });
});

// 统一获取用户ID的中间件 - 支持JWT和Session两种认证方式
const getUserId = async (req: express.Request, res: express.Response, next: Function) => {
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
        (req as any).user = { 
          userId: sessionValidation.userId,
          role: sessionValidation.userRole || 'user'
        };
        return next();
      }
    }

    // 两种认证都失败
    return ResponseUtils.unauthorized(res, '用户未认证');
  } catch (error) {
    console.error('LLM配置认证中间件错误:', error);
    return ResponseUtils.unauthorized(res, '认证失败');
  }
};

/**
 * 获取LLM配置信息
 * 从数据库读取当前的API配置
 */
router.get('/llm/config', getUserId, async (req, res) => {
  try {
    console.log('📡 收到LLM配置请求');
    
    // 检查表是否存在
    const tableExists = await prisma.$queryRaw<Array<{count: number}>>`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'llm_config'
    `;
    
    if (!tableExists[0] || tableExists[0].count === 0) {
      console.warn('⚠️ llm_config表不存在，返回默认配置');
      // 表不存在，返回默认配置
      const defaultConfig = {
        baseUrl: 'https://ismaque.org/v1',
        apiKey: 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP',
        maxRetries: 2,
        timeout: 30000,
        provider: 'ismaque'
      };
      
      return res.json({
        success: true,
        config: defaultConfig,
        source: 'default'
      });
    }

    // 从数据库读取LLM配置
    const configs = await prisma.$queryRaw<Array<{config_key: string, config_value: string}>>`
      SELECT config_key, config_value FROM llm_config WHERE is_active = 1
    `;
    
    console.log('📦 数据库配置查询结果:', configs);
    
    if (!configs || configs.length === 0) {
      console.warn('⚠️ 数据库中未找到配置，返回默认配置');
      // 没有配置记录，返回默认配置
      const defaultConfig = {
        baseUrl: 'https://ismaque.org/v1',
        apiKey: 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP',
        maxRetries: 2,
        timeout: 30000,
        provider: 'ismaque'
      };
      
      return res.json({
        success: true,
        config: defaultConfig,
        source: 'default'
      });
    }

    // 将配置转换为对象格式
    const configObj: any = {};
    configs.forEach(config => {
      configObj[config.config_key] = config.config_value;
    });

    // 构建返回的配置对象
    const llmConfig = {
      baseUrl: configObj.base_url || 'https://ismaque.org/v1',
      apiKey: configObj.api_key || 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP',
      maxRetries: parseInt(configObj.max_retries || '2'),
      timeout: parseInt(configObj.timeout || '30000'),
      provider: configObj.provider || 'ismaque'
    };

    console.log('✅ 返回LLM配置:', { 
      provider: llmConfig.provider, 
      baseUrl: llmConfig.baseUrl,
      hasApiKey: !!llmConfig.apiKey
    });

    res.json({
      success: true,
      config: llmConfig,
      source: 'database'
    });
  } catch (error) {
    console.error('❌ 获取LLM配置失败:', error);
    
    // 发生异常时返回默认配置而不是错误
    const defaultConfig = {
      baseUrl: 'https://ismaque.org/v1',
      apiKey: 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP',
      maxRetries: 2,
      timeout: 30000,
      provider: 'ismaque'
    };
    
    res.json({
      success: true,
      config: defaultConfig,
      source: 'fallback',
      error: error.message
    });
  }
});

/**
 * 管理员更新LLM配置
 * 允许动态切换API厂商
 */
router.post('/admin/llm/config', getUserId, async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user?.role !== 'admin' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: '权限不足'
      });
    }

    const { baseUrl, apiKey, maxRetries, timeout, provider } = req.body;

    // 验证必填字段
    if (!baseUrl || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'baseUrl和apiKey不能为空'
      });
    }

    // 更新数据库中的配置
    const updates = [
      { key: 'base_url', value: baseUrl },
      { key: 'api_key', value: apiKey },
      { key: 'max_retries', value: String(maxRetries || 2) },
      { key: 'timeout', value: String(timeout || 30000) },
      { key: 'provider', value: provider || 'custom' }
    ];

    for (const update of updates) {
      await prisma.$executeRaw`
        INSERT INTO llm_config (config_key, config_value, description, updated_at) 
        VALUES (${update.key}, ${update.value}, ${`LLM配置-${update.key}`}, NOW()) 
        ON DUPLICATE KEY UPDATE 
        config_value = VALUES(config_value), 
        updated_at = NOW()
      `;
    }

    console.log('管理员更新LLM配置成功:', { baseUrl, provider, hasApiKey: !!apiKey });

    res.json({
      success: true,
      message: 'LLM配置更新成功，新配置将在下次调用时生效'
    });
  } catch (error) {
    console.error('更新LLM配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新LLM配置失败'
    });
  }
});

/**
 * 管理员获取当前LLM配置（包含敏感信息）
 */
router.get('/admin/llm/config', getUserId, async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user?.role !== 'admin' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: '权限不足'
      });
    }

    // 从数据库读取所有LLM配置
    const configs = await prisma.$queryRaw<Array<{
      config_key: string, 
      config_value: string, 
      description: string,
      updated_at: Date
    }>>`
      SELECT config_key, config_value, description, updated_at 
      FROM llm_config 
      WHERE is_active = 1 
      ORDER BY config_key
    `;

    res.json({
      success: true,
      configs: configs
    });
  } catch (error) {
    console.error('获取管理员LLM配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取配置失败'
    });
  }
});

export default router;