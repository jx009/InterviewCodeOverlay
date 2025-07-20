// 支付统一服务层
import { PrismaClient } from '@prisma/client';
import { PointService } from '../../services/PointService';
import { getWechatPayV2Service } from '../../services/WechatPayV2Service';
import {
  generateOrderNo,
  generateOutTradeNo,
  calculateExpireTime,
  validateAmount,
  PAYMENT_CONFIG
} from '../config/payment-config';
import {
  PaymentOrder,
  PaymentPackage,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderQueryResponse,
  PaymentMethod,
  PaymentStatus,
  PaymentNotifyData,
  OrderFilterOptions,
  PaginatedResponse,
  PaymentStatistics
} from '../../types/payment';

const prisma = new PrismaClient();

export class PaymentService {
  private pointService = new PointService();
  private wechatPayService = getWechatPayV2Service();
  private config = this.wechatPayService.getServiceInfo();

  /**
   * 获取支付套餐列表
   */
  async getPaymentPackages(): Promise<PaymentPackage[]> {
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
  async getPaymentPackageById(packageId: number): Promise<PaymentPackage | null> {
    try {
      console.log('🔍 获取支付套餐:', packageId);

      const packageData = await prisma.paymentPackage.findUnique({
        where: { id: packageId, isActive: true }
      });

      if (!packageData) {
        console.warn('⚠️ 套餐不存在或已禁用:', packageId);
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
   * 创建充值订单
   */
  async createRechargeOrder(
    userId: number,
    packageId: number,
    paymentMethod: PaymentMethod = 'WECHAT_PAY'
  ): Promise<CreateOrderResponse> {
    try {
      console.log('🚀 创建充值订单:', { userId, packageId, paymentMethod });

      // 验证用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, points: true }
      });

      if (!user) {
        return {
          success: false,
          message: '用户不存在'
        };
      }

      // 获取套餐信息
      const packageData = await this.getPaymentPackageById(packageId);
      if (!packageData) {
        return {
          success: false,
          message: '套餐不存在或已下架'
        };
      }

      // 验证支付金额
      const amountValidation = validateAmount(Number(packageData.amount));
      if (!amountValidation.valid) {
        return {
          success: false,
          message: amountValidation.message!
        };
      }

      // 生成订单号
      const orderNo = generateOrderNo();
      const outTradeNo = generateOutTradeNo();
      const expireTime = calculateExpireTime();

      // 创建订单记录
      const order = await prisma.paymentOrder.create({
        data: {
          orderNo,
          outTradeNo,
          userId,
          amount: packageData.amount,
          points: packageData.points,
          bonusPoints: packageData.bonusPoints,
          paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          expireTime,
          packageId,
          metadata: JSON.stringify({
            userInfo: {
              id: user.id,
              username: user.username,
              currentPoints: user.points
            },
            packageInfo: {
              name: packageData.name,
              description: packageData.description
            }
          })
        }
      });

      console.log('✅ 订单创建成功:', orderNo);

      // 根据支付方式调用相应的支付服务
      if (paymentMethod === PaymentMethod.WECHAT_PAY) {
        const createOrderRequest = {
          outTradeNo,
          totalFee: Number(packageData.amount),
          body: `${packageData.name} - ${packageData.points}积分`,
          attach: JSON.stringify({
            orderNo,
            userId,
            packageId,
            packageName: packageData.name
          })
        };

        const paymentResult = await this.wechatPayService.createNativeOrder(createOrderRequest);

        if (paymentResult.success) {
          console.log('✅ 微信支付订单创建成功');
          return {
            success: true,
            orderNo,
            paymentData: {
              codeUrl: paymentResult.data?.codeUrl,
              prepayId: paymentResult.data?.prepayId,
              appId: this.config.appId,
              tradeType: 'NATIVE'
            },
            expireTime,
            message: '订单创建成功'
          };
        } else {
          // 支付订单创建失败，更新本地订单状态
          await this.updateOrderStatus(orderNo, PaymentStatus.FAILED, paymentResult.message);
          
          return {
            success: false,
            message: paymentResult.message
          };
        }
      }

      return {
        success: false,
        message: '不支持的支付方式'
      };

    } catch (error: any) {
      console.error('❌ 创建充值订单失败:', error);
      
      return {
        success: false,
        message: `创建订单失败: ${error.message}`
      };
    }
  }

  /**
   * 查询订单状态
   */
  async getOrderStatus(orderNo: string): Promise<OrderQueryResponse> {
    try {
      console.log('🔍 查询订单状态:', orderNo);

      // 查询本地订单
      const order = await prisma.paymentOrder.findUnique({
        where: { orderNo },
        include: {
          user: {
            select: { id: true, username: true }
          },
          package: {
            select: { name: true, description: true }
          }
        }
      });

      if (!order) {
        return {
          success: false,
          message: '订单不存在'
        };
      }

      // 如果订单已完成或失败，直接返回本地状态
      if (order.paymentStatus === PaymentStatus.PAID || 
          order.paymentStatus === PaymentStatus.FAILED ||
          order.paymentStatus === PaymentStatus.CANCELLED) {
        return {
          success: true,
          order: order as PaymentOrder,
          tradeState: order.paymentStatus,
          tradeStateDesc: this.getStatusDescription(order.paymentStatus),
          message: '查询订单成功'
        };
      }

      // 检查订单是否过期
      if (new Date() > order.expireTime && order.paymentStatus === PaymentStatus.PENDING) {
        await this.updateOrderStatus(orderNo, PaymentStatus.EXPIRED, '订单已过期');
        
        return {
          success: true,
          order: { ...order, paymentStatus: PaymentStatus.EXPIRED } as PaymentOrder,
          tradeState: PaymentStatus.EXPIRED,
          tradeStateDesc: '订单已过期',
          message: '订单已过期'
        };
      }

      // 查询第三方支付状态
      if (order.paymentMethod === PaymentMethod.WECHAT_PAY) {
        const wechatQuery = await this.wechatPayService.queryOrder(order.outTradeNo);
        
        if (wechatQuery.success && wechatQuery.data) {
          // 根据微信支付状态更新本地订单
          await this.syncOrderStatusFromWechat(order, wechatQuery.data.tradeState);
          
          // 重新查询更新后的订单
          const updatedOrder = await prisma.paymentOrder.findUnique({
            where: { orderNo },
            include: {
              user: { select: { id: true, username: true } },
              package: { select: { name: true, description: true } }
            }
          });

          return {
            success: true,
            order: updatedOrder as PaymentOrder,
            tradeState: wechatQuery.data.tradeState,
            tradeStateDesc: wechatQuery.data.tradeStateDesc,
            message: '查询订单成功'
          };
        }
      }

      return {
        success: true,
        order: order as PaymentOrder,
        tradeState: order.paymentStatus,
        tradeStateDesc: this.getStatusDescription(order.paymentStatus),
        message: '查询订单成功'
      };

    } catch (error: any) {
      console.error('❌ 查询订单状态失败:', error);
      
      return {
        success: false,
        message: `查询失败: ${error.message}`
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
    notifyData?: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('💳 处理支付成功:', { orderNo, transactionId });

      const result = await prisma.$transaction(async (tx) => {
        // 查询订单
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

        // 更新订单状态
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
                paymentNotify: notifyData
              }) : 
              JSON.stringify({ paymentNotify: notifyData })
          }
        });

        // 充值积分
        const totalPoints = order.points + order.bonusPoints;
        const rechargeResult = await this.pointService.rechargePoints(
          order.userId,
          totalPoints,
          `支付充值 - 订单号: ${orderNo} (基础积分: ${order.points}, 赠送积分: ${order.bonusPoints})`
        );

        if (!rechargeResult.success) {
          throw new Error(`积分充值失败: ${rechargeResult.message}`);
        }

        console.log(`✅ 积分充值成功: ${totalPoints}积分, 余额: ${rechargeResult.newBalance}`);

        return {
          success: true,
          message: `支付成功，已充值${totalPoints}积分`
        };
      });

