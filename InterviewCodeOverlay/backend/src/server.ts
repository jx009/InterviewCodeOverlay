// 导入路由
import authRoutes from './routes/auth';
import authEnhancedRoutes from './routes/auth-enhanced';
import configRoutes from './routes/config';
import docsRoutes from './routes/docs';
import clientCreditsRoutes from './routes/client-credits';
import adminRoutes from './routes/admin';
import monitoringRoutes from './routes/monitoring';
import pointsRoutes from './routes/points';
import searchRoutes from './routes/search';
import paymentRoutes from './payment/routes/payment';

// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/auth-enhanced', authEnhancedRoutes);
app.use('/api/config', configRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/client/credits', clientCreditsRoutes); // 新增客户端积分API路由
app.use('/api/admin', adminRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/payment', paymentRoutes); 