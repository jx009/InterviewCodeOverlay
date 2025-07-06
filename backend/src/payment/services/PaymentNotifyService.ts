// 支付回调通知服务
import { PrismaClient } from '@prisma/client';
import { getPaymentService } from './PaymentService';
import { getWechatPayService } from './WechatPayService';
import {
  PaymentNotifyData,
  NotifyResult,
  NotifyStatus,
  PaymentMethod
} from '../../types/payment';

const prisma = new PrismaClient();

export class PaymentNotifyService {
  private paymentService = getPaymentService();
  private wechatPayService = getWechatPayService();

  /**
   * 处理微信支付回调通知
   */
  async handleWechatNotify(
    headers: Record<string, string>,
    body: string,
    clientIp: string
  ): Promise<NotifyResult> {
    const notifyLogId = await this.createNotifyLog({
      paymentMethod: PaymentMethod.WECHAT_PAY,
      notifyType: 'payment',
      headers: JSON.stringify(headers),
      body,
      clientIp,
      status: NotifyStatus.PENDING
    });

    try {
      console.log('📨 处理微信支付回调通知:', { notifyLogId, clientIp });

      // 使用微信支付服务处理回调
      const result = await this.wechatPayService.handleNotify(headers, body);

      if (result.success) {
        // 解析回调数据
        const notifyData = this.parseWechatNotifyData(body);
        
        if (notifyData) {
          // 处理支付成功
          const paymentResult = await this.paymentService.handlePaymentSuccess(
            notifyData.orderNo,
            notifyData.transactionId,
            notifyData.paymentTime,
            notifyData.metadata
          );

          if (paymentResult.success) {
            await this.updateNotifyLog(notifyLogId, {
              processStatus: NotifyStatus.SUCCESS,
              errorMessage: null,
              processTime: new Date()
            });

            console.log('✅ 微信支付回调处理成功:', notifyData.orderNo);
            
            return {
              success: true,
              message: '支付回调处理成功'
            };
          } else {
            await this.updateNotifyLog(notifyLogId, {
              processStatus: NotifyStatus.FAILED,
              errorMessage: paymentResult.message,
              processTime: new Date()
            });

            console.error('❌ 支付成功处理失败:', paymentResult.message);
            
            return {
              success: false,
              message: paymentResult.message,
              shouldRetry: true
            };
          }
        } else {
          await this.updateNotifyLog(notifyLogId, {
            processStatus: NotifyStatus.FAILED,
            errorMessage: '解析回调数据失败',
            processTime: new Date()
          });

          return {
            success: false,
            message: '解析回调数据失败'
          };
        }
      } else {
        await this.updateNotifyLog(notifyLogId, {
          processStatus: NotifyStatus.FAILED,
          errorMessage: result.message,
          processTime: new Date()
        });

        console.error('❌ 微信支付回调验证失败:', result.message);
        
        return {
          success: false,
          message: result.message,
          shouldRetry: result.shouldRetry
        };
      }

    } catch (error: any) {
      console.error('❌ 处理微信支付回调异常:', error);

      await this.updateNotifyLog(notifyLogId, {
        processStatus: NotifyStatus.FAILED,
        errorMessage: error.message,
        processTime: new Date()
      });

      return {
        success: false,
        message: `回调处理异常: ${error.message}`,
        shouldRetry: true
      };
    }
  }

