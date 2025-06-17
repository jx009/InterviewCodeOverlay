import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { ResponseUtils } from './utils/response';

// 导入路由
import authRoutes from './routes/auth';
import configRoutes from './routes/config';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 基础中间件
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());

// CORS配置
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:54321'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// 请求日志
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    environment: process.env.NODE_ENV || 'development'
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);

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
    process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
  );
});

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await connectDatabase();
    
    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📝 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API地址: http://localhost:${PORT}`);
      console.log(`💚 健康检查: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
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