"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../utils/auth");
const response_1 = require("../utils/response");
const auth_2 = require("../middleware/auth");
const router = (0, express_1.Router)();
const registerValidation = [
    (0, express_validator_1.body)('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('用户名长度应在3-20个字符之间')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('用户名只能包含字母、数字和下划线'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('密码长度至少6个字符'),
    (0, express_validator_1.body)('email')
        .optional()
        .isEmail()
        .withMessage('邮箱格式不正确')
];
const loginValidation = [
    (0, express_validator_1.body)('username').notEmpty().withMessage('用户名不能为空'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('密码不能为空')
];
router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return response_1.ResponseUtils.validationError(res, errors.array().map(err => err.msg));
        }
        const { username, password, email } = req.body;
        const existingUser = await database_1.prisma.user.findUnique({
            where: { username }
        });
        if (existingUser) {
            return response_1.ResponseUtils.error(res, '用户名已存在', 409);
        }
        if (email) {
            const existingEmail = await database_1.prisma.user.findUnique({
                where: { email }
            });
            if (existingEmail) {
                return response_1.ResponseUtils.error(res, '邮箱已被使用', 409);
            }
        }
        const hashedPassword = await auth_1.AuthUtils.hashPassword(password);
        const user = await database_1.prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                email: email || null
            }
        });
        await database_1.prisma.userConfig.create({
            data: {
                userId: user.id,
                selectedProvider: 'claude',
                extractionModel: 'claude-3-7-sonnet-20250219',
                solutionModel: 'claude-3-7-sonnet-20250219',
                debuggingModel: 'claude-3-7-sonnet-20250219',
                language: 'python'
            }
        });
        response_1.ResponseUtils.success(res, {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt
        }, '用户注册成功');
    }
    catch (error) {
        console.error('注册错误:', error);
        response_1.ResponseUtils.internalError(res);
    }
});
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return response_1.ResponseUtils.validationError(res, errors.array().map(err => err.msg));
        }
        const { username, password } = req.body;
        const user = await database_1.prisma.user.findUnique({
            where: { username }
        });
        if (!user || !user.isActive) {
            return response_1.ResponseUtils.unauthorized(res, '用户名或密码错误');
        }
        const isValidPassword = await auth_1.AuthUtils.verifyPassword(password, user.password);
        if (!isValidPassword) {
            return response_1.ResponseUtils.unauthorized(res, '用户名或密码错误');
        }
        const userPayload = {
            id: user.id,
            username: user.username,
            email: user.email
        };
        const accessToken = auth_1.AuthUtils.generateAccessToken(userPayload);
        const refreshToken = auth_1.AuthUtils.generateRefreshToken(userPayload);
        await database_1.prisma.userSession.create({
            data: {
                userId: user.id,
                token: accessToken,
                refreshToken,
                expiresAt: auth_1.AuthUtils.getTokenExpirationDate()
            }
        });
        response_1.ResponseUtils.success(res, {
            token: accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '1h',
            user: userPayload
        }, '登录成功');
    }
    catch (error) {
        console.error('登录错误:', error);
        response_1.ResponseUtils.internalError(res);
    }
});
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return response_1.ResponseUtils.error(res, '未提供刷新令牌', 400);
        }
        const decoded = auth_1.AuthUtils.verifyRefreshToken(refreshToken);
        if (!decoded) {
            return response_1.ResponseUtils.unauthorized(res, '刷新令牌无效');
        }
        const session = await database_1.prisma.userSession.findUnique({
            where: { refreshToken },
            include: { user: true }
        });
        if (!session || !session.isActive || session.expiresAt < new Date()) {
            return response_1.ResponseUtils.unauthorized(res, '刷新令牌已过期');
        }
        const userPayload = {
            id: session.user.id,
            username: session.user.username,
            email: session.user.email
        };
        const newAccessToken = auth_1.AuthUtils.generateAccessToken(userPayload);
        const newRefreshToken = auth_1.AuthUtils.generateRefreshToken(userPayload);
        await database_1.prisma.userSession.update({
            where: { id: session.id },
            data: {
                token: newAccessToken,
                refreshToken: newRefreshToken,
                expiresAt: auth_1.AuthUtils.getTokenExpirationDate()
            }
        });
        response_1.ResponseUtils.success(res, {
            token: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '1h',
            user: userPayload
        });
    }
    catch (error) {
        console.error('刷新token错误:', error);
        response_1.ResponseUtils.internalError(res);
    }
});
router.get('/me', auth_2.authenticateToken, async (req, res) => {
    try {
        const user = await database_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            return response_1.ResponseUtils.notFound(res, '用户不存在');
        }
        response_1.ResponseUtils.success(res, user);
    }
    catch (error) {
        console.error('获取用户信息错误:', error);
        response_1.ResponseUtils.internalError(res);
    }
});
router.post('/logout', auth_2.authenticateToken, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = auth_1.AuthUtils.extractBearerToken(authHeader);
        if (token) {
            await database_1.prisma.userSession.updateMany({
                where: {
                    userId: req.user.id,
                    token: token
                },
                data: {
                    isActive: false
                }
            });
        }
        response_1.ResponseUtils.success(res, null, '登出成功');
    }
    catch (error) {
        console.error('登出错误:', error);
        response_1.ResponseUtils.internalError(res);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map