  /**
   * 处理微信退款回调通知
   */
  async handleWechatRefundNotify(
    headers: Record<string, string>,
    body: string,
    clientIp: string
  ): Promise<NotifyResult> {
    const notifyLogId = await this.createNotifyLog({
      paymentMethod: PaymentMethod.WECHAT_PAY,
      notifyType: 'refund',
      headers: JSON.stringify(headers),
      body,
      clientIp,
      status: NotifyStatus.PENDING
    });

    try {
      console.log('💰 处理微信退款回调通知:', { notifyLogId, clientIp });

      // 使用微信支付服务处理退款回调
      const result = await this.wechatPayService.handleNotify(headers, body);

              if (result.success) {
          await this.updateNotifyLog(notifyLogId, {
            processStatus: NotifyStatus.SUCCESS,
            errorMessage: null,
            processTime: new Date()
          });

          console.log('✅ 微信退款回调处理成功');
          
          return {
            success: true,
            message: '退款回调处理成功'
          };
        } else {
          await this.updateNotifyLog(notifyLogId, {
            processStatus: NotifyStatus.FAILED,
            errorMessage: result.message,
            processTime: new Date()
          });

          console.error('❌ 微信退款回调处理失败:', result.message);
          
          return {
            success: false,
            message: result.message,
            shouldRetry: result.shouldRetry
          };
        }

    } catch (error: any) {
      console.error('❌ 处理微信退款回调异常:', error);

      await this.updateNotifyLog(notifyLogId, {
        processStatus: NotifyStatus.FAILED,
        errorMessage: error.message,
        processTime: new Date()
      });

      return {
        success: false,
        message: `退款回调处理异常: ${error.message}`,
        shouldRetry: true
      };
    }
  }

  /**
   * 重试失败的通知处理
   */
  async retryFailedNotify(notifyLogId: number): Promise<NotifyResult> {
    try {
      console.log('🔄 重试失败的通知处理:', notifyLogId);

      const notifyLog = await prisma.paymentNotifyLog.findUnique({
        where: { id: notifyLogId }
      });

      if (!notifyLog) {
        return {
          success: false,
          message: '通知日志不存在'
        };
      }

      if (notifyLog.processStatus === NotifyStatus.SUCCESS) {
        return {
          success: true,
          message: '通知已处理成功，无需重试'
        };
      }

      // 更新重试次数
      await this.updateNotifyLog(notifyLogId, {
        retryCount: notifyLog.retryCount + 1,
        processStatus: NotifyStatus.PENDING
      });

      // 根据通知类型重新处理
      const headers = JSON.parse(notifyLog.requestHeaders || '{}');
      
      if (notifyLog.notifyType === 'payment') {
        return await this.handleWechatNotify(headers, notifyLog.requestBody, '');
      } else if (notifyLog.notifyType === 'refund') {
        return await this.handleWechatRefundNotify(headers, notifyLog.requestBody, '');
      }

      return {
        success: false,
        message: '不支持的通知类型'
      };

    } catch (error: any) {
      console.error('❌ 重试通知处理异常:', error);
      
      return {
        success: false,
        message: `重试处理异常: ${error.message}`
      };
    }
  }

