import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { ResponseUtils } from '../utils/response';
import { AuthenticatedRequest, UserConfigData } from '../types';
import { authenticateToken, authMiddleware } from '../middleware/auth';
import { SUPPORTED_MODELS, PROGRAMMING_LANGUAGES } from '../types';

const router = Router();

// 配置更新验证规则
const configValidation = [
  body('selectedProvider')
    .optional()
    .isIn(['claude', 'gemini', 'openai'])
    .withMessage('无效的AI服务提供商'),
  // 新的分类模型字段
  body('programmingModel')
    .optional()
    .isString()
    .withMessage('编程题模型必须是字符串'),
  body('multipleChoiceModel')
    .optional()
    .isString()
    .withMessage('选择题模型必须是字符串'),
  // 保留向后兼容的字段
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
      where: { userId: req.user!.userId }
    });

    if (!config) {
      // 如果用户没有配置，创建默认配置
      const defaultConfig = await prisma.userConfig.create({
        data: {
          userId: req.user!.userId,
          programmingModel: 'claude-sonnet-4-20250514',
          multipleChoiceModel: 'claude-sonnet-4-20250514',
          selectedProvider: 'claude',
          extractionModel: 'claude-sonnet-4-20250514',
          solutionModel: 'claude-sonnet-4-20250514',
          debuggingModel: 'claude-sonnet-4-20250514',
          language: 'python'
        } as any
      });

      return ResponseUtils.success(res, {
        // 新的分类模型字段
        programmingModel: (defaultConfig as any).programmingModel,
        multipleChoiceModel: (defaultConfig as any).multipleChoiceModel,
        // 保留向后兼容的字段
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
      // 新的分类模型字段
      programmingModel: (config as any).programmingModel,
      multipleChoiceModel: (config as any).multipleChoiceModel,
      // 保留向后兼容的字段
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
    
    // 新的分类模型字段
    if (req.body.programmingModel !== undefined) {
      updateData.programmingModel = req.body.programmingModel;
    }
    if (req.body.multipleChoiceModel !== undefined) {
      updateData.multipleChoiceModel = req.body.multipleChoiceModel;
    }
    
    // 只更新提供的字段（保留向后兼容）
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
      where: { userId: req.user!.userId },
      update: updateData,
      create: {
        userId: req.user!.userId,
        programmingModel: updateData.programmingModel || 'claude-sonnet-4-20250514',
        multipleChoiceModel: updateData.multipleChoiceModel || 'claude-sonnet-4-20250514',
        selectedProvider: updateData.selectedProvider || 'claude',
        extractionModel: updateData.extractionModel || 'claude-sonnet-4-20250514',
        solutionModel: updateData.solutionModel || 'claude-sonnet-4-20250514',
        debuggingModel: updateData.debuggingModel || 'claude-sonnet-4-20250514',
        language: updateData.language || 'python',
        opacity: updateData.opacity || 1.0,
        showCopyButton: updateData.showCopyButton !== undefined ? updateData.showCopyButton : true
      } as any
    });

    ResponseUtils.success(res, {
      // 新的分类模型字段
      programmingModel: (updatedConfig as any).programmingModel,
      multipleChoiceModel: (updatedConfig as any).multipleChoiceModel,
      // 保留向后兼容的字段
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
    // 直接返回我们配置的模型列表，使用新的映射规则
    const modelMapping = {
      'claude-sonnet-4-20250514': 'claude-4-sonnet',
      'gemini-2.5-pro-deepsearch': 'gemini-pro-2.5',
      'gemini-2.5-flash-preview-04-17': 'gemini-flash-2.5',
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'o4-mini-high-all': 'o4-mini-high',
      'o4-mini-all': 'o4-mini'
    };

    const defaultModels = Object.entries(SUPPORTED_MODELS).flatMap(([provider, modelList]) =>
      modelList.map(model => ({
        id: model.id,
        modelId: model.id,
        name: model.id,
        displayName: modelMapping[model.id] || model.name,
        provider: provider as 'claude' | 'gemini' | 'openai',
        category: model.category,
        isActive: true,
        priority: 0,
        description: `${modelMapping[model.id] || model.name} - ${provider}提供的AI模型`
      }))
    );

    ResponseUtils.success(res, defaultModels);

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
      programmingModel: 'claude-sonnet-4-20250514',
      multipleChoiceModel: 'claude-sonnet-4-20250514',
      selectedProvider: 'claude',
      extractionModel: 'claude-sonnet-4-20250514',
      solutionModel: 'claude-sonnet-4-20250514',
      debuggingModel: 'claude-sonnet-4-20250514',
      language: 'python',
      opacity: 1.0,
      showCopyButton: true
    };

    const updatedConfig = await prisma.userConfig.upsert({
      where: { userId: req.user!.userId },
      update: defaultConfig,
      create: {
        userId: req.user!.userId,
        ...defaultConfig
      }
    });

    ResponseUtils.success(res, {
      programmingModel: (updatedConfig as any).programmingModel,
      multipleChoiceModel: (updatedConfig as any).multipleChoiceModel,
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

// 获取指定用户的配置（新增：Cursor式）
router.get('/user/:userId', authMiddleware, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { userId } = req.params;
    
    if (!req.user) {
      res.status(401).json({ error: '用户未认证' });
      return;
    }
    
    // 确保用户只能访问自己的配置
    if (req.user.userId !== parseInt(userId)) {
      res.status(403).json({ error: '无权访问此用户配置' });
      return;
    }

    const config = await prisma.userConfig.findUnique({
      where: { userId: parseInt(userId) }
    });

    if (!config) {
      // 如果用户没有配置，创建默认配置
      const defaultConfig = await prisma.userConfig.create({
        data: {
          userId: parseInt(userId),
          programmingModel: 'claude-sonnet-4-20250514',
          multipleChoiceModel: 'claude-sonnet-4-20250514',
          aiModel: 'claude-sonnet-4-20250514',
          selectedProvider: 'claude',
          extractionModel: 'claude-sonnet-4-20250514',
          solutionModel: 'claude-sonnet-4-20250514',
          debuggingModel: 'claude-sonnet-4-20250514',
          language: 'python',
          theme: 'system'
        } as any
      });

      res.json({
        programmingModel: (defaultConfig as any).programmingModel,
        multipleChoiceModel: (defaultConfig as any).multipleChoiceModel,
        aiModel: defaultConfig.aiModel,
        language: defaultConfig.language,
        theme: defaultConfig.theme,
        shortcuts: JSON.parse(defaultConfig.shortcuts || '{}'),
        display: JSON.parse(defaultConfig.display || '{}'),
        processing: JSON.parse(defaultConfig.processing || '{}'),
        // 保持向后兼容
        selectedProvider: defaultConfig.selectedProvider,
        extractionModel: defaultConfig.extractionModel,
        solutionModel: defaultConfig.solutionModel,
        debuggingModel: defaultConfig.debuggingModel,
        opacity: defaultConfig.opacity,
        showCopyButton: defaultConfig.showCopyButton
      });
    }

    // 解析JSON字段
    let shortcuts = {};
    let display = {};
    let processing = {};
    
    try {
      shortcuts = JSON.parse(config!.shortcuts || '{}');
      display = JSON.parse(config!.display || '{}');
      processing = JSON.parse(config!.processing || '{}');
    } catch (error) {
      console.warn('解析配置JSON字段失败:', error);
    }

    res.json({
      programmingModel: (config as any).programmingModel,
      multipleChoiceModel: (config as any).multipleChoiceModel,
      aiModel: config!.aiModel,
      language: config!.language,
      theme: config!.theme,
      shortcuts,
      display,
      processing,
      // 保持向后兼容
      selectedProvider: config!.selectedProvider,
      extractionModel: config!.extractionModel,
      solutionModel: config!.solutionModel,
      debuggingModel: config!.debuggingModel,
      opacity: config!.opacity,
      showCopyButton: config!.showCopyButton
    });

  } catch (error) {
    console.error('获取用户配置错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新指定用户的配置（新增：Cursor式）
router.put('/user/:userId', authMiddleware, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { userId } = req.params;
    
    // 确保用户只能更新自己的配置
    if (!req.user || req.user.userId !== parseInt(userId)) {
      res.status(403).json({ error: '无权修改此用户配置' });
      return;
    }

    const updateData: any = {};
    
    // 新的分类模型字段
    if (req.body.programmingModel !== undefined) {
      updateData.programmingModel = req.body.programmingModel;
    }
    if (req.body.multipleChoiceModel !== undefined) {
      updateData.multipleChoiceModel = req.body.multipleChoiceModel;
    }
    
    // 简化配置字段
    if (req.body.aiModel !== undefined) {
      updateData.aiModel = req.body.aiModel;
    }
    if (req.body.language !== undefined) {
      updateData.language = req.body.language;
    }
    if (req.body.theme !== undefined) {
      updateData.theme = req.body.theme;
    }
    if (req.body.shortcuts !== undefined) {
      updateData.shortcuts = JSON.stringify(req.body.shortcuts);
    }
    if (req.body.display !== undefined) {
      updateData.display = JSON.stringify(req.body.display);
    }
    if (req.body.processing !== undefined) {
      updateData.processing = JSON.stringify(req.body.processing);
    }
    
    // 向后兼容字段
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
    if (req.body.opacity !== undefined) {
      updateData.opacity = req.body.opacity;
    }
    if (req.body.showCopyButton !== undefined) {
      updateData.showCopyButton = req.body.showCopyButton;
    }

    const updatedConfig = await prisma.userConfig.upsert({
      where: { userId: parseInt(userId) },
      update: updateData,
      create: {
        userId: parseInt(userId),
        programmingModel: updateData.programmingModel || 'claude-sonnet-4-20250514',
        multipleChoiceModel: updateData.multipleChoiceModel || 'claude-sonnet-4-20250514',
        aiModel: updateData.aiModel || 'claude-sonnet-4-20250514',
        language: updateData.language || 'python',
        theme: updateData.theme || 'system',
        shortcuts: updateData.shortcuts || JSON.stringify({}),
        display: updateData.display || JSON.stringify({}),
        processing: updateData.processing || JSON.stringify({}),
        selectedProvider: updateData.selectedProvider || 'claude',
        extractionModel: updateData.extractionModel || 'claude-sonnet-4-20250514',
        solutionModel: updateData.solutionModel || 'claude-sonnet-4-20250514',
        debuggingModel: updateData.debuggingModel || 'claude-sonnet-4-20250514',
        opacity: updateData.opacity || 1.0,
        showCopyButton: updateData.showCopyButton !== undefined ? updateData.showCopyButton : true
      } as any
    });

    res.json({
      message: '配置更新成功',
      config: {
        programmingModel: (updatedConfig as any).programmingModel,
        multipleChoiceModel: (updatedConfig as any).multipleChoiceModel,
        aiModel: updatedConfig.aiModel,
        language: updatedConfig.language,
        theme: updatedConfig.theme,
        shortcuts: JSON.parse(updatedConfig.shortcuts || '{}'),
        display: JSON.parse(updatedConfig.display || '{}'),
        processing: JSON.parse(updatedConfig.processing || '{}')
      }
    });

  } catch (error) {
    console.error('更新用户配置错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router; 