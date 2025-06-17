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
            where: { userId: req.user.id }
        });
        if (!config) {
            const defaultConfig = await database_1.prisma.userConfig.create({
                data: {
                    userId: req.user.id,
                    selectedProvider: 'claude',
                    extractionModel: 'claude-3-7-sonnet-20250219',
                    solutionModel: 'claude-3-7-sonnet-20250219',
                    debuggingModel: 'claude-3-7-sonnet-20250219',
                    language: 'python'
                }
            });
            return response_1.ResponseUtils.success(res, {
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
            where: { userId: req.user.id },
            update: updateData,
            create: {
                userId: req.user.id,
                selectedProvider: updateData.selectedProvider || 'claude',
                extractionModel: updateData.extractionModel || 'claude-3-7-sonnet-20250219',
                solutionModel: updateData.solutionModel || 'claude-3-7-sonnet-20250219',
                debuggingModel: updateData.debuggingModel || 'claude-3-7-sonnet-20250219',
                language: updateData.language || 'python',
                opacity: updateData.opacity || 1.0,
                showCopyButton: updateData.showCopyButton !== undefined ? updateData.showCopyButton : true
            }
        });
        response_1.ResponseUtils.success(res, {
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
        const models = await database_1.prisma.aIModel.findMany({
            where: { isActive: true },
            orderBy: [
                { provider: 'asc' },
                { priority: 'desc' },
                { name: 'asc' }
            ]
        });
        if (models.length === 0) {
            const defaultModels = Object.entries(types_1.SUPPORTED_MODELS).flatMap(([provider, modelList]) => modelList.map(model => ({
                id: model.id,
                modelId: model.id,
                name: model.name,
                provider: provider,
                category: model.category,
                isActive: true,
                priority: 0
            })));
            return response_1.ResponseUtils.success(res, {
                models: defaultModels,
                providers: ['claude', 'gemini', 'openai']
            });
        }
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
        }, {});
        response_1.ResponseUtils.success(res, {
            models: groupedModels,
            providers: Object.keys(groupedModels)
        });
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
            selectedProvider: 'claude',
            extractionModel: 'claude-3-7-sonnet-20250219',
            solutionModel: 'claude-3-7-sonnet-20250219',
            debuggingModel: 'claude-3-7-sonnet-20250219',
            language: 'python',
            opacity: 1.0,
            showCopyButton: true
        };
        const updatedConfig = await database_1.prisma.userConfig.upsert({
            where: { userId: req.user.id },
            update: defaultConfig,
            create: {
                userId: req.user.id,
                ...defaultConfig
            }
        });
        response_1.ResponseUtils.success(res, {
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
exports.default = router;
//# sourceMappingURL=config.js.map