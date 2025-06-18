"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prismaClient = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
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
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'InterviewCodeOverlay API'
    });
});
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await prismaClient.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });
        if (existingUser) {
            res.status(400).json({ error: '用户名或邮箱已存在' });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prismaClient.user.create({
            data: {
                username,
                email,
                password: hashedPassword
            }
        });
        await prismaClient.userConfig.create({
            data: {
                userId: user.id,
                aiModel: 'claude-3-5-sonnet-20241022',
                language: 'python',
                theme: 'system'
            }
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            message: '注册成功',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt
            },
            token
        });
    }
    catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await prismaClient.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email: username }
                ]
            }
        });
        if (!user) {
            res.status(401).json({ error: '用户名或密码错误' });
            return;
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ error: '用户名或密码错误' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            message: '登录成功',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt
            },
            token
        });
    }
    catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});
router.post('/oauth/callback', async (req, res) => {
    try {
        const { code, provider = 'github' } = req.body;
        let user = await prismaClient.user.findFirst({
            where: { email: `demo@${provider}.com` }
        });
        if (!user) {
            user = await prismaClient.user.create({
                data: {
                    username: `demo_${provider}_user`,
                    email: `demo@${provider}.com`,
                    password: await bcrypt_1.default.hash('demo_password', 10)
                }
            });
            await prismaClient.userConfig.create({
                data: {
                    userId: user.id,
                    aiModel: 'claude-3-5-sonnet-20241022',
                    language: 'python',
                    theme: 'system'
                }
            });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            message: 'OAuth登录成功',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt
            },
            token
        });
    }
    catch (error) {
        console.error('OAuth登录错误:', error);
        res.status(500).json({ error: 'OAuth登录失败' });
    }
});
router.get('/me', auth_1.authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: '用户未认证' });
            return;
        }
        const user = await prismaClient.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true
            }
        });
        if (!user) {
            res.status(404).json({ error: '用户不存在' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});
router.post('/logout', auth_1.authMiddleware, (req, res) => {
    res.json({ message: '登出成功' });
});
router.post('/refresh', auth_1.authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: '用户未认证' });
            return;
        }
        const newToken = jsonwebtoken_1.default.sign({ userId: req.user.userId }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            message: 'Token刷新成功',
            token: newToken
        });
    }
    catch (error) {
        console.error('Token刷新错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map