      return result;

    } catch (error: any) {
      console.error('❌ 处理支付成功失败:', error);
      
      return {
        success: false,
        message: `处理失败: ${error.message}`
      };
    }
  }

  /**
   * 更新订单状态
   */
  private async updateOrderStatus(
    orderNo: string,
    status: PaymentStatus,
    reason?: string
  ): Promise<void> {
    try {
      await prisma.paymentOrder.update({
        where: { orderNo },
        data: {
          paymentStatus: status,
          failReason: reason || null,
          updatedAt: new Date()
        }
      });

      console.log(`✅ 订单状态更新: ${orderNo} -> ${status}`);

    } catch (error) {
      console.error('❌ 更新订单状态失败:', error);
      throw error;
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
        case 'SUCCESS':
          localStatus = PaymentStatus.PAID;
          break;
        case 'REFUND':
          localStatus = PaymentStatus.FAILED;
          reason = '订单已退款';
          break;
        case 'NOTPAY':
          localStatus = PaymentStatus.PENDING;
          break;
        case 'CLOSED':
          localStatus = PaymentStatus.CANCELLED;
          reason = '微信支付订单已关闭';
          break;
        case 'REVOKED':
          localStatus = PaymentStatus.CANCELLED;
          reason = '微信支付订单已撤销';
          break;
        case 'USERPAYING':
          localStatus = PaymentStatus.PENDING;
          break;
        case 'PAYERROR':
          localStatus = PaymentStatus.FAILED;
          reason = '微信支付失败';
          break;
        default:
          console.warn('⚠️ 未知的微信支付状态:', wechatTradeState);
          return;
      }

      if (order.paymentStatus !== localStatus) {
        await this.updateOrderStatus(order.orderNo, localStatus, reason);
        
        // 如果是支付成功，处理积分充值
        if (localStatus === PaymentStatus.PAID && order.paymentStatus === PaymentStatus.PENDING) {
          await this.handlePaymentSuccess(order.orderNo, '', new Date());
        }
      }

    } catch (error) {
      console.error('❌ 同步微信支付状态失败:', error);
      throw error;
    }
  }

  /**
   * 取消未支付订单
   */
  async cancelOrder(orderNo: string, userId?: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔒 取消订单:', { orderNo, userId });

      const order = await prisma.paymentOrder.findUnique({
        where: { orderNo }
      });

      if (!order) {
        return {
          success: false,
          message: '订单不存在'
        };
      }

      // 验证用户权限
      if (userId && order.userId !== userId) {
        return {
          success: false,
          message: '无权操作此订单'
        };
      }

      if (order.paymentStatus !== PaymentStatus.PENDING) {
        return {
          success: false,
          message: `订单状态为${order.paymentStatus}，无法取消`
        };
      }

      // 关闭第三方支付订单
      if (order.paymentMethod === PaymentMethod.WECHAT_PAY) {
        const closeResult = await this.wechatPayService.closeOrder(order.outTradeNo);
        if (!closeResult.success) {
          console.warn('⚠️ 关闭微信支付订单失败:', closeResult.message);
        }
      }

      // 更新本地订单状态
      await this.updateOrderStatus(orderNo, PaymentStatus.CANCELLED, '用户取消订单');

      return {
        success: true,
        message: '订单取消成功'
      };

    } catch (error: any) {
      console.error('❌ 取消订单失败:', error);
      
      return {
        success: false,
        message: `取消失败: ${error.message}`
      };
    }
  }

  /**
   * 获取用户订单列表
   */
  async getUserOrders(
    userId: number,
    options: OrderFilterOptions = {}
  ): Promise<PaginatedResponse<PaymentOrder>> {
    try {
      console.log('📋 获取用户订单列表:', { userId, options });

      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 100);
      const skip = (page - 1) * limit;

      const where: any = { userId };

      // 添加过滤条件
      if (options.paymentStatus) {
        where.paymentStatus = options.paymentStatus;
      }

      if (options.paymentMethod) {
        where.paymentMethod = options.paymentMethod;
      }

      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) {
          where.createdAt.gte = options.startDate;
        }
        if (options.endDate) {
          where.createdAt.lte = options.endDate;
        }
      }

      const [orders, total] = await Promise.all([
        prisma.paymentOrder.findMany({
          where,
          include: {
            package: {
              select: { name: true, description: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.paymentOrder.count({ where })
      ]);

      return {
        data: orders as PaymentOrder[],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error: any) {
      console.error('❌ 获取用户订单列表失败:', error);
      throw new Error(`获取订单列表失败: ${error.message}`);
    }
  }

  /**
   * 获取状态描述
   */
  private getStatusDescription(status: PaymentStatus): string {
    const descriptions = {
      [PaymentStatus.PENDING]: '待支付',
      [PaymentStatus.PAID]: '已支付',
      [PaymentStatus.FAILED]: '支付失败',
      [PaymentStatus.CANCELLED]: '已取消',
      [PaymentStatus.EXPIRED]: '已过期'
    };

    return descriptions[status] || '未知状态';
  }
}

// 单例模式
let paymentServiceInstance: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (!paymentServiceInstance) {
    paymentServiceInstance = new PaymentService();
  }
  return paymentServiceInstance;
}
