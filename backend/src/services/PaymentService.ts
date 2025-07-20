import { PrismaClient, PaymentStatus, PaymentMethod } from '@prisma/client';
import { WechatPayV2Service, getWechatPayV2Service } from './WechatPayV2Service';
import { WECHAT_PAY_V2_TRADE_STATES } from '../config/wechat-pay-v2';

const prisma = new PrismaClient();

// 创建订单请求接口
export interface CreatePaymentOrderRequest {
  userId: number;
  packageId: number;
  paymentMethod: PaymentMethod;
  clientIp?: string;
  description?: string;
  metadata?: Record<string, any>;
}

// 创建订单响应接口
export interface CreatePaymentOrderResponse {
  success: boolean;
  message: string;
  data?: {
    orderNo: string;
    outTradeNo: string;
    amount: number;
    codeUrl?: string;
    expireTime: Date;
  };
  errorCode?: string;
}

// 查询订单响应接口
export interface QueryPaymentOrderResponse {
  success: boolean;
  message: string;
  data?: {
    orderNo: string;
    outTradeNo: string;
    paymentStatus: PaymentStatus;
    amount: number;
    points: number;
    bonusPoints: number;
    tradeState?: string;
    transactionId?: string;
    paymentTime?: Date;
    expireTime: Date;
    failReason?: string;
  };
  errorCode?: string;
}

// 订单列表查询参数
export interface GetOrdersRequest {
  userId: number;
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
}

