// 支付回调通知服务
import { PrismaClient } from '@prisma/client';
import { getPaymentService } from './PaymentService';
import { getWechatPayV2Service } from '../../services/WechatPayV2Service';
import {
  PaymentNotifyData,
  NotifyResult,
  NotifyStatus,
  PaymentMethod
} from '../../types/payment';

const prisma = new PrismaClient();

export class PaymentNotifyService {
  private paymentService = getPaymentService();
  private wechatPayService = getWechatPayV2Service();

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
      const result = await this.wechatPayService.handleNotify(body);

      if (result.success && result.data) {
        // 处理支付成功
        const paymentResult = await this.paymentService.handlePaymentSuccess(
          result.data.outTradeNo,
          result.data.transactionId,
          new Date(result.data.timeEnd),
          result.data.attach
        );

        if (paymentResult.success) {
          await this.updateNotifyLog(notifyLogId, {
            processStatus: NotifyStatus.SUCCESS,
            errorMessage: null,
            processTime: new Date(),
            orderNo: result.data.outTradeNo
          });

          console.log('✅ 微信支付回调处理成功:', result.data.outTradeNo);
          
          return {
            success: true,
            message: '支付回调处理成功'
          };
        } else {
          await this.updateNotifyLog(notifyLogId, {
            processStatus: NotifyStatus.FAILED,
            errorMessage: paymentResult.message,
            processTime: new Date(),
            orderNo: result.data.outTradeNo
          });

          console.error('❌ 支付成功处理失败:', paymentResult.message);
          
          return {
            success: false,
            message: paymentResult.message
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
          message: result.message
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


}

// 单例模式
let paymentNotifyServiceInstance: PaymentNotifyService | null = null;

export function getPaymentNotifyService(): PaymentNotifyService {
  if (!paymentNotifyServiceInstance) {
    paymentNotifyServiceInstance = new PaymentNotifyService();
  }
  return paymentNotifyServiceInstance;
} 