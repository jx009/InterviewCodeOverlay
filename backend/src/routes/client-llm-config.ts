import { Router, Request, Response } from 'express';
import { ResponseUtils } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { SessionManager } from '../config/redis-simple';

const router = Router();
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
    console.error('LLM配置认证中间件错误:', error);
    return ResponseUtils.unauthorized(res, '认证失败');
  }
};

/**
 * 获取LLM配置信息
 * GET /api/client/llm-config
 */
router.get('/', getUserId, async (req: Request, res: Response) => {
  try {
    console.log('📡 收到客户端LLM配置请求');
    
    // 检查表是否存在
    const tableExists = await prisma.$queryRaw<Array<{count: number}>>`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'llm_config'
    `;
    
    if (!tableExists[0] || tableExists[0].count === 0) {
      console.warn('⚠️ llm_config表不存在，返回默认配置');
      const defaultConfig = {
        baseUrl: 'https://ismaque.org/v1',
        apiKey: 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP',
        maxRetries: 2,
        timeout: 30000,
        provider: 'ismaque'
      };
      
      return ResponseUtils.success(res, {
        config: defaultConfig,
        source: 'default',
        message: 'LLM配置获取成功（使用默认配置）'
      });
    }

    // 从数据库读取LLM配置
    const configs = await prisma.$queryRaw<Array<{config_key: string, config_value: string}>>`
      SELECT config_key, config_value FROM llm_config WHERE is_active = 1
    `;
    
    console.log('📦 数据库配置查询结果:', configs);
    
    if (!configs || configs.length === 0) {
      console.warn('⚠️ 数据库中未找到配置，返回默认配置');
      const defaultConfig = {
        baseUrl: 'https://ismaque.org/v1',
        apiKey: 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP',
        maxRetries: 2,
        timeout: 30000,
        provider: 'ismaque'
      };
      
      return ResponseUtils.success(res, {
        config: defaultConfig,
        source: 'default',
        message: 'LLM配置获取成功（使用默认配置）'
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

    ResponseUtils.success(res, {
      config: llmConfig,
      source: 'database',
      message: 'LLM配置获取成功'
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
    
    ResponseUtils.success(res, {
      config: defaultConfig,
      source: 'fallback',
      message: 'LLM配置获取成功（降级配置）',
      error: error.message
    });
  }
});

export default router;