import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { initializeDatabase, getConfig } from './config/database';
import { verifyEmailConfig } from './utils/email';
import { ResponseUtils } from './utils/response';

// 导入路由
import authRoutes from './routes/auth';
import configRoutes from './routes/config';
import inviteRoutes from './routes/invite-simple';
// 导入支付路由
import { paymentRoutes } from './payment';

const app = express();

// 启动服务器函数
async function startServer() {
  try {
    // 1. 初始化数据库和配置
    console.log('🔧 正在初始化配置和数据库...');
    await initializeDatabase();
    
    // 2. 获取配置
    const config = getConfig();
    
    // 3. 验证邮件配置（可选）
    try {
      await verifyEmailConfig();
    } catch (error) {
      console.warn('⚠️ 邮件服务配置验证失败，但不影响启动:', error);
    }
    
    const PORT = process.env.PORT || 3001;
    const WEB_PORT = process.env.WEB_PORT || 3000;

    // 基础中间件
    app.use(helmet({
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

    app.use(compression());

    // CORS配置
    const corsOptions = {
      origin: process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000', 
        'http://localhost:54321',
        `http://localhost:${WEB_PORT}`
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Session-Id'],
    };
    app.use(cors(corsOptions));

    // 请求日志
    if (config.app.debug) {
      app.use(morgan('dev'));
    } else {
      app.use(morgan('combined'));
    }

    // 请求体解析
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 静态文件服务
    app.use(express.static(path.join(__dirname, '../public')));

    // 速率限制
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15分钟
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 限制每个IP每15分钟最多100个请求
      message: {
        success: false,
        error: '请求过于频繁，请稍后再试'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);

    // 健康检查端点
    app.get('/health', (req, res) => {
      ResponseUtils.success(res, {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.app.environment,
        version: config.app.version,
        database: 'mysql',
        redis: 'connected'
      });
    });

    // 添加会话状态检查路由
    app.get('/api/session_status', async (req, res) => {
      try {
        console.log('📝 收到会话状态检查请求', { 
          headers: {
            'x-session-id': req.headers['x-session-id'] ? '存在' : '不存在',
            'authorization': req.headers.authorization ? '存在' : '不存在'
          }
        });
        
        const sessionId = req.headers['x-session-id'] as string;
        
        if (!sessionId) {
          console.log('❌ 未提供会话ID');
          return res.json({
            success: false,
            message: '未提供会话ID'
          });
        }
        
        // 使用正确的导入路径
        const { SessionManager } = require('./config/redis-simple');
        const sessionManager = new SessionManager();
        const sessionValidation = await sessionManager.validateSession(sessionId);
        
        if (!sessionValidation.valid) {
          console.log('❌ 会话无效', sessionValidation);
          return res.json({
            success: false,
            message: '会话已过期或无效'
          });
        }
        
        // 获取用户信息
        const { prisma } = require('./config/database');
        const user = await prisma.user.findUnique({
          where: { id: sessionValidation.userId },
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true
          }
        });

        if (!user) {
          console.log('❌ 用户不存在', { userId: sessionValidation.userId });
          return res.json({
            success: false,
            message: '用户不存在'
          });
        }

        // 生成JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          { 
            userId: user.id, 
            username: user.username,
            email: user.email
          },
          config.security.jwtSecret,
          { expiresIn: '7d' }
        );

        console.log('✅ 会话有效，已生成token', { userId: user.id, username: user.username });
        return res.json({
          success: true,
          user,
          sessionId,
          token
        });
      } catch (error) {
        console.error('❌ 会话状态检查失败:', error);
        return res.status(500).json({ 
          success: false,
          error: '服务器内部错误'
        });
      }
    });

    // OAuth路由（用于客户端认证）
    app.get('/login', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/login.html'));
    });

    app.get('/auth/success', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/auth-success.html'));
    });

    app.get('/auth/error', (req, res) => {
      res.status(400).json({ 
        error: '认证失败',
        message: '登录过程中发生错误，请重试'
      });
    });

    // API路由
    app.use('/api/auth', authRoutes);
    app.use('/api/config', configRoutes);
    app.use('/api/invite', inviteRoutes);
    
    // 支付路由
    app.use('/api/payment', paymentRoutes);
    
    // 积分系统路由
    const pointsRoutes = require('./routes/points').default;
    app.use('/api/points', pointsRoutes);
    
    // 搜题路由
    const searchRoutes = require('./routes/search').default;
    app.use('/api/search', searchRoutes);
    
    // 管理员路由
    const adminRoutes = require('./routes/admin').default;
    app.use('/api/admin', adminRoutes);
    
    // 监控路由
    const monitoringRoutes = require('./routes/monitoring').default;
    app.use('/api/monitoring', monitoringRoutes);
    
    // API文档路由
    const docsRoutes = require('./routes/docs').default;
    app.use('/api/docs', docsRoutes);

    // 404处理
    app.use('*', (req, res) => {
      ResponseUtils.notFound(res, '请求的资源不存在');
    });

    // 全局错误处理中间件
    app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('服务器错误:', error);

      // 处理特定类型的错误
      if (error.name === 'ValidationError') {
        return ResponseUtils.validationError(res, [error.message]);
      }

      if (error.name === 'JsonWebTokenError') {
        return ResponseUtils.unauthorized(res, 'Token无效');
      }

      if (error.name === 'TokenExpiredError') {
        return ResponseUtils.unauthorized(res, 'Token已过期');
      }

      if (error.code === 'P2002') { // Prisma unique constraint error
        return ResponseUtils.error(res, '数据已存在', 409);
      }

      if (error.code === 'P2025') { // Prisma record not found error
        return ResponseUtils.notFound(res, '记录不存在');
      }

      // 默认服务器错误
      ResponseUtils.internalError(res, 
        config.app.debug ? error.message : '服务器内部错误'
      );
    });
    
    // 启动HTTP服务器
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
  } catch (error) {
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

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动服务器
startServer(); 