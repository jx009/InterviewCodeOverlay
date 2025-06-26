"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
const email_1 = require("./utils/email");
const response_1 = require("./utils/response");
const auth_1 = __importDefault(require("./routes/auth"));
const config_1 = __importDefault(require("./routes/config"));
const payment_1 = require("./payment");
const app = (0, express_1.default)();
async function startServer() {
    try {
        console.log('🔧 正在初始化配置和数据库...');
        await (0, database_1.initializeDatabase)();
        const config = (0, database_1.getConfig)();
        try {
            await (0, email_1.verifyEmailConfig)();
        }
        catch (error) {
            console.warn('⚠️ 邮件服务配置验证失败，但不影响启动:', error);
        }
        const PORT = process.env.PORT || 3001;
        const WEB_PORT = process.env.WEB_PORT || 3000;
        app.use((0, helmet_1.default)({
            crossOriginEmbedderPolicy: false,
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
        }));
        app.use((0, compression_1.default)());
        const corsOptions = {
            origin: process.env.CORS_ORIGIN?.split(',') || [
                'http://localhost:3000',
                'http://localhost:54321',
                `http://localhost:${WEB_PORT}`
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        };
        app.use((0, cors_1.default)(corsOptions));
        if (config.app.debug) {
            app.use((0, morgan_1.default)('dev'));
        }
        else {
            app.use((0, morgan_1.default)('combined'));
        }
        app.use(express_1.default.json({ limit: '10mb' }));
        app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
            message: {
                success: false,
                error: '请求过于频繁，请稍后再试'
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
        app.use(limiter);
        app.get('/health', (req, res) => {
            response_1.ResponseUtils.success(res, {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: config.app.environment,
                version: config.app.version,
                database: 'mysql',
                redis: 'connected'
            });
        });
        app.get('/login', (req, res) => {
            res.sendFile(path_1.default.join(__dirname, '../public/login.html'));
        });
        app.get('/auth/success', (req, res) => {
            res.sendFile(path_1.default.join(__dirname, '../public/auth-success.html'));
        });
        app.get('/auth/error', (req, res) => {
            res.status(400).json({
                error: '认证失败',
                message: '登录过程中发生错误，请重试'
            });
        });
        app.use('/api/auth', auth_1.default);
        app.use('/api/config', config_1.default);
        app.use('/api/payment', payment_1.paymentRoutes);
        const pointsRoutes = require('./routes/points').default;
        app.use('/api/points', pointsRoutes);
        const searchRoutes = require('./routes/search').default;
        app.use('/api/search', searchRoutes);
        const adminRoutes = require('./routes/admin').default;
        app.use('/api/admin', adminRoutes);
        const monitoringRoutes = require('./routes/monitoring').default;
        app.use('/api/monitoring', monitoringRoutes);
        const docsRoutes = require('./routes/docs').default;
        app.use('/api/docs', docsRoutes);
        app.use('*', (req, res) => {
            response_1.ResponseUtils.notFound(res, '请求的资源不存在');
        });
        app.use((error, req, res, next) => {
            console.error('服务器错误:', error);
            if (error.name === 'ValidationError') {
                return response_1.ResponseUtils.validationError(res, [error.message]);
            }
            if (error.name === 'JsonWebTokenError') {
                return response_1.ResponseUtils.unauthorized(res, 'Token无效');
            }
            if (error.name === 'TokenExpiredError') {
                return response_1.ResponseUtils.unauthorized(res, 'Token已过期');
            }
            if (error.code === 'P2002') {
                return response_1.ResponseUtils.error(res, '数据已存在', 409);
            }
            if (error.code === 'P2025') {
                return response_1.ResponseUtils.notFound(res, '记录不存在');
            }
            response_1.ResponseUtils.internalError(res, config.app.debug ? error.message : '服务器内部错误');
        });
        app.listen(PORT, () => {
            console.log('');
            console.log('🎉 服务器启动成功!');
            console.log(`📝 应用名称: ${config.app.name}`);
            console.log(`🏷️ 版本: ${config.app.version}`);
            console.log(`📝 环境: ${config.app.environment}`);
            console.log(`🚀 服务器运行在端口: ${PORT}`);
            console.log(`🔗 API地址: http://localhost:${PORT}`);
            console.log(`💚 健康检查: http://localhost:${PORT}/health`);
            console.log(`🔐 登录页面: http://localhost:${PORT}/login`);
            console.log('');
        });
    }
    catch (error) {
        console.error('❌ 服务器启动失败:', error);
        console.error('');
        console.error('可能的解决方案:');
        console.error('1. 检查配置文件 config/database-config.json 是否存在');
        console.error('2. 检查MySQL服务是否启动');
        console.error('3. 检查Redis服务是否启动 (可选)');
        console.error('4. 运行: npm run db:check 检查数据库连接');
        console.error('');
        process.exit(1);
    }
}
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    process.exit(1);
});
startServer();
//# sourceMappingURL=server.js.map