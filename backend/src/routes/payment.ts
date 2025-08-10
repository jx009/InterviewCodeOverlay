import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { ResponseUtils } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { SessionManager } from '../config/redis-working';
import { getPaymentService } from '../services/PaymentService';
import { PaymentMethod } from '@prisma/client';

const router = Router();
const sessionManager = new SessionManager();

// 统一获取用户ID的中间件 - 支持JWT和Session两种认证方式
const getUserId = async (req: Request, res: Response, next: Function) => {
  try {
    console.log('🔍 支付API认证中间件开始', {
      url: req.url,
      method: req.method,
      headers: {
        'x-session-id': req.headers['x-session-id'] ? 'exists' : 'missing',
        'X-Session-Id': req.headers['X-Session-Id'] ? 'exists' : 'missing',
        'authorization': req.headers.authorization ? 'exists' : 'missing'
      }
    });

    // 首先尝试从JWT认证获取用户ID
    if ((req as any).user?.userId) {
      console.log('✅ JWT认证成功，用户ID:', (req as any).user.userId);
      (req as any).userId = (req as any).user.userId;
      return next();
    } else {
      console.log('⚠️ JWT认证失败或未提供token');
    }

    // 如果JWT认证失败，尝试Session认证（支持大小写变体）
    const sessionId = (req.headers['x-session-id'] || req.headers['X-Session-Id']) as string;
    if (sessionId) {
      console.log('🔍 尝试Session认证，sessionId:', sessionId.substring(0, 10) + '...');
      
      try {
        const sessionValidation = await sessionManager.validateSession(sessionId);
        console.log('🔍 Session验证结果:', sessionValidation);
        
        if (sessionValidation.valid && sessionValidation.userId) {
          console.log('✅ Session认证成功，用户ID:', sessionValidation.userId);
          (req as any).userId = sessionValidation.userId;
          return next();
        } else {
          console.log('❌ Session认证失败:', sessionValidation);
          return ResponseUtils.unauthorized(res, '无效的会话令牌');
        }
      } catch (sessionError) {
        console.error('❌ Session验证异常:', sessionError);
        return ResponseUtils.unauthorized(res, '会话验证失败');
      }
    } else {
      console.log('❌ 未提供sessionId');
    }

    // 两种认证都失败
    console.log('❌ 支付API认证失败：两种认证方式都失败');
    return ResponseUtils.unauthorized(res, '无效的会话令牌');
  } catch (error) {
    console.error('❌ 支付API认证中间件错误:', error);
    return ResponseUtils.unauthorized(res, '无效的会话令牌');
  }
};

// 获取用户订单列表
router.get('/orders', getUserId, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return ResponseUtils.unauthorized(res, '用户ID无效');
    }

    // 查询用户的订单
    const orders = await prisma.paymentOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        package: {
          select: {
            name: true,
            amount: true,
            points: true
          }
        }
      }
    });

    ResponseUtils.success(res, orders);
  } catch (error) {
    console.error('获取订单列表失败:', error);
    ResponseUtils.internalError(res, '获取订单列表失败');
  }
});

// 创建支付订单
router.post('/create-order', 
  getUserId,
  [
    body('packageId').isInt({ min: 1 }).withMessage('套餐ID必须是正整数'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return ResponseUtils.unauthorized(res, '用户ID无效');
      }

      const { packageId } = req.body;
      
      console.log('🚀 创建支付订单请求:', { userId, packageId });

      // 使用修复的支付服务创建订单
      const paymentService = getPaymentService();
      
      const createOrderRequest = {
        userId: parseInt(userId),
        packageId: parseInt(packageId),
        paymentMethod: PaymentMethod.WECHAT_PAY,
        clientIp: req.ip || req.connection.remoteAddress || '127.0.0.1',
        description: `积分充值套餐 - 包ID: ${packageId}`
      };

      console.log('📝 支付服务请求参数:', createOrderRequest);

      const result = await paymentService.createPaymentOrder(createOrderRequest);

      if (!result.success) {
        console.error('❌ 支付订单创建失败:', result.message);
        return ResponseUtils.error(res, result.message, 400);
      }

      console.log('✅ 支付订单创建成功:', result.data);

      // 返回包含二维码URL的订单信息
      ResponseUtils.success(res, {
        orderNo: result.data.orderNo,
        outTradeNo: result.data.outTradeNo,
        amount: result.data.amount,
        qrCodeUrl: result.data.codeUrl,
        expireTime: result.data.expireTime,
        message: '订单创建成功，请扫码支付'
      });

    } catch (error) {
      console.error('❌ 创建订单异常:', error);
      ResponseUtils.internalError(res, '创建订单失败');
    }
  }
);

