import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import * as fs from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import configRoutes from './src/routes/config';
import authRoutes from './src/routes/auth-enhanced';
import docsRoutes from './src/routes/docs';
import pointsRoutes from './src/routes/points';
import adminRoutes from './src/routes/admin';
import searchRoutes from './src/routes/search';
import paymentRoutes from './src/payment/routes/payment';
import monitoringRoutes from './src/routes/monitoring';
import clientCreditsRoutes from './src/routes/client-credits';
import { pointService } from './src/services/PointService';

// 加载环境变量
dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Redis客户端
let redisClient: any;
let redisStore: any;

// 初始化Redis连接
const initRedis = async () => {
  try {
    // 使用新的redis-working模块
    const { initRedis: initWorkingRedis } = require('./src/config/redis-working');
    await initWorkingRedis();
    
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      legacyMode: false,
    });

    await redisClient.connect();
    
    redisStore = new RedisStore({
      client: redisClient,
      prefix: 'myapp:',
    });

    console.log('Redis连接成功');
    return true;
  } catch (error) {
    console.error('Redis连接失败:', error);
    console.error('⚠️ 将尝试继续启动服务器，但部分功能可能不可用');
    return false;
  }
};

// 配置Cron定时任务
const setupScheduledJobs = () => {
  console.log('设置定时任务...');

  // 每天凌晨2点执行旧交易记录清理
  cron.schedule('0 2 * * *', async () => {
    console.log('开始执行定时任务: 清理3个月前的积分交易记录');
    try {
      const result = await pointService.cleanupOldTransactions();
      if (result.success) {
        console.log(`定时任务成功: 已清理 ${result.count} 条旧交易记录`);
      } else {
        console.error('定时任务失败: 清理旧交易记录时出错');
      }
    } catch (error) {
      console.error('执行定时任务时出错:', error);
    }
  });

  console.log('定时任务设置完成');
};

// 配置中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET || 'my-secret'));
app.use(express.urlencoded({ extended: true }));

// 配置会话
app.use(session({
  store: redisStore,
  secret: process.env.SESSION_SECRET || 'my-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24小时
  }
}));

// 注册路由
app.use('/api/auth-enhanced', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/client/credits', clientCreditsRoutes);

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 应用启动主函数
const startServer = async () => {
  try {
    // 初始化Redis
    await initRedis();
    
    // 初始化邮件服务
    const { initEmailTransporter } = require('./src/utils/email-service');
    console.log('正在初始化邮件服务...');
    await initEmailTransporter();
    
    // 设置定时任务
    setupScheduledJobs();
    
    // 启动服务器
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`增强认证服务器成功启动，监听端口: ${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 启动服务器
startServer(); 