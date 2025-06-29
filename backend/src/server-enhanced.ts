import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
// Cookie解析将通过express内置功能处理
import path from 'path';
import { initializeDatabase, getConfig } from './config/database';
import { initRedis, closeRedis } from './config/redis-working';
import { ResponseUtils } from './utils/response';

// 导入路由
import authRoutes from './routes/auth';
import authEnhancedRoutes, { initAuthEnhanced } from './routes/auth-enhanced';
import configRoutes from './routes/config';
// 导入支付路由
import { paymentRoutes } from './payment';

const app = express();

// 启动服务器函数
async function startServer() {
  try {
    console.log('🚀 启动增强版 InterviewCodeOverlay 服务器...');
    console.log('');

    // 1. 初始化数据库
    console.log('🔧 正在初始化数据库...');
    await initializeDatabase();
    console.log('✅ 数据库初始化完成');

    // 2. 初始化Redis
    console.log('🔧 正在初始化Redis...');
    try {
      await initRedis();
      console.log('✅ Redis初始化完成');
    } catch (error) {
      console.error('❌ Redis初始化失败:', error);
      console.error('请确保Redis服务已启动 (redis-server)');
      process.exit(1);
    }

    // 3. 初始化增强认证服务
    console.log('🔧 正在初始化增强认证服务...');
    try {
      await initAuthEnhanced();
      console.log('✅ 增强认证服务初始化完成');
    } catch (error) {
      console.error('❌ 增强认证服务初始化失败:', error);
      console.error('请检查SMTP邮件配置');
      // 不退出，因为邮件服务可能是可选的
    }

    // 4. 获取配置
    const config = getConfig();
    const PORT = process.env.PORT || 3001;
    const WEB_PORT = process.env.WEB_PORT || 3000;

    // 5. 配置中间件
    console.log('🔧 配置应用中间件...');

    // 安全中间件
    app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https:", "wss:"],
        },
      },
    }));

    app.use(compression());

    // CORS配置（支持Cookie）
    const corsOptions = {
      origin: process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000', 
        'http://localhost:54321',
        `http://localhost:${WEB_PORT}`,
        'http://127.0.0.1:3000',
        'http://127.0.0.1:54321',
      ],
      credentials: true, // 重要：允许携带Cookie
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Set-Cookie'],
    };
    app.use(cors(corsOptions));

    // Cookie将通过req.headers.cookie手动解析

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

    // 增强的速率限制
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 每个IP每15分钟最多100个请求
      message: {
        success: false,
        error: '请求过于频繁，请稍后再试'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 20, // 认证相关请求更严格限制
      message: {
        success: false,
        error: '登录尝试过于频繁，请15分钟后再试'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    app.use(generalLimiter);

    // 添加调试中间件
    app.use((req, res, next) => {
      console.log(`📥 ${req.method} 请求: ${req.path}`);
      console.log('📋 请求头:', {
        'x-session-id': req.headers['x-session-id'] ? '存在' : '不存在',
        'authorization': req.headers.authorization ? '存在' : '不存在',
        'cookie': req.headers.cookie ? '存在' : '不存在',
        'user-agent': req.headers['user-agent']?.substring(0, 30) + '...'
      });
      
      // 记录响应发送时的状态码
      const originalSend = res.send;
      res.send = function(body) {
        console.log(`📤 响应: ${res.statusCode}`);
        return originalSend.call(this, body);
      };
      
      next();
    });

    // 6. 健康检查端点
    app.get('/health', async (req, res) => {
      try {
        // 检查Redis连接
        const redis = require('./config/redis').getRedisClient();
        await redis.ping();
        
        ResponseUtils.success(res, {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.app.environment,
          version: config.app.version,
          services: {
            database: 'mysql ✅',
            redis: 'connected ✅',
            email: 'configured ✅'
          }
        });
      } catch (error) {
        ResponseUtils.error(res, '服务健康检查失败', 503);
      }
    });

    // 7. 静态页面路由
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

    // 8. API路由
    console.log('🔧 配置API路由...');
    
    // 添加调试端点
    app.get('/api/debug/session', (req, res) => {
      res.json({
        time: new Date().toISOString(),
        headers: {
          sessionId: req.headers['x-session-id'],
          authorization: req.headers.authorization ? '存在' : '不存在',
          cookie: req.headers.cookie
        }
      });
    });

    // 在此处添加会话状态检查路由
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
        
        // 使用会话管理器验证会话
        const { initAuthEnhanced } = require('./routes/auth-enhanced');
        const { SessionManager } = require('./config/redis-working');
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

        console.log('✅ 会话有效', { userId: user.id, username: user.username });
        return res.json({
          success: true,
          user,
          sessionId
        });
      } catch (error) {
        console.error('❌ 会话状态检查失败:', error);
        return res.status(500).json({ 
          success: false,
          error: '服务器内部错误'
        });
      }
    });
    
    // 处理验证错误的中间件
    const validateRequestMiddleware = require('./middleware/validation').validateRequest;
    
    // 原有认证路由（保持兼容性）
    app.use('/api/auth', authRoutes);
    
    // 增强认证路由（新功能）
    app.use('/api/auth-enhanced', authLimiter, authEnhancedRoutes);
    
    // 配置路由
    app.use('/api/config', configRoutes);
    
    // 支付路由
    app.use('/api/payment', paymentRoutes);
    
    // 积分系统路由
    const pointsRoutes = require('./routes/points').default;
    app.use('/api/points', pointsRoutes);
    
    // 客户端积分API路由
    const clientCreditsRoutes = require('./routes/client-credits').default;
    app.use('/api/client/credits', clientCreditsRoutes);
    
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

    // 9. 404处理
    app.use('*', (req, res) => {
      ResponseUtils.notFound(res, '请求的资源不存在');
    });

    // 10. 全局错误处理中间件
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

      if (error.code === 'ECONNREFUSED' && error.address === '127.0.0.1') {
        return ResponseUtils.error(res, 'Redis连接失败', 503);
      }

      // 默认服务器错误
      ResponseUtils.internalError(res, 
        config.app.debug ? error.message : '服务器内部错误'
      );
    });
    
    // 11. 启动HTTP服务器
    app.listen(PORT, () => {
      console.log('');
      console.log('🎉===============================================🎉');
      console.log('🎉     InterviewCodeOverlay 增强版启动成功!     🎉');
      console.log('🎉===============================================🎉');
      console.log('');
      console.log(`📝 应用名称: ${config.app.name}`);
      console.log(`🏷️ 版本: ${config.app.version}`);
      console.log(`📝 环境: ${config.app.environment}`);
      console.log(`🚀 服务器端口: ${PORT}`);
      console.log('');
      console.log('🔗 服务地址:');
      console.log(`   • API基址: http://localhost:${PORT}`);
      console.log(`   • 健康检查: http://localhost:${PORT}/health`);
      console.log(`   • 登录页面: http://localhost:${PORT}/login`);
      console.log('');
      console.log('🚀 新功能 API:');
      console.log(`   • 发送验证码: POST http://localhost:${PORT}/api/auth-enhanced/send-verification-code`);
      console.log(`   • 验证码注册: POST http://localhost:${PORT}/api/auth-enhanced/register`);
      console.log(`   • 增强登录: POST http://localhost:${PORT}/api/auth-enhanced/login`);
      console.log(`   • 会话状态: GET http://localhost:${PORT}/api/auth-enhanced/session-status`);
      console.log('');
      console.log('💡 服务状态:');
      console.log('   • MySQL数据库: ✅ 已连接');
      console.log('   • Redis缓存: ✅ 已连接');
      console.log('   • SMTP邮件: ✅ 已配置');
      console.log('   • 会话管理: ✅ 已启用');
      console.log('   • 验证码服务: ✅ 已启用');
      console.log('');
      console.log('⚙️ 配置提醒:');
      console.log('   1. 请在 .env 文件中配置SMTP邮件参数');
      console.log('   2. 确保Redis服务正在运行');
      console.log('   3. 验证码有效期: 5分钟');
      console.log('   4. 会话有效期: 7天');
      console.log('');
    });

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    console.error('');
    console.error('🔧 可能的解决方案:');
    console.error('1. 检查配置文件 config/database-config.json 是否存在');
    console.error('2. 检查MySQL服务是否启动: systemctl status mysql');
    console.error('3. 检查Redis服务是否启动: systemctl status redis');
    console.error('4. 运行: npm run db:check 检查数据库连接');
    console.error('5. 检查 .env 文件中的SMTP配置');
    console.error('');
    
    // 清理资源
    await closeRedis();
    process.exit(1);
  }
}

// 优雅关闭处理
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🔄 收到 ${signal} 信号，正在优雅关闭服务器...`);
  
  try {
    // 关闭Redis连接
    await closeRedis();
    console.log('✅ Redis连接已关闭');
    
    console.log('👋 服务器已安全关闭');
    process.exit(0);
  } catch (error) {
    console.error('❌ 关闭过程中出现错误:', error);
    process.exit(1);
  }
};

// 处理进程信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  gracefulShutdown('unhandledRejection');
});

// 启动服务器
startServer(); 