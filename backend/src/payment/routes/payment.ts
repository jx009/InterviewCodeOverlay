// 支付相关API路由
import { Router, Request, Response } from 'express';
import { getPaymentService } from '../services/PaymentService';
import { getPaymentNotifyService } from '../services/PaymentNotifyService';
import {
  validateCreateOrderParams,
  validateOrderNo,
  validatePaginationParams,
  validateWechatNotifyHeaders
} from '../utils/payment-validator';
import { PaymentMethod, PaymentStatus } from '../../types/payment';
import { authenticateToken, optionalAuth, rateLimit, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const paymentService = getPaymentService();
const notifyService = getPaymentNotifyService();

/**
 * 获取支付套餐列表
 * GET /api/payment/packages
 */
router.get('/packages', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📦 获取支付套餐列表请求');

    const packages = await paymentService.getPaymentPackages();

    res.json({
      success: true,
      data: packages,
      message: '获取套餐列表成功'
    });

  } catch (error: any) {
    console.error('❌ 获取支付套餐列表失败:', error);
    
    res.status(500).json({
      success: false,
      message: `获取套餐列表失败: ${error.message}`
    });
  }
});

/**
 * 根据ID获取支付套餐详情
 * GET /api/payment/packages/:id
 */
router.get('/packages/:id', async (req: Request, res: Response) => {
  try {
    const packageId = parseInt(req.params.id);
    
    if (isNaN(packageId)) {
      return res.status(400).json({
        success: false,
        message: '套餐ID格式错误'
      });
    }

    console.log('🔍 获取支付套餐详情:', packageId);

    const packageData = await paymentService.getPaymentPackageById(packageId);

    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: '套餐不存在'
      });
    }

    res.json({
      success: true,
      data: packageData,
      message: '获取套餐详情成功'
    });

  } catch (error: any) {
    console.error('❌ 获取支付套餐详情失败:', error);
    
    res.status(500).json({
      success: false,
      message: `获取套餐详情失败: ${error.message}`
    });
  }
});

/**
 * 创建充值订单
 * POST /api/payment/orders
 * Body: { packageId: number, paymentMethod?: string }
 */
router.post('/orders', authenticateToken, rateLimit(10, 60000), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { packageId, paymentMethod = 'WECHAT_PAY' } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    // 验证请求参数
    const validation = validateCreateOrderParams({ packageId, paymentMethod });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    console.log('🚀 创建充值订单请求:', { userId, packageId, paymentMethod });

    const result = await paymentService.createRechargeOrder(
      userId,
      packageId,
      paymentMethod as PaymentMethod
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          orderNo: result.orderNo,
          paymentData: result.paymentData,
          expireTime: result.expireTime
        },
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error: any) {
    console.error('❌ 创建充值订单失败:', error);
    
    res.status(500).json({
      success: false,
      message: `创建订单失败: ${error.message}`
    });
  }
});

/**
 * 查询订单状态
 * GET /api/payment/orders/:orderNo
 */
router.get('/orders/:orderNo', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderNo } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    // 验证订单号格式
    const validation = validateOrderNo(orderNo);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    console.log('🔍 查询订单状态:', { orderNo, userId });

    const result = await paymentService.getOrderStatus(orderNo);

    if (result.success) {
      // 验证订单所有权
      if (result.order && result.order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权查看此订单'
        });
      }

      res.json({
        success: true,
        data: {
          order: result.order,
          tradeState: result.tradeState,
          tradeStateDesc: result.tradeStateDesc
        },
        message: result.message
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }

  } catch (error: any) {
    console.error('❌ 查询订单状态失败:', error);
    
    res.status(500).json({
      success: false,
      message: `查询订单失败: ${error.message}`
    });
  }
});

/**
 * 取消订单
 * POST /api/payment/orders/:orderNo/cancel
 */
router.post('/orders/:orderNo/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderNo } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    console.log('🔒 取消订单请求:', { orderNo, userId });

    const result = await paymentService.cancelOrder(orderNo, userId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error: any) {
    console.error('❌ 取消订单失败:', error);
    
    res.status(500).json({
      success: false,
      message: `取消订单失败: ${error.message}`
    });
  }
});

/**
 * 获取用户订单列表
 * GET /api/payment/orders
 * Query: page?, limit?, status?, method?, startDate?, endDate?
 */
router.get('/orders', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    // 解析查询参数
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as PaymentStatus;
    const method = req.query.method as PaymentMethod;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // 验证分页参数
    const paginationValidation = validatePaginationParams({ page, limit });
    if (!paginationValidation.valid) {
      return res.status(400).json({
        success: false,
        message: paginationValidation.message
      });
    }

    console.log('📋 获取用户订单列表:', { userId, page, limit, status, method });

    const result = await paymentService.getUserOrders(userId, {
      page,
      limit,
      paymentStatus: status,
      paymentMethod: method,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: '获取订单列表成功'
    });

  } catch (error: any) {
    console.error('❌ 获取用户订单列表失败:', error);
    
    res.status(500).json({
      success: false,
      message: `获取订单列表失败: ${error.message}`
    });
  }
});

/**
 * 微信支付回调通知
 * POST /api/payment/notify/wechat
 */
router.post('/notify/wechat', async (req: Request, res: Response) => {
  try {
    const headers = req.headers as Record<string, string>;
    const body = JSON.stringify(req.body);
    const clientIp = req.ip || req.connection.remoteAddress || '';

    console.log('📨 接收微信支付回调通知:', { clientIp, headers: Object.keys(headers) });

    // 验证回调头部
    const headerValidation = validateWechatNotifyHeaders(headers);
    if (!headerValidation.valid) {
      console.error('❌ 微信支付回调头部验证失败:', headerValidation.message);
      return res.status(400).send('FAIL');
    }

    const result = await notifyService.handleWechatNotify(headers, body, clientIp);

    if (result.success) {
      console.log('✅ 微信支付回调处理成功');
      res.status(200).send('SUCCESS');
    } else {
      console.error('❌ 微信支付回调处理失败:', result.message);
      
      // 如果需要重试，返回500状态码
      if (result.shouldRetry) {
        res.status(500).send('FAIL');
      } else {
        res.status(400).send('FAIL');
      }
    }

  } catch (error: any) {
    console.error('❌ 微信支付回调处理异常:', error);
    res.status(500).send('FAIL');
  }
});

/**
 * 微信退款回调通知
 * POST /api/payment/notify/wechat/refund
 */
router.post('/notify/wechat/refund', async (req: Request, res: Response) => {
  try {
    const headers = req.headers as Record<string, string>;
    const body = JSON.stringify(req.body);
    const clientIp = req.ip || req.connection.remoteAddress || '';

    console.log('💰 接收微信退款回调通知:', { clientIp });

    const result = await notifyService.handleWechatRefundNotify(headers, body, clientIp);

    if (result.success) {
      console.log('✅ 微信退款回调处理成功');
      res.status(200).send('SUCCESS');
    } else {
      console.error('❌ 微信退款回调处理失败:', result.message);
      
      if (result.shouldRetry) {
        res.status(500).send('FAIL');
      } else {
        res.status(400).send('FAIL');
      }
    }

  } catch (error: any) {
    console.error('❌ 微信退款回调处理异常:', error);
    res.status(500).send('FAIL');
  }
});

export default router; 