  /**
   * 获取通知日志列表
   */
  async getNotifyLogs(options: {
    page?: number;
    limit?: number;
    paymentMethod?: PaymentMethod;
    notifyType?: string;
    status?: NotifyStatus;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    try {
      console.log('📋 获取通知日志列表:', options);

      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 100);
      const skip = (page - 1) * limit;

      const where: any = {};

      if (options.paymentMethod) {
        where.paymentMethod = options.paymentMethod;
      }

      if (options.notifyType) {
        where.notifyType = options.notifyType;
      }

      if (options.status) {
        where.processStatus = options.status;
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

      const [logs, total] = await Promise.all([
        prisma.paymentNotifyLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.paymentNotifyLog.count({ where })
      ]);

      return {
        data: logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error: any) {
      console.error('❌ 获取通知日志列表失败:', error);
      throw new Error(`获取通知日志失败: ${error.message}`);
    }
  }

  /**
   * 获取通知统计信息
   */
  async getNotifyStatistics() {
    try {
      console.log('📊 获取通知统计信息');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalNotifies,
        successNotifies,
        failedNotifies,
        todayNotifies,
        pendingRetries
      ] = await Promise.all([
        // 总通知数
        prisma.paymentNotifyLog.count(),
        
        // 成功通知数
        prisma.paymentNotifyLog.count({
          where: { processStatus: NotifyStatus.SUCCESS }
        }),
        
        // 失败通知数
        prisma.paymentNotifyLog.count({
          where: { processStatus: NotifyStatus.FAILED }
        }),
        
        // 今日通知数
        prisma.paymentNotifyLog.count({
          where: { createdAt: { gte: today } }
        }),
        
        // 待重试通知数
        prisma.paymentNotifyLog.count({
          where: {
            processStatus: NotifyStatus.FAILED,
            retryCount: { lt: 3 }
          }
        })
      ]);

      const successRate = totalNotifies > 0 ? (successNotifies / totalNotifies) * 100 : 0;

      return {
        totalNotifies,
        successNotifies,
        failedNotifies,
        successRate: Math.round(successRate * 100) / 100,
        todayNotifies,
        pendingRetries
      };

    } catch (error: any) {
      console.error('❌ 获取通知统计信息失败:', error);
      throw new Error(`获取统计信息失败: ${error.message}`);
    }
  }

  /**
   * 创建通知日志
   */
  private async createNotifyLog(data: {
    paymentMethod: PaymentMethod;
    notifyType: string;
    headers: string;
    body: string;
    clientIp: string;
    status: NotifyStatus;
  }): Promise<number> {
    try {
      const log = await prisma.paymentNotifyLog.create({
        data: {
          orderNo: '', // 临时设置，后续可更新
          paymentMethod: data.paymentMethod,
          notifyType: data.notifyType,
          requestHeaders: data.headers,
          requestBody: data.body,
          processStatus: data.status,
          retryCount: 0
        }
      });

      return log.id;

    } catch (error) {
      console.error('❌ 创建通知日志失败:', error);
      throw error;
    }
  }

  /**
   * 更新通知日志
   */
  private async updateNotifyLog(
    id: number,
    data: {
      processStatus?: NotifyStatus;
      errorMessage?: string | null;
      processTime?: Date;
      retryCount?: number;
      orderNo?: string;
    }
  ): Promise<void> {
    try {
      await prisma.paymentNotifyLog.update({
        where: { id },
        data
      });

    } catch (error) {
      console.error('❌ 更新通知日志失败:', error);
      throw error;
    }
  }

  /**
   * 解析微信支付回调数据
   */
  private parseWechatNotifyData(body: string): PaymentNotifyData | null {
    try {
      const notifyData = JSON.parse(body);
      const resource = notifyData.resource;

      // 这里简化处理，实际应该根据是否加密来解密数据
      let paymentData;
      if (resource.ciphertext) {
        // 如果数据被加密，需要解密（这里简化处理）
        paymentData = resource;
      } else {
        paymentData = resource;
      }

      // 提取订单号（从attach或其他字段）
      let orderNo = '';
      if (paymentData.attach) {
        try {
          const attachData = JSON.parse(paymentData.attach);
          orderNo = attachData.orderNo || paymentData.out_trade_no;
        } catch {
          orderNo = paymentData.out_trade_no;
        }
      } else {
        orderNo = paymentData.out_trade_no;
      }

      return {
        orderNo,
        outTradeNo: paymentData.out_trade_no,
        transactionId: paymentData.transaction_id || '',
        totalAmount: paymentData.amount?.total ? paymentData.amount.total / 100 : 0,
        tradeStatus: paymentData.trade_state || '',
        paymentTime: paymentData.success_time ? new Date(paymentData.success_time) : new Date(),
        metadata: {
          attach: paymentData.attach ? JSON.parse(paymentData.attach) : {},
          payerInfo: paymentData.payer
        }
      };

    } catch (error) {
      console.error('❌ 解析微信支付回调数据失败:', error);
      return null;
    }
  }
}

// 单例模式
let paymentNotifyServiceInstance: PaymentNotifyService | null = null;

export function getPaymentNotifyService(): PaymentNotifyService {
  if (!paymentNotifyServiceInstance) {
    paymentNotifyServiceInstance = new PaymentNotifyService();
  }
  return paymentNotifyServiceInstance;
} 