// 订单列表响应接口
export interface GetOrdersResponse {
  success: boolean;
  message: string;
  data?: {
    orders: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class PaymentService {
  private wechatPayService: WechatPayV2Service;

  constructor() {
    this.wechatPayService = getWechatPayV2Service();
  }

  /**
   * 生成订单号
   */
  private generateOrderNo(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PAY${timestamp}${random}`;
  }

  /**
   * 生成商户订单号
   */
  private generateOutTradeNo(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `OUT${timestamp}${random}`;
  }

  /**
   * 计算订单过期时间
   */
  private calculateExpireTime(): Date {
    const expireMinutes = parseInt(process.env.PAYMENT_ORDER_EXPIRE_MINUTES || '30');
    return new Date(Date.now() + expireMinutes * 60 * 1000);
  }

  /**
   * 获取支付套餐列表
   */
  async getPaymentPackages(): Promise<any[]> {
    try {
      console.log('📦 获取支付套餐列表');

      const packages = await prisma.paymentPackage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      });

      console.log(`✅ 获取到 ${packages.length} 个有效套餐`);
      return packages;

    } catch (error) {
      console.error('❌ 获取支付套餐失败:', error);
      throw new Error('获取支付套餐失败');
    }
  }

  /**
   * 根据ID获取支付套餐
   */
  async getPaymentPackageById(packageId: number): Promise<any | null> {
    try {
      console.log('🔍 获取支付套餐:', packageId);

      const packageData = await prisma.paymentPackage.findFirst({
        where: {
          id: packageId,
          isActive: true
        }
      });

      if (!packageData) {
        console.log('⚠️ 套餐不存在或已下架:', packageId);
        return null;
      }

      console.log('✅ 获取套餐成功:', packageData.name);
      return packageData;

    } catch (error) {
      console.error('❌ 获取支付套餐失败:', error);
      throw new Error('获取支付套餐失败');
    }
  }

  /**
   * 创建支付订单
   */
  async createPaymentOrder(request: CreatePaymentOrderRequest): Promise<CreatePaymentOrderResponse> {
    try {
      console.log('🚀 创建支付订单:', request);

      // 1. 验证用户
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { id: true, username: true, email: true, points: true }
      });

      if (!user) {
        return {
          success: false,
          message: '用户不存在',
          errorCode: 'USER_NOT_FOUND'
        };
      }

      // 2. 验证套餐
      const packageData = await this.getPaymentPackageById(request.packageId);
      if (!packageData) {
        return {
          success: false,
          message: '套餐不存在或已下架',
          errorCode: 'PACKAGE_NOT_FOUND'
        };
      }

      // 3. 验证支付金额
      const amount = Number(packageData.amount);
      if (amount <= 0 || amount > 10000) {
        return {
          success: false,
          message: '支付金额无效',
          errorCode: 'INVALID_AMOUNT'
        };
      }

      // 4. 生成订单号
      const orderNo = this.generateOrderNo();
      const outTradeNo = this.generateOutTradeNo();
      const expireTime = this.calculateExpireTime();

      // 5. 创建本地订单记录
      const orderData = {
        orderNo,
        outTradeNo,
        userId: request.userId,
        packageId: request.packageId,
        amount: packageData.amount,
        points: packageData.points,
        bonusPoints: packageData.bonusPoints,
        paymentMethod: request.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        expireTime,
        metadata: request.metadata ? JSON.stringify(request.metadata) : null
      };

      const createdOrder = await prisma.paymentOrder.create({
        data: orderData
      });

      console.log('✅ 本地订单创建成功:', orderNo);

      // 6. 调用微信支付创建订单
      if (request.paymentMethod === PaymentMethod.WECHAT_PAY) {
        const wechatResult = await this.wechatPayService.createNativeOrder({
          outTradeNo,
          totalFee: amount,
          body: request.description || `${packageData.name} - ${packageData.points + packageData.bonusPoints}积分`,
          attach: JSON.stringify({
            orderNo,
            packageId: request.packageId,
            userId: request.userId
          }),
          timeExpire: expireTime,
          spbillCreateIp: request.clientIp
        });

        if (!wechatResult.success) {
          // 微信支付创建失败，更新本地订单状态
          await prisma.paymentOrder.update({
            where: { orderNo },
            data: {
              paymentStatus: PaymentStatus.FAILED,
              failReason: wechatResult.message
            }
          });

          return {
            success: false,
            message: wechatResult.message,
            errorCode: wechatResult.errorCode
          };
        }

        console.log('✅ 微信支付订单创建成功');

        return {
          success: true,
          message: '订单创建成功',
          data: {
            orderNo,
            outTradeNo,
            amount,
            codeUrl: wechatResult.data?.codeUrl,
            expireTime
          }
        };
      }

      return {
        success: false,
        message: '不支持的支付方式',
        errorCode: 'UNSUPPORTED_PAYMENT_METHOD'
      };

    } catch (error: any) {
      console.error('❌ 创建支付订单失败:', error);
      return {
        success: false,
        message: `创建订单失败: ${error.message}`,
        errorCode: 'CREATE_ORDER_ERROR'
      };
    }
  }

  /**
   * 查询订单状态
   */
  async queryPaymentOrder(orderNo: string): Promise<QueryPaymentOrderResponse> {
    try {
      console.log('🔍 查询订单状态:', orderNo);

      // 1. 查询本地订单
      const order = await prisma.paymentOrder.findUnique({
        where: { orderNo },
        include: {
          user: {
            select: { id: true, username: true, email: true }
          },
          package: {
            select: { name: true, description: true }
          }
        }
      });

      if (!order) {
        return {
          success: false,
          message: '订单不存在',
          errorCode: 'ORDER_NOT_FOUND'
        };
      }

      // 2. 检查订单是否过期
      const now = new Date();
      if (now > order.expireTime && order.paymentStatus === PaymentStatus.PENDING) {
        // 订单已过期，更新状态
        await prisma.paymentOrder.update({
          where: { orderNo },
          data: {
            paymentStatus: PaymentStatus.EXPIRED,
            failReason: '订单已过期'
          }
        });

        return {
          success: true,
          message: '订单已过期',
          data: {
            orderNo,
            outTradeNo: order.outTradeNo,
            paymentStatus: PaymentStatus.EXPIRED,
            amount: Number(order.amount),
            points: order.points,
            bonusPoints: order.bonusPoints,
            expireTime: order.expireTime,
            failReason: '订单已过期'
          }
        };
      }

      // 3. 如果是待支付状态，查询微信支付状态
      if (order.paymentStatus === PaymentStatus.PENDING && order.paymentMethod === PaymentMethod.WECHAT_PAY) {
        const wechatResult = await this.wechatPayService.queryOrder(order.outTradeNo);
        
        if (wechatResult.success && wechatResult.data) {
          const { tradeState } = wechatResult.data;
          
          // 根据微信支付状态更新本地订单
          await this.syncOrderStatusFromWechat(order, tradeState);
          
          // 重新查询更新后的订单
          const updatedOrder = await prisma.paymentOrder.findUnique({
            where: { orderNo }
          });

          if (updatedOrder) {
            return {
              success: true,
              message: '查询订单成功',
              data: {
                orderNo,
                outTradeNo: updatedOrder.outTradeNo,
                paymentStatus: updatedOrder.paymentStatus,
                amount: Number(updatedOrder.amount),
                points: updatedOrder.points,
                bonusPoints: updatedOrder.bonusPoints,
                tradeState,
                transactionId: updatedOrder.transactionId || undefined,
                paymentTime: updatedOrder.paymentTime || undefined,
                expireTime: updatedOrder.expireTime,
                failReason: updatedOrder.failReason || undefined
              }
            };
          }
        }
      }

      // 4. 返回当前订单状态
      return {
        success: true,
        message: '查询订单成功',
        data: {
          orderNo,
          outTradeNo: order.outTradeNo,
          paymentStatus: order.paymentStatus,
          amount: Number(order.amount),
          points: order.points,
          bonusPoints: order.bonusPoints,
          transactionId: order.transactionId || undefined,
          paymentTime: order.paymentTime || undefined,
          expireTime: order.expireTime,
          failReason: order.failReason || undefined
        }
      };

    } catch (error: any) {
      console.error('❌ 查询订单状态失败:', error);
      return {
        success: false,
        message: `查询订单失败: ${error.message}`,
        errorCode: 'QUERY_ORDER_ERROR'
      };
    }
  }

  /**
   * 关闭订单
   */
  async closePaymentOrder(orderNo: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔒 关闭订单:', orderNo);

      // 1. 查询本地订单
      const order = await prisma.paymentOrder.findUnique({
        where: { orderNo }
      });

      if (!order) {
        return {
          success: false,
          message: '订单不存在'
        };
      }

      if (order.paymentStatus !== PaymentStatus.PENDING) {
        return {
          success: false,
          message: '只能关闭待支付订单'
        };
      }

      // 2. 调用微信支付关闭订单
      if (order.paymentMethod === PaymentMethod.WECHAT_PAY) {
        const wechatResult = await this.wechatPayService.closeOrder(order.outTradeNo);
        
        if (!wechatResult.success) {
          // 如果是订单已支付的错误，查询最新状态
          if (wechatResult.errorCode === 'ORDERPAID') {
            await this.queryPaymentOrder(orderNo);
          }
          
          return {
            success: false,
            message: wechatResult.message
          };
        }
      }

      // 3. 更新本地订单状态
      await prisma.paymentOrder.update({
        where: { orderNo },
        data: {
          paymentStatus: PaymentStatus.CANCELLED,
          failReason: '用户主动取消'
        }
      });

      console.log('✅ 订单关闭成功:', orderNo);

      return {
        success: true,
        message: '订单关闭成功'
      };

    } catch (error: any) {
      console.error('❌ 关闭订单失败:', error);
      return {
        success: false,
        message: `关闭订单失败: ${error.message}`
      };
    }
  }

  /**
   * 获取用户订单列表
   */
  async getUserOrders(request: GetOrdersRequest): Promise<GetOrdersResponse> {
    try {
      console.log('📋 获取用户订单列表:', request);

      const page = request.page || 1;
      const limit = Math.min(request.limit || 20, 100); // 最多100条
      const skip = (page - 1) * limit;

      // 构建查询条件
      const where: any = {
        userId: request.userId
      };

      if (request.status) {
        where.paymentStatus = request.status;
      }

      if (request.startDate || request.endDate) {
        where.createdAt = {};
        if (request.startDate) {
          where.createdAt.gte = request.startDate;
        }
        if (request.endDate) {
          where.createdAt.lte = request.endDate;
        }
      }

      // 查询订单列表和总数
      const [orders, total] = await Promise.all([
        prisma.paymentOrder.findMany({
          where,
          include: {
            package: {
              select: { name: true, description: true, icon: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.paymentOrder.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      console.log(`✅ 获取用户订单成功: ${orders.length}/${total}`);

      return {
        success: true,
        message: '获取订单列表成功',
        data: {
          orders,
          total,
          page,
          limit,
          totalPages
        }
      };

    } catch (error: any) {
      console.error('❌ 获取用户订单列表失败:', error);
      return {
        success: false,
        message: `获取订单列表失败: ${error.message}`
      };
    }
  }

  /**
   * 处理支付成功
   */
  async handlePaymentSuccess(
    orderNo: string,
    transactionId: string,
    paymentTime: Date,
    totalFee: number,
    attachData?: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('💳 处理支付成功:', { orderNo, transactionId, totalFee });

      const result = await prisma.$transaction(async (tx) => {
        // 1. 查询订单
        const order = await tx.paymentOrder.findUnique({
          where: { orderNo },
          include: { user: true }
        });

        if (!order) {
          throw new Error('订单不存在');
        }

        if (order.paymentStatus === PaymentStatus.PAID) {
          console.log('⚠️ 订单已支付，跳过处理');
          return { success: true, message: '订单已支付' };
        }

        if (order.paymentStatus !== PaymentStatus.PENDING) {
          throw new Error(`订单状态异常: ${order.paymentStatus}`);
        }

        // 2. 验证支付金额
        const expectedAmount = Number(order.amount);
        if (Math.abs(totalFee - expectedAmount) > 0.01) {
          throw new Error(`支付金额不匹配: 期望${expectedAmount}元，实际${totalFee}元`);
        }

        // 3. 更新订单状态
        await tx.paymentOrder.update({
          where: { orderNo },
          data: {
            paymentStatus: PaymentStatus.PAID,
            transactionId,
            paymentTime,
            notifyTime: new Date(),
            metadata: order.metadata ? 
              JSON.stringify({
                ...JSON.parse(order.metadata),
                paymentNotify: attachData
              }) : 
              JSON.stringify({ paymentNotify: attachData })
          }
        });

        // 4. 充值积分
        const totalPoints = order.points + order.bonusPoints;
        const newBalance = order.user.points + totalPoints;

        await tx.user.update({
          where: { id: order.userId },
          data: { points: newBalance }
        });

        // 5. 记录积分交易
        await tx.pointTransaction.create({
          data: {
            userId: order.userId,
            transactionType: 'RECHARGE',
            amount: totalPoints,
            balanceAfter: newBalance,
            description: `支付充值 - 订单号: ${orderNo} (基础积分: ${order.points}, 赠送积分: ${order.bonusPoints})`,
            metadata: JSON.stringify({
              orderNo,
              transactionId,
              packageId: order.packageId
            })
          }
        });

        console.log(`✅ 积分充值成功: 用户${order.userId} +${totalPoints}积分，余额: ${newBalance}`);

        return { success: true, message: '支付处理成功' };
      });

      return result;

    } catch (error: any) {
      console.error('❌ 处理支付成功失败:', error);
      return {
        success: false,
        message: `支付处理失败: ${error.message}`
      };
    }
  }

  /**
   * 处理支付回调
   */
  async handlePaymentNotify(xmlData: string): Promise<{ success: boolean; message: string; responseXml: string }> {
    try {
      console.log('📨 处理支付回调通知');

      // 1. 解析微信回调数据
      const notifyResult = await this.wechatPayService.handleNotify(xmlData);

      if (!notifyResult.success) {
        const responseXml = this.wechatPayService.generateNotifyResponse(false, notifyResult.message);
        return {
          success: false,
          message: notifyResult.message,
          responseXml
        };
      }

      const { outTradeNo, transactionId, totalFee, timeEnd, attach } = notifyResult.data!;

      // 2. 记录回调日志
      await prisma.paymentNotifyLog.create({
        data: {
          orderNo: outTradeNo,
          paymentMethod: PaymentMethod.WECHAT_PAY,
          notifyType: 'payment_success',
          requestBody: xmlData,
          responseStatus: 200,
          processStatus: 'PENDING'
        }
      });

      // 3. 处理支付成功
      const paymentTime = timeEnd ? new Date(timeEnd) : new Date();
      const handleResult = await this.handlePaymentSuccess(
        attach.orderNo || outTradeNo,
        transactionId,
        paymentTime,
        totalFee,
        attach
      );

      if (!handleResult.success) {
        // 更新回调日志为失败状态
        await prisma.paymentNotifyLog.updateMany({
          where: {
            orderNo: outTradeNo,
            processStatus: 'PENDING'
          },
          data: {
            processStatus: 'FAILED',
            errorMessage: handleResult.message,
            processTime: new Date()
          }
        });

        const responseXml = this.wechatPayService.generateNotifyResponse(false, handleResult.message);
        return {
          success: false,
          message: handleResult.message,
          responseXml
        };
      }

      // 4. 更新回调日志为成功状态
      await prisma.paymentNotifyLog.updateMany({
        where: {
          orderNo: outTradeNo,
          processStatus: 'PENDING'
        },
        data: {
          processStatus: 'SUCCESS',
          processTime: new Date()
        }
      });

      const responseXml = this.wechatPayService.generateNotifyResponse(true, 'OK');
      
      console.log('✅ 支付回调处理成功');

      return {
        success: true,
        message: '支付回调处理成功',
        responseXml
      };

    } catch (error: any) {
      console.error('❌ 处理支付回调失败:', error);
      
      const responseXml = this.wechatPayService.generateNotifyResponse(false, error.message);
      
      return {
        success: false,
        message: `回调处理失败: ${error.message}`,
        responseXml
      };
    }
  }

  /**
   * 同步微信支付状态到本地订单
   */
  private async syncOrderStatusFromWechat(order: any, wechatTradeState: string): Promise<void> {
    try {
      let localStatus: PaymentStatus;
      let reason: string | undefined;

      switch (wechatTradeState) {
        case WECHAT_PAY_V2_TRADE_STATES.SUCCESS:
          localStatus = PaymentStatus.PAID;
          break;
        case WECHAT_PAY_V2_TRADE_STATES.REFUND:
          localStatus = PaymentStatus.REFUNDED;
          break;
        case WECHAT_PAY_V2_TRADE_STATES.NOTPAY:
          localStatus = PaymentStatus.PENDING;
          break;
        case WECHAT_PAY_V2_TRADE_STATES.CLOSED:
          localStatus = PaymentStatus.CANCELLED;
          reason = '微信支付订单已关闭';
          break;
        case WECHAT_PAY_V2_TRADE_STATES.REVOKED:
          localStatus = PaymentStatus.CANCELLED;
          reason = '微信支付订单已撤销';
          break;
        case WECHAT_PAY_V2_TRADE_STATES.USERPAYING:
          localStatus = PaymentStatus.PENDING;
          break;
        case WECHAT_PAY_V2_TRADE_STATES.PAYERROR:
          localStatus = PaymentStatus.FAILED;
          reason = '微信支付失败';
          break;
        default:
          console.warn('⚠️ 未知的微信支付状态:', wechatTradeState);
          return;
      }

      if (order.paymentStatus !== localStatus) {
        await prisma.paymentOrder.update({
          where: { orderNo: order.orderNo },
          data: {
            paymentStatus: localStatus,
            failReason: reason
          }
        });

        console.log(`🔄 订单状态已同步: ${order.orderNo} -> ${localStatus}`);

        // 如果是支付成功，触发积分充值
        if (localStatus === PaymentStatus.PAID && order.paymentStatus === PaymentStatus.PENDING) {
          const result = await this.handlePaymentSuccess(
            order.orderNo,
            '',
            new Date(),
            Number(order.amount)
          );
          
          if (!result.success) {
            console.error('❌ 支付成功后积分充值失败:', result.message);
          }
        }
      }

    } catch (error) {
      console.error('❌ 同步微信支付状态失败:', error);
      throw error;
    }
  }
}

// 导出单例
let paymentService: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (!paymentService) {
    paymentService = new PaymentService();
  }
  return paymentService;
} 