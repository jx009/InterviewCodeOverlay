const express = require('express');
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { v4: uuidv4 } = require('uuid');
const WechatPayV2Service = require('../services/WechatPayV2Service');
const InviteService = require('../../dist/services/InviteService').InviteService;

const router = express.Router();
const wechatPay = new WechatPayV2Service();

// 通过中间件获取数据库实例（由server-simple.js提供）
const getDatabase = (req) => {
  return req.app.locals.db || global.db;
};

// 生产级认证中间件 - 与server-simple.js完全一致
async function requireAuth(req, res, next) {
  try {
    console.log('🔐 充值模块认证检查...');
    
    // 支持从Cookie或请求头获取sessionId
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'] || req.headers.authorization?.replace('Bearer ', '');
    console.log('📋 请求中的sessionId:', sessionId ? sessionId.substring(0, 10) + '...' : '无');
    
    if (!sessionId) {
      console.log('❌ 未找到sessionId');
      return res.status(401).json({ 
        success: false,
        message: '未登录' 
      });
    }
    
    // 使用与server-simple.js相同的SessionStore
    const sessionData = await getSessionData(sessionId);
    console.log('🗄️ 从存储中获取会话数据:', sessionData ? '存在' : '不存在');
    
    if (!sessionData) {
      console.log('❌ 会话数据不存在或已过期');
      return res.status(401).json({ 
        success: false,
        message: '会话已过期' 
      });
    }
    
    // 更新最后活动时间
    sessionData.lastActivity = new Date().toISOString();
    await setSessionData(sessionId, sessionData, 1209600); // 14天TTL (2周)
    
    // 将用户信息和sessionId添加到请求对象
    req.user = {
      userId: sessionData.userId,
      username: sessionData.username,
      email: sessionData.email,
      role: sessionData.role
    };
    req.userId = sessionData.userId;
    req.sessionId = sessionId;
    
    console.log(`✅ 充值模块认证成功: ${sessionData.username} (${sessionData.email})`);
    next();
  } catch (error) {
    console.error('❌ 充值模块认证中间件错误:', error);
    return res.status(500).json({ 
      success: false,
      message: '认证服务异常' 
    });
  }
}

// 会话数据获取函数 - 复用server-simple.js的逻辑
async function getSessionData(sessionId) {
  try {
    // 尝试从Redis获取
    const config = loadServerConfig();
    if (config && config.redis) {
      const Redis = require('ioredis');
      const redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.database || 0,
        keyPrefix: config.redis.keyPrefix || 'interview_coder:',
        retryDelayOnFailover: config.redis.retryDelayOnFailover || 100,
        maxRetriesPerRequest: config.redis.maxRetriesPerRequest || 3,
        lazyConnect: config.redis.lazyConnect || true,
        keepAlive: config.redis.keepAlive || 30000
      });

      try {
        const data = await redisClient.get(`session:${sessionId}`);
        await redisClient.quit();
        return data ? JSON.parse(data) : null;
      } catch (redisError) {
        console.error('Redis get error:', redisError);
        await redisClient.quit();
        return null;
      }
    }
    
    // 如果Redis不可用，返回null（在生产环境中会话必须在Redis中）
    console.log('⚠️ Redis配置不可用，无法验证会话');
    return null;
  } catch (error) {
    console.error('获取会话数据失败:', error);
    return null;
  }
}

// 会话数据设置函数
async function setSessionData(sessionId, sessionData, ttl) {
  try {
    const config = loadServerConfig();
    if (config && config.redis) {
      const Redis = require('ioredis');
      const redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.database || 0,
        keyPrefix: config.redis.keyPrefix || 'interview_coder:',
        retryDelayOnFailover: config.redis.retryDelayOnFailover || 100,
        maxRetriesPerRequest: config.redis.maxRetriesPerRequest || 3,
        lazyConnect: config.redis.lazyConnect || true,
        keepAlive: config.redis.keepAlive || 30000
      });

      try {
        await redisClient.setex(`session:${sessionId}`, ttl, JSON.stringify(sessionData));
        await redisClient.quit();
        return true;
      } catch (redisError) {
        console.error('Redis set error:', redisError);
        await redisClient.quit();
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('设置会话数据失败:', error);
    return false;
  }
}

