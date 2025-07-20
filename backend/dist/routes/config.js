"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = (0, express_1.Router)();
const configValidation = [
    (0, express_validator_1.body)('selectedProvider')
        .optional()
        .isIn(['claude', 'gemini', 'openai'])
        .withMessage('无效的AI服务提供商'),
    (0, express_validator_1.body)('programmingModel')
        .optional()
        .isString()
        .withMessage('编程题模型必须是字符串'),
    (0, express_validator_1.body)('multipleChoiceModel')
        .optional()
        .isString()
        .withMessage('选择题模型必须是字符串'),
    (0, express_validator_1.body)('extractionModel')
        .optional()
        .isString()
        .withMessage('提取模型必须是字符串'),
    (0, express_validator_1.body)('solutionModel')
        .optional()
        .isString()
        .withMessage('解决方案模型必须是字符串'),
    (0, express_validator_1.body)('debuggingModel')
        .optional()
        .isString()
        .withMessage('调试模型必须是字符串'),
    (0, express_validator_1.body)('language')
        .optional()
        .isString()
        .withMessage('编程语言必须是字符串'),
    (0, express_validator_1.body)('opacity')
        .optional()
        .isFloat({ min: 0.1, max: 1.0 })
        .withMessage('透明度必须在0.1-1.0之间'),
    (0, express_validator_1.body)('showCopyButton')
        .optional()
        .isBoolean()
        .withMessage('显示复制按钮必须是布尔值')
];
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const config = await database_1.prisma.userConfig.findUnique({
            where: { userId: req.user.userId }
        });
        if (!config) {
            const defaultConfig = await database_1.prisma.userConfig.create({
                data: {
                    userId: req.user.userId,
                    programmingModel: 'claude-sonnet-4-20250514',
                    multipleChoiceModel: 'claude-sonnet-4-20250514',
                    selectedProvider: 'claude',
                    extractionModel: 'claude-sonnet-4-20250514',
                    solutionModel: 'claude-sonnet-4-20250514',
                    debuggingModel: 'claude-sonnet-4-20250514',
                    language: 'python'
                }
            });
            return response_1.ResponseUtils.success(res, {
                programmingModel: defaultConfig.programmingModel,
                multipleChoiceModel: defaultConfig.multipleChoiceModel,
                selectedProvider: defaultConfig.selectedProvider,
                extractionModel: defaultConfig.extractionModel,
                solutionModel: defaultConfig.solutionModel,
                debuggingModel: defaultConfig.debuggingModel,
                language: defaultConfig.language,
                opacity: defaultConfig.opacity,
                showCopyButton: defaultConfig.showCopyButton
            });
        }
        response_1.ResponseUtils.success(res, {
            programmingModel: config.programmingModel,
            multipleChoiceModel: config.multipleChoiceModel,
            selectedProvider: config.selectedProvider,
            extractionModel: config.extractionModel,
            solutionModel: config.solutionModel,
            debuggingModel: config.debuggingModel,
            language: config.language,
            opacity: config.opacity,
            showCopyButton: config.showCopyButton
        });
    }
    catch (error) {
        console.error('获取配置错误:', error);
        response_1.ResponseUtils.internalError(res);
    }
});
router.put('/', auth_1.authenticateToken, configValidation, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return response_1.ResponseUtils.validationError(res, errors.array().map(err => err.msg));
        }
        const updateData = {};
        if (req.body.programmingModel !== undefined) {
            updateData.programmingModel = req.body.programmingModel;
        }
        if (req.body.multipleChoiceModel !== undefined) {
            updateData.multipleChoiceModel = req.body.multipleChoiceModel;
        }
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
        const updatedConfig = await database_1.prisma.userConfig.upsert({
            where: { userId: req.user.userId },
            update: updateData,
            create: {
                userId: req.user.userId,
                programmingModel: updateData.programmingModel || 'claude-sonnet-4-20250514',
                multipleChoiceModel: updateData.multipleChoiceModel || 'claude-sonnet-4-20250514',
                selectedProvider: updateData.selectedProvider || 'claude',
                extractionModel: updateData.extractionModel || 'claude-sonnet-4-20250514',
                solutionModel: updateData.solutionModel || 'claude-sonnet-4-20250514',
                debuggingModel: updateData.debuggingModel || 'claude-sonnet-4-20250514',
                language: updateData.language || 'python',
                opacity: updateData.opacity || 1.0,
                showCopyButton: updateData.showCopyButton !== undefined ? updateData.showCopyButton : true
            }
        });
        response_1.ResponseUtils.success(res, {
            programmingModel: updatedConfig.programmingModel,
            multipleChoiceModel: updatedConfig.multipleChoiceModel,
            selectedProvider: updatedConfig.selectedProvider,
            extractionModel: updatedConfig.extractionModel,
            solutionModel: updatedConfig.solutionModel,
            debuggingModel: updatedConfig.debuggingModel,
            language: updatedConfig.language,
            opacity: updatedConfig.opacity,
            showCopyButton: updatedConfig.showCopyButton
        }, '配置更新成功');
    }
    catch (error) {
        console.error('更新配置错误:', error);
        response_1.ResponseUtils.internalError(res);
    }
});
router.get('/models', auth_1.authenticateToken, async (req, res) => {
    try {
        const modelMapping = {
            'claude-sonnet-4-20250514': 'claude-4-sonnet',
            'gemini-2.5-pro-deepsearch': 'gemini-pro-2.5',
            'gemini-2.5-flash-preview-04-17': 'gemini-flash-2.5',
            'gpt-4o': 'gpt-4o',
            'gpt-4o-mini': 'gpt-4o-mini',
            'o4-mini-high-all': 'o4-mini-high',
            'o4-mini-all': 'o4-mini'
        };
        const defaultModels = Object.entries(types_1.SUPPORTED_MODELS).flatMap(([provider, modelList]) => modelList.map(model => ({
            id: model.id,
            modelId: model.id,
            name: model.id,
            displayName: modelMapping[model.id] || model.name,
            provider: provider,
            category: model.category,
            isActive: true,
            priority: 0,
            description: `${modelMapping[model.id] || model.name} - ${provider}提供的AI模型`
        })));
        response_1.ResponseUtils.success(res, defaultModels);
    }
    catch (error) {
        console.error('获取模型列表错误:', error);
        response_1.ResponseUtils.internalError(res);
    }
});
router.get('/languages', auth_1.authenticateToken, async (req, res) => {
    try {
        response_1.ResponseUtils.success(res, types_1.PROGRAMMING_LANGUAGES);
    }
    catch (error) {
        console.error('获取编程语言列表错误:', error);
        response_1.ResponseUtils.internalError(res);
    }
});
router.post('/reset', auth_1.authenticateToken, async (req, res) => {
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
        const updatedConfig = await database_1.prisma.userConfig.upsert({
            where: { userId: req.user.userId },
            update: defaultConfig,
            create: {
                userId: req.user.userId,
                ...defaultConfig
            }
        });
        response_1.ResponseUtils.success(res, {
            programmingModel: updatedConfig.programmingModel,
            multipleChoiceModel: updatedConfig.multipleChoiceModel,
            selectedProvider: updatedConfig.selectedProvider,
            extractionModel: updatedConfig.extractionModel,
            solutionModel: updatedConfig.solutionModel,
            debuggingModel: updatedConfig.debuggingModel,
            language: updatedConfig.language,
            opacity: updatedConfig.opacity,
            showCopyButton: updatedConfig.showCopyButton
        }, '配置已重置为默认值');
    }
    catch (error) {
        console.error('重置配置错误:', error);
        response_1.ResponseUtils.internalError(res);
    }
});
router.get('/user/:userId', auth_1.authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        if (!req.user) {
            res.status(401).json({ error: '用户未认证' });
            return;
        }
        if (req.user.userId !== parseInt(userId)) {
            res.status(403).json({ error: '无权访问此用户配置' });
            return;
        }
        const config = await database_1.prisma.userConfig.findUnique({
            where: { userId: parseInt(userId) }
        });
        if (!config) {
            const defaultConfig = await database_1.prisma.userConfig.create({
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
                }
            });
            res.json({
                programmingModel: defaultConfig.programmingModel,
                multipleChoiceModel: defaultConfig.multipleChoiceModel,
                aiModel: defaultConfig.aiModel,
                language: defaultConfig.language,
                theme: defaultConfig.theme,
                shortcuts: JSON.parse(defaultConfig.shortcuts || '{}'),
                display: JSON.parse(defaultConfig.display || '{}'),
                processing: JSON.parse(defaultConfig.processing || '{}'),
                selectedProvider: defaultConfig.selectedProvider,
                extractionModel: defaultConfig.extractionModel,
                solutionModel: defaultConfig.solutionModel,
                debuggingModel: defaultConfig.debuggingModel,
                opacity: defaultConfig.opacity,
                showCopyButton: defaultConfig.showCopyButton
            });
        }
        let shortcuts = {};
        let display = {};
        let processing = {};
        try {
            shortcuts = JSON.parse(config.shortcuts || '{}');
            display = JSON.parse(config.display || '{}');
            processing = JSON.parse(config.processing || '{}');
        }
        catch (error) {
            console.warn('解析配置JSON字段失败:', error);
        }
        res.json({
            programmingModel: config.programmingModel,
            multipleChoiceModel: config.multipleChoiceModel,
            aiModel: config.aiModel,
            language: config.language,
            theme: config.theme,
            shortcuts,
            display,
            processing,
            selectedProvider: config.selectedProvider,
            extractionModel: config.extractionModel,
            solutionModel: config.solutionModel,
            debuggingModel: config.debuggingModel,
            opacity: config.opacity,
            showCopyButton: config.showCopyButton
        });
    }
    catch (error) {
        console.error('获取用户配置错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});
router.put('/user/:userId', auth_1.authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        if (!req.user || req.user.userId !== parseInt(userId)) {
            res.status(403).json({ error: '无权修改此用户配置' });
            return;
        }
        const updateData = {};
        if (req.body.programmingModel !== undefined) {
            updateData.programmingModel = req.body.programmingModel;
        }
        if (req.body.multipleChoiceModel !== undefined) {
            updateData.multipleChoiceModel = req.body.multipleChoiceModel;
        }
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
        const updatedConfig = await database_1.prisma.userConfig.upsert({
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
            }
        });
        res.json({
            message: '配置更新成功',
            config: {
                programmingModel: updatedConfig.programmingModel,
                multipleChoiceModel: updatedConfig.multipleChoiceModel,
                aiModel: updatedConfig.aiModel,
                language: updatedConfig.language,
                theme: updatedConfig.theme,
                shortcuts: JSON.parse(updatedConfig.shortcuts || '{}'),
                display: JSON.parse(updatedConfig.display || '{}'),
                processing: JSON.parse(updatedConfig.processing || '{}')
            }
        });
    }
    catch (error) {
        console.error('更新用户配置错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});
exports.default = router;
//# sourceMappingURL=config.js.map