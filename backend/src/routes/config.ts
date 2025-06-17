import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { ResponseUtils } from '../utils/response';
import { AuthenticatedRequest, UserConfigData } from '../types';
import { authenticateToken } from '../middleware/auth';
import { SUPPORTED_MODELS, PROGRAMMING_LANGUAGES } from '../types';

const router = Router();

// 配置更新验证规则
const configValidation = [
  body('selectedProvider')
    .optional()
    .isIn(['claude', 'gemini', 'openai'])
    .withMessage('无效的AI服务提供商'),
  body('extractionModel')
    .optional()
    .isString()
    .withMessage('提取模型必须是字符串'),
  body('solutionModel')
    .optional()
    .isString()
    .withMessage('解决方案模型必须是字符串'),
  body('debuggingModel')
    .optional()
    .isString()
    .withMessage('调试模型必须是字符串'),
  body('language')
    .optional()
    .isString()
    .withMessage('编程语言必须是字符串'),
  body('opacity')
    .optional()
    .isFloat({ min: 0.1, max: 1.0 })
    .withMessage('透明度必须在0.1-1.0之间'),
  body('showCopyButton')
    .optional()
    .isBoolean()
    .withMessage('显示复制按钮必须是布尔值')
];

// 获取用户配置
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = await prisma.userConfig.findUnique({
      where: { userId: req.user!.id }
    });

    if (!config) {
      // 如果用户没有配置，创建默认配置
      const defaultConfig = await prisma.userConfig.create({
        data: {
          userId: req.user!.id,
          selectedProvider: 'claude',
          extractionModel: 'claude-3-7-sonnet-20250219',
          solutionModel: 'claude-3-7-sonnet-20250219',
          debuggingModel: 'claude-3-7-sonnet-20250219',
          language: 'python'
        }
      });

      return ResponseUtils.success(res, {
        selectedProvider: defaultConfig.selectedProvider,
        extractionModel: defaultConfig.extractionModel,
        solutionModel: defaultConfig.solutionModel,
        debuggingModel: defaultConfig.debuggingModel,
        language: defaultConfig.language,
        opacity: defaultConfig.opacity,
        showCopyButton: defaultConfig.showCopyButton
      });
    }

    ResponseUtils.success(res, {
      selectedProvider: config.selectedProvider,
      extractionModel: config.extractionModel,
      solutionModel: config.solutionModel,
      debuggingModel: config.debuggingModel,
      language: config.language,
      opacity: config.opacity,
      showCopyButton: config.showCopyButton
    });

  } catch (error) {
    console.error('获取配置错误:', error);
    ResponseUtils.internalError(res);
  }
});

// 更新用户配置
router.put('/', authenticateToken, configValidation, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtils.validationError(res, errors.array().map(err => err.msg));
    }

    const updateData: Partial<UserConfigData> = {};
    
    // 只更新提供的字段
    if (req.body.selectedProvider !== undefined) {
      updateData.selectedProvider = req.body.selectedProvider;
    }
    if (req.body.extractionModel !== undefined) {
      updateData.extractionModel = req.body.extractionModel;
    }
    if (req.body.solutionModel !== undefined) {
      updateData.solutionModel = req.body.solutionModel;
    }
    if (req.body.debuggingModel !== undefined) {
      updateData.debuggingModel = req.body.debuggingModel;
    }
    if (req.body.language !== undefined) {
      updateData.language = req.body.language;
    }
    if (req.body.opacity !== undefined) {
      updateData.opacity = req.body.opacity;
    }
    if (req.body.showCopyButton !== undefined) {
      updateData.showCopyButton = req.body.showCopyButton;
    }

    const updatedConfig = await prisma.userConfig.upsert({
      where: { userId: req.user!.id },
      update: updateData,
      create: {
        userId: req.user!.id,
        selectedProvider: updateData.selectedProvider || 'claude',
        extractionModel: updateData.extractionModel || 'claude-3-7-sonnet-20250219',
        solutionModel: updateData.solutionModel || 'claude-3-7-sonnet-20250219',
        debuggingModel: updateData.debuggingModel || 'claude-3-7-sonnet-20250219',
        language: updateData.language || 'python',
        opacity: updateData.opacity || 1.0,
        showCopyButton: updateData.showCopyButton !== undefined ? updateData.showCopyButton : true
      }
    });

    ResponseUtils.success(res, {
      selectedProvider: updatedConfig.selectedProvider,
      extractionModel: updatedConfig.extractionModel,
      solutionModel: updatedConfig.solutionModel,
      debuggingModel: updatedConfig.debuggingModel,
      language: updatedConfig.language,
      opacity: updatedConfig.opacity,
      showCopyButton: updatedConfig.showCopyButton
    }, '配置更新成功');

  } catch (error) {
    console.error('更新配置错误:', error);
    ResponseUtils.internalError(res);
  }
});

// 获取支持的AI模型列表
router.get('/models', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 从数据库获取活跃的模型列表
    const models = await prisma.aIModel.findMany({
      where: { isActive: true },
      orderBy: [
        { provider: 'asc' },
        { priority: 'desc' },
        { name: 'asc' }
      ]
    });

    // 如果数据库中没有模型，返回默认配置
    if (models.length === 0) {
      const defaultModels = Object.entries(SUPPORTED_MODELS).flatMap(([provider, modelList]) =>
        modelList.map(model => ({
          id: model.id,
          modelId: model.id,
          name: model.name,
          provider: provider as 'claude' | 'gemini' | 'openai',
          category: model.category,
          isActive: true,
          priority: 0
        }))
      );

      return ResponseUtils.success(res, {
        models: defaultModels,
        providers: ['claude', 'gemini', 'openai']
      });
    }

    // 按提供商分组
    const groupedModels = models.reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push({
        id: model.modelId,
        name: model.name,
        category: model.category
      });
      return acc;
    }, {} as Record<string, Array<{ id: string; name: string; category: string }>>);

    ResponseUtils.success(res, {
      models: groupedModels,
      providers: Object.keys(groupedModels)
    });

  } catch (error) {
    console.error('获取模型列表错误:', error);
    ResponseUtils.internalError(res);
  }
});

// 获取支持的编程语言列表
router.get('/languages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    ResponseUtils.success(res, PROGRAMMING_LANGUAGES);
  } catch (error) {
    console.error('获取编程语言列表错误:', error);
    ResponseUtils.internalError(res);
  }
});

// 重置配置到默认值
router.post('/reset', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const defaultConfig = {
      selectedProvider: 'claude',
      extractionModel: 'claude-3-7-sonnet-20250219',
      solutionModel: 'claude-3-7-sonnet-20250219',
      debuggingModel: 'claude-3-7-sonnet-20250219',
      language: 'python',
      opacity: 1.0,
      showCopyButton: true
    };

    const updatedConfig = await prisma.userConfig.upsert({
      where: { userId: req.user!.id },
      update: defaultConfig,
      create: {
        userId: req.user!.id,
        ...defaultConfig
      }
    });

    ResponseUtils.success(res, {
      selectedProvider: updatedConfig.selectedProvider,
      extractionModel: updatedConfig.extractionModel,
      solutionModel: updatedConfig.solutionModel,
      debuggingModel: updatedConfig.debuggingModel,
      language: updatedConfig.language,
      opacity: updatedConfig.opacity,
      showCopyButton: updatedConfig.showCopyButton
    }, '配置已重置为默认值');

  } catch (error) {
    console.error('重置配置错误:', error);
    ResponseUtils.internalError(res);
  }
});

export default router; 