// 加载服务器配置的辅助函数
function loadServerConfig() {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../../config', 'database-config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.log('⚠️ 配置文件加载失败，使用默认配置');
    return null;
  }
}

// 生成订单号
function generateOrderNo() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORDER${timestamp}${random}`;
}

// 获取客户端IP
function getClientIp(req) {
  let ip = req.headers['x-forwarded-for'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           '127.0.0.1';
  
  // 处理IPv6地址，转换为IPv4
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }
  
  // 如果是IPv6格式，提取IPv4部分
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  
  // 确保返回有效的IPv4地址
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) {
    ip = '127.0.0.1';
  }
  
  return ip;
}

/**
 * GET /api/recharge/packages
 * 获取充值套餐列表
 */
router.get('/packages', async (req, res) => {
  try {
    console.log('🔍 收到充值套餐请求');
    
    // 获取数据库实例 
    const database = getDatabase(req);
    if (!database || !database.prisma) {
      console.error('❌ 数据库实例不可用');
      return res.status(500).json({
        success: false,
        message: '数据库服务不可用',
        errorCode: 'DATABASE_UNAVAILABLE'
      });
    }
    
    console.log('📋 正在查询数据库...');
    
    // 从数据库读取充值套餐
    const packages = await database.prisma.paymentPackage.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        amount: true,
        points: true,
        bonusPoints: true,
        isActive: true,
        sortOrder: true,
        icon: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { sortOrder: 'asc' },      // 按排序权重排序
        { id: 'asc' }              // 最后按ID排序
      ]
    });
    
    console.log(`✅ 查询成功，获得 ${packages.length} 个套餐`);
    
    const formattedPackages = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      amount: parseFloat(pkg.amount), // 转换Decimal为number
      points: pkg.points,
      bonusPoints: pkg.bonusPoints,
      totalPoints: pkg.points + pkg.bonusPoints,
      icon: pkg.icon
    }));
    
    console.log('📦 格式化完成，返回数据');
    
    res.json({
      success: true,
      data: formattedPackages
    });
  } catch (error) {
    console.error('❌ 获取充值套餐失败 - 详细错误信息:');
    console.error('  错误类型:', error.constructor.name);
    console.error('  错误消息:', error.message);
    console.error('  错误代码:', error.code);
    console.error('  错误堆栈:', error.stack);
    
    // 检查是否是数据库连接问题
    if (error.message && error.message.includes('connect')) {
      console.error('🔍 可能是数据库连接问题');
    }
    
    // 检查是否是Prisma相关错误
    if (error.constructor.name === 'PrismaClientKnownRequestError') {
      console.error('🔍 Prisma已知错误 - 错误代码:', error.code);
      console.error('🔍 Prisma错误详情:', error.meta);
    }
    
    // 检查是否是初始化问题
    if (error.message && error.message.includes('prisma')) {
      console.error('🔍 可能是Prisma实例初始化问题');
    }
    
    res.status(500).json({
      success: false,
      message: '获取充值套餐失败: ' + error.message,
      errorCode: error.code || 'UNKNOWN_ERROR',
      // 在开发环境下提供更多错误信息
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        errorType: error.constructor.name
      })
    });
  }
});

/**
 * POST /api/recharge/create-order
 * 创建充值订单
 */
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.userId;

    // 获取数据库实例
    const database = getDatabase(req);
    if (!database || !database.prisma) {
      return res.status(500).json({
        success: false,
        message: '数据库服务不可用',
        errorCode: 'DATABASE_UNAVAILABLE'
      });
    }
    
    // 从数据库验证套餐
    const package = await database.prisma.paymentPackage.findFirst({
      where: {
        id: packageId,
        isActive: true
      }
    });
    
    if (!package) {
      return res.status(400).json({
        success: false,
        message: '无效的充值套餐'
      });
    }

    // 生成订单信息
    const orderNo = generateOrderNo();
    const outTradeNo = `RECHARGE_${orderNo}`;
    const totalFee = wechatPay.yuanToFen(parseFloat(package.amount)); // 转换Decimal为number
    const clientIp = getClientIp(req);
    
    // 订单过期时间（30分钟）
    const expireTime = new Date(Date.now() + 30 * 60 * 1000);
    const formattedExpireTime = wechatPay.formatExpireTime(30);

    // 保存订单到数据库
    const createData = {
      orderNo,
      outTradeNo,
      userId,
      amount: parseFloat(package.amount), // 转换Decimal为number
      points: package.points,
      bonusPoints: package.bonusPoints,
      paymentMethod: 'WECHAT_PAY',
      paymentStatus: 'PENDING',
      expireTime,
      packageId: package.id, // 数据库中的套餐一定有有效ID
      metadata: JSON.stringify({
        packageName: package.name,
        clientIp
      })
    };
    
    await database.prisma.paymentOrder.create({
      data: createData
    });

    // 调用微信支付统一下单
    const wechatResult = await wechatPay.createUnifiedOrder({
      outTradeNo,
      totalFee,
      body: `Recharge ${package.points + package.bonusPoints} Points`,
      spbillCreateIp: clientIp,
      timeExpire: formattedExpireTime
    });

    if (!wechatResult.success) {
      console.error('微信支付统一下单失败:', wechatResult.error || '未知错误');
      
      // 更新订单状态为失败
      await database.prisma.paymentOrder.update({
        where: { orderNo },
        data: {
          paymentStatus: 'FAILED',
          failReason: wechatResult.error || '创建微信支付订单失败'
        }
      });
      
      return res.status(500).json({
        success: false,
        message: '创建支付订单失败',
        error: process.env.NODE_ENV === 'development' ? (wechatResult.error || '微信支付接口错误') : '支付服务暂时不可用'
      });
    }

    res.json({
      success: true,
      data: {
        orderNo,
        qrCodeUrl: wechatResult.codeUrl,
        amount: parseFloat(package.amount), // 转换Decimal为number
        points: package.points + package.bonusPoints,
        expireTime: expireTime.toISOString(),
        packageInfo: {
          name: package.name,
          description: package.description
        }
      }
    });

  } catch (error) {
    console.error('创建充值订单失败:', error);
    console.error('错误详情:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    res.status(500).json({
      success: false,
      message: '创建充值订单失败',
      error: process.env.NODE_ENV === 'development' ? error.message : '系统错误'
    });
  }
});

/**
 * GET /api/recharge/order-status/:orderNo
 * 查询订单状态
 */
router.get('/order-status/:orderNo', requireAuth, async (req, res) => {
  try {
    const { orderNo } = req.params;
    const userId = req.userId;

    // 获取数据库实例
    const database = getDatabase(req);
    if (!database || !database.prisma) {
      return res.status(500).json({
        success: false,
        message: '数据库服务不可用',
        errorCode: 'DATABASE_UNAVAILABLE'
      });
    }
    
    // 从数据库查询订单
    const order = await database.prisma.paymentOrder.findFirst({
      where: {
        orderNo,
        userId
      },
      select: {
        orderNo: true,
        outTradeNo: true,
        userId: true,
        paymentStatus: true,
        amount: true,
        points: true,
        bonusPoints: true,
        paymentTime: true,
        expireTime: true,
        failReason: true,
        packageId: true
      }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 如果订单已支付，直接返回
    if (order.paymentStatus === 'PAID') {
      return res.json({
        success: true,
        data: {
          orderNo: order.orderNo,
          status: 'PAID',
          paymentTime: order.paymentTime,
          amount: order.amount,
          points: order.points + order.bonusPoints
        }
      });
    }

    // 如果订单失败或已过期，直接返回
    if (order.paymentStatus === 'FAILED' || 
        order.paymentStatus === 'EXPIRED' ||
        new Date() > new Date(order.expireTime)) {
      return res.json({
        success: true,
        data: {
          orderNo: order.orderNo,
          status: order.paymentStatus,
          message: order.failReason || '订单已过期'
        }
      });
    }

    // 查询微信支付状态
    try {
      console.log(`🔍 查询订单支付状态: ${order.outTradeNo}`);
      const wechatResult = await wechatPay.queryOrder(order.outTradeNo);
      console.log('📊 微信支付查询结果:', JSON.stringify(wechatResult, null, 2));
      
      // 微信支付V2的状态值：SUCCESS, REFUND, NOTPAY, CLOSED, REVOKED, USERPAYING, PAYERROR
      if (wechatResult.success && wechatResult.tradeState === 'SUCCESS') {
        // 支付成功，检查是否已经处理过（避免重复处理）
        if (order.paymentStatus !== 'PAID') {
          console.log(`🎉 订单支付成功，开始处理积分充值: ${order.orderNo}`);
          await processSuccessfulPayment(order, wechatResult);
        } else {
          console.log(`⚠️ 订单已处理过，跳过重复处理: ${order.orderNo}`);
        }
        
        return res.json({
          success: true,
          data: {
            orderNo: order.orderNo,
            status: 'PAID',
            paymentTime: wechatResult.timeEnd,
            amount: order.amount,
            points: order.points + order.bonusPoints
          }
        });
      }
      
      // 处理其他支付状态
      let orderStatus = 'PENDING';
      let statusMessage = '';
      
      switch (wechatResult.tradeState) {
        case 'NOTPAY':
          orderStatus = 'PENDING';
          statusMessage = '等待用户支付';
          break;
        case 'USERPAYING':
          orderStatus = 'PENDING';
          statusMessage = '用户支付中';
          break;
        case 'PAYERROR':
          orderStatus = 'FAILED';
          statusMessage = '支付失败';
          break;
        case 'CLOSED':
          orderStatus = 'EXPIRED';
          statusMessage = '订单已关闭';
          break;
        case 'REVOKED':
          orderStatus = 'CANCELLED';
          statusMessage = '订单已撤销';
          break;
        case 'REFUND':
          orderStatus = 'REFUNDED';
          statusMessage = '订单已退款';
          break;
        default:
          orderStatus = 'PENDING';
          statusMessage = `未知状态: ${wechatResult.tradeState}`;
      }
      
      console.log(`📊 订单状态映射: ${wechatResult.tradeState} → ${orderStatus}`);
      
      // 订单仍在等待支付或其他状态
      res.json({
        success: true,
        data: {
          orderNo: order.orderNo,
          status: orderStatus,
          message: statusMessage,
          expireTime: order.expireTime
        }
      });
      
    } catch (queryError) {
      console.error('查询微信支付状态失败:', queryError);
      
      // 微信查询失败，返回数据库中的状态
      res.json({
        success: true,
        data: {
          orderNo: order.orderNo,
          status: order.paymentStatus,
          expireTime: order.expireTime
        }
      });
    }

  } catch (error) {
    console.error('查询订单状态失败:', error);
    res.status(500).json({
      success: false,
      message: '查询订单状态失败'
    });
  }
});

/**
 * GET /api/recharge/history
 * 获取用户充值记录
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 获取数据库实例
    const database = getDatabase(req);
    if (!database || !database.prisma) {
      return res.status(500).json({
        success: false,
        message: '数据库服务不可用',
        errorCode: 'DATABASE_UNAVAILABLE'
      });
    }

    // 查询充值记录
    const [records, total] = await Promise.all([
      database.prisma.paymentOrder.findMany({
        where: {
          userId,
          paymentMethod: 'WECHAT_PAY'
        },
        include: {
          package: {
            select: {
              name: true,
              description: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      database.prisma.paymentOrder.count({
        where: {
          userId,
          paymentMethod: 'WECHAT_PAY'
        }
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        records: records.map(record => {
          // 从metadata中获取套餐信息
          let packageName = record.package?.name || '未知套餐';
          let packageDescription = record.package?.description || '';
          
          // 如果没有package关联，尝试从metadata解析
          if (!record.package && record.metadata) {
            try {
              const metadata = JSON.parse(record.metadata);
              packageName = metadata.packageName || packageName;
            } catch (e) {
              // 忽略JSON解析错误
            }
          }
          
          return {
            orderNo: record.orderNo,
            packageName,
            packageDescription,
            amount: record.amount,
            points: record.points,
            bonusPoints: record.bonusPoints,
            totalPoints: record.points + record.bonusPoints,
            status: record.paymentStatus,
            paymentTime: record.paymentTime,
            createdAt: record.createdAt
          };
        }),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('获取充值记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取充值记录失败'
    });
  }
});

/**
 * 处理支付成功的订单
 */
async function processSuccessfulPayment(order, wechatResult) {
  try {
    console.log(`🎉 开始处理支付成功订单: ${order.orderNo}`);
    console.log('💰 充值积分信息:', {
      basePoints: order.points,
      bonusPoints: order.bonusPoints,
      totalPoints: order.points + order.bonusPoints,
      userId: order.userId
    });
    
    // 获取数据库实例（processSuccessfulPayment不是路由处理器，需要传递database）
    const database = global.db;
    if (!database || !database.prisma) {
      throw new Error('数据库服务不可用');
    }
    
    // 使用Prisma事务处理
    await database.prisma.$transaction(async (prisma) => {
      // 1. 再次检查订单状态，确保防止并发处理
      const currentOrder = await prisma.paymentOrder.findUnique({
        where: { orderNo: order.orderNo },
        select: { paymentStatus: true }
      });
      
      if (currentOrder && currentOrder.paymentStatus === 'PAID') {
        console.log(`⚠️ 事务中发现订单已处理，跳过: ${order.orderNo}`);
        return { success: true, message: '订单已处理' };
      }

      // 2. 更新订单状态
      await prisma.paymentOrder.update({
        where: { orderNo: order.orderNo },
        data: {
          paymentStatus: 'PAID',
          paymentTime: wechatResult.timeEnd ? new Date(wechatResult.timeEnd) : new Date(),
          transactionId: wechatResult.transactionId,
          notifyTime: new Date()
        }
      });

      // 3. 给用户充值积分
      const totalPoints = order.points + order.bonusPoints;
      
      const updatedUser = await prisma.user.update({
        where: { id: order.userId },
        data: {
          points: {
            increment: totalPoints
          }
        },
        select: { points: true }
      });

      // 4. 记录积分交易
      await prisma.pointTransaction.create({
        data: {
          userId: order.userId,
          transactionType: 'RECHARGE',
          amount: totalPoints,
          balanceAfter: updatedUser.points,
          description: `充值成功 - 订单${order.orderNo}`,
          metadata: JSON.stringify({
            orderNo: order.orderNo,
            packageId: order.packageId,
            basePoints: order.points,
            bonusPoints: order.bonusPoints,
            transactionId: wechatResult.transactionId
          })
        }
      });
      
      console.log(`💰 用户 ${order.userId} 积分充值成功: +${totalPoints}积分，当前余额: ${updatedUser.points}`);
    });

    // 5. 处理邀请佣金（在事务外异步处理，避免影响支付流程）
    try {
      const inviteService = new InviteService();
      await inviteService.handleRechargeCommission(
        order.userId, 
        Number(order.amount), 
        order.orderNo
      );
      console.log('✅ 邀请佣金处理完成:', { 
        userId: order.userId, 
        amount: Number(order.amount) 
      });
    } catch (inviteError) {
      console.error('❌ 邀请佣金处理失败（不影响支付结果）:', inviteError);
    }

    console.log(`✅ 订单 ${order.orderNo} 支付成功处理完成`);
    return { success: true };
    
  } catch (error) {
    console.error('处理支付成功订单失败:', error);
    throw error;
  }
}

/**
 * POST /api/recharge/sync-status/:orderNo
 * 强制同步支付状态
 */
router.post('/sync-status/:orderNo', requireAuth, async (req, res) => {
  try {
    const { orderNo } = req.params;
    const userId = req.userId;

    console.log(`🔄 用户 ${userId} 请求强制同步订单状态: ${orderNo}`);

    // 获取数据库实例
    const database = getDatabase(req);
    if (!database || !database.prisma) {
      return res.status(500).json({
        success: false,
        message: '数据库服务不可用',
        errorCode: 'DATABASE_UNAVAILABLE'
      });
    }

    // 验证订单归属
    const order = await database.prisma.paymentOrder.findFirst({
      where: {
        orderNo,
        userId
      },
      select: {
        orderNo: true,
        outTradeNo: true,
        userId: true,
        amount: true,
        points: true,
        bonusPoints: true,
        paymentStatus: true,
        packageId: true
      }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在或无权限访问'
      });
    }

    // 如果订单已支付，直接返回
    if (order.paymentStatus === 'PAID') {
      return res.json({
        success: true,
        data: {
          orderNo: order.orderNo,
          status: 'PAID',
          message: '订单已支付'
        }
      });
    }

    // 查询微信支付状态
    console.log(`🔍 强制查询微信支付状态: ${order.outTradeNo}`);
    const wechatResult = await wechatPay.queryOrder(order.outTradeNo);
    console.log('📊 微信支付强制查询结果:', JSON.stringify(wechatResult, null, 2));
    
    if (wechatResult.success && wechatResult.tradeState === 'SUCCESS') {
      // 支付成功，处理积分充值
      console.log('🎉 强制同步检测到支付成功，开始处理积分充值');
      await processSuccessfulPayment(order, wechatResult);
      
      return res.json({
        success: true,
        data: {
          orderNo: order.orderNo,
          status: 'PAID',
          paymentTime: wechatResult.timeEnd,
          amount: order.amount,
          points: order.points + order.bonusPoints,
          message: '支付成功，积分已充值'
        }
      });
    } else {
      // 更新其他状态
      let orderStatus = 'PENDING';
      let statusMessage = '';
      
      switch (wechatResult.tradeState) {
        case 'NOTPAY':
          orderStatus = 'PENDING';
          statusMessage = '等待用户支付';
          break;
        case 'CLOSED':
          orderStatus = 'EXPIRED';
          statusMessage = '订单已关闭';
          break;
        case 'PAYERROR':
          orderStatus = 'FAILED';
          statusMessage = '支付失败';
          break;
        case 'REVOKED':
          orderStatus = 'CANCELLED';
          statusMessage = '订单已撤销';
          break;
        default:
          orderStatus = 'PENDING';
          statusMessage = `未知状态: ${wechatResult.tradeState}`;
      }
      
      // 更新本地订单状态
      if (orderStatus !== order.paymentStatus) {
        await database.prisma.paymentOrder.update({
          where: { orderNo: order.orderNo },
          data: { paymentStatus: orderStatus }
        });
      }
      
      return res.json({
        success: true,
        data: {
          orderNo: order.orderNo,
          status: orderStatus,
          message: statusMessage,
          expireTime: order.expireTime
        }
      });
    }

  } catch (error) {
    console.error('强制同步支付状态失败:', error);
    res.status(500).json({
      success: false,
      message: '同步支付状态失败'
    });
  }
});

module.exports = router;