// 查询订单状态
router.get('/order/:orderNo', 
  getUserId,
  [
    param('orderNo').notEmpty().withMessage('订单号不能为空'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return ResponseUtils.unauthorized(res, '用户ID无效');
      }

      const { orderNo } = req.params;
      
      console.log('🔍 查询订单状态:', { userId, orderNo });

      const paymentService = getPaymentService();
      const result = await paymentService.queryPaymentOrder(orderNo);

      if (!result.success) {
        console.error('❌ 查询订单失败:', result.message);
        return ResponseUtils.error(res, result.message, 400);
      }

      console.log('✅ 查询订单成功:', result.data);

      ResponseUtils.success(res, result.data);

    } catch (error) {
      console.error('❌ 查询订单异常:', error);
      ResponseUtils.internalError(res, '查询订单失败');
    }
  }
);

// 获取支付套餐 - 不需要认证，任何人都可以查看套餐
router.get('/packages', async (req: Request, res: Response) => {
  try {
    console.log('📦 获取支付套餐列表请求');

    const packages = await prisma.paymentPackage.findMany({
      where: { isActive: true },
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
      orderBy: { sortOrder: 'asc' }
    });

    console.log(`✅ 获取到 ${packages.length} 个套餐`);
    
    // 为前端添加必要的字段
    const formattedPackages = packages.map(pkg => ({
      ...pkg,
      status: pkg.isActive ? 'active' : 'inactive',
      totalPoints: pkg.points + pkg.bonusPoints
    }));
    
    ResponseUtils.success(res, formattedPackages);
  } catch (error) {
    console.error('获取支付套餐失败:', error);
    ResponseUtils.internalError(res, '获取支付套餐失败');
  }
});

// 微信支付回调处理
router.post('/notify/wechat', async (req: Request, res: Response) => {
  try {
    console.log('📨 收到微信支付回调通知');
    console.log('📋 Headers:', req.headers);
    console.log('📄 Body type:', typeof req.body);
    
    // 获取原始XML数据
    let xmlData: string;
    if (Buffer.isBuffer(req.body)) {
      // express.raw() 返回 Buffer
      xmlData = req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
      xmlData = req.body;
    } else {
      // 如果body被解析成对象，需要重新获取原始数据
      xmlData = JSON.stringify(req.body);
    }

    console.log('📄 原始XML数据长度:', xmlData.length);
    console.log('📄 XML预览:', xmlData.substring(0, 200) + '...');

    const paymentService = getPaymentService();
    const result = await paymentService.handlePaymentNotify(xmlData);

    console.log('🔄 回调处理结果:', {
      success: result.success,
      message: result.message
    });

    // 设置响应头
    res.set('Content-Type', 'application/xml; charset=utf-8');
    
    // 返回微信要求的XML响应格式
    res.send(result.responseXml);

  } catch (error) {
    console.error('❌ 微信支付回调处理异常:', error);
    
    // 返回失败响应给微信
    const failResponse = `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[系统错误]]></return_msg></xml>`;
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(failResponse);
  }
});

// 支付回调处理 (保留旧的通用回调处理)
router.post('/notify', 
  [
    body('orderId').isInt({ min: 1 }).withMessage('订单ID必须是正整数'),
    body('status').isIn(['success', 'failed']).withMessage('支付状态无效'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const { orderId, status } = req.body;

      // 更新订单状态
      const order = await prisma.paymentOrder.update({
        where: { id: orderId },
        data: { 
          paymentStatus: status === 'success' ? 'PAID' : 'FAILED',
          paymentTime: status === 'success' ? new Date() : undefined
        },
        include: {
          user: true,
          package: true
        }
      });

      // 如果支付成功，给用户加积分
      if (status === 'success') {
        await prisma.user.update({
          where: { id: order.userId },
          data: {
            points: {
              increment: order.points + order.bonusPoints
            }
          }
        });
      }

      ResponseUtils.success(res, { message: '支付通知处理成功' });
    } catch (error) {
      console.error('支付通知处理失败:', error);
      ResponseUtils.internalError(res, '支付通知处理失败');
    }
  }
);

export default router; 