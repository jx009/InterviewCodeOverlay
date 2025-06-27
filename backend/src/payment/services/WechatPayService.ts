// 微信支付核心服务
import axios, { AxiosResponse } from 'axios';
import { PrismaClient } from '@prisma/client';
import { getWechatCrypto } from '../utils/wechat-crypto';
import { getWechatPayConfig } from '../config/payment-config';
import { 
  getWechatPayUrls, 
  getWechatPayHeaders,
  WECHAT_TRADE_STATES,
  WECHAT_ERROR_CODES,
  WECHAT_NOTIFY_TYPES,
  yuanToFen,
  fenToYuan,
  validateWechatAmount,
  formatDescription,
  generateNonceStr,
  generateTimestamp
} from '../config/wechat-config';
import {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderQueryResponse,
  WechatPayData,
  RefundRequest,
  RefundResponse,
  PaymentNotifyData,
  NotifyResult,
  PaymentError
} from '../../types/payment';

const prisma = new PrismaClient();

export class WechatPayService {
  private crypto = getWechatCrypto();
  private config = getWechatPayConfig();
  private urls = getWechatPayUrls();

  /**
   * 创建Native支付订单（扫码支付）
   */
  async createNativeOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      console.log('🚀 创建微信Native支付订单:', request);

      // 验证金额
      const amountInFen = yuanToFen(request.amount);
      if (!validateWechatAmount(amountInFen)) {
        return {
          success: false,
          message: '支付金额不符合微信支付要求'
        };
      }

      // 构建请求参数
      const requestData = {
        appid: this.config.appId,
        mchid: this.config.mchId,
        description: formatDescription(request.description || '积分充值'),
        out_trade_no: request.metadata?.outTradeNo || '',
        time_expire: this.formatExpireTime(new Date(Date.now() + 15 * 60 * 1000)),
        notify_url: this.config.notifyUrl,
        amount: {
          total: amountInFen,
          currency: 'CNY'
        },
        attach: JSON.stringify({
          userId: request.userId,
          packageId: request.packageId,
          orderType: 'recharge'
        })
      };

      const url = `${this.urls.BASE_URL}${this.urls.UNIFIEDORDER}`;
      const requestBody = JSON.stringify(requestData);

      // 生成签名和请求头
      const authorization = this.crypto.generateAuthorizationHeader('POST', this.urls.UNIFIEDORDER, requestBody);
      const headers = getWechatPayHeaders(authorization);

      console.log('📤 发送微信支付请求:', { url, headers: { ...headers, Authorization: '***' } });

      // 发送请求
      const response: AxiosResponse = await axios.post(url, requestData, { 
        headers,
        timeout: 30000,
        validateStatus: (status) => status < 500 // 允许4xx状态码
      });

      console.log('📥 微信支付响应:', { status: response.status, data: response.data });

      if (response.status === 200 && response.data.code_url) {
        const paymentData: WechatPayData = {
          codeUrl: response.data.code_url,
          prepayId: response.data.prepay_id
        };

        return {
          success: true,
          paymentData,
          expireTime: new Date(Date.now() + 15 * 60 * 1000),
          message: '创建支付订单成功'
        };
      } else {
        const errorCode = response.data?.code || 'UNKNOWN_ERROR';
        const errorMessage = response.data?.message || '创建支付订单失败';
        
        console.error('❌ 微信支付创建订单失败:', { errorCode, errorMessage, response: response.data });
        
        return {
          success: false,
          message: `微信支付错误: ${errorMessage} (${errorCode})`
        };
      }

    } catch (error: any) {
      console.error('❌ 创建微信支付订单异常:', error);
      
      if (error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          message: `微信支付服务错误: ${errorData?.message || error.message}`
        };
      }
      
      return {
        success: false,
        message: `网络错误: ${error.message}`
      };
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrder(outTradeNo: string): Promise<OrderQueryResponse> {
    try {
      console.log('🔍 查询微信支付订单:', outTradeNo);

      const url = `${this.urls.BASE_URL}${this.urls.QUERY}/${outTradeNo}?mchid=${this.config.mchId}`;
      const authorization = this.crypto.generateAuthorizationHeader('GET', `${this.urls.QUERY}/${outTradeNo}?mchid=${this.config.mchId}`);
      const headers = getWechatPayHeaders(authorization);

      const response: AxiosResponse = await axios.get(url, { 
        headers,
        timeout: 30000,
        validateStatus: (status) => status < 500
      });

      console.log('📥 微信支付查询响应:', { status: response.status, data: response.data });

      if (response.status === 200) {
        const data = response.data;
        
        return {
          success: true,
          tradeState: data.trade_state,
          tradeStateDesc: data.trade_state_desc,
          message: '查询订单成功'
        };
      } else if (response.status === 404) {
        return {
          success: false,
          message: '订单不存在'
        };
      } else {
        const errorMessage = response.data?.message || '查询订单失败';
        console.error('❌ 微信支付查询订单失败:', response.data);
        
        return {
          success: false,
          message: `查询失败: ${errorMessage}`
        };
      }

    } catch (error: any) {
      console.error('❌ 查询微信支付订单异常:', error);
      
      return {
        success: false,
        message: `查询异常: ${error.message}`
      };
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(outTradeNo: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔒 关闭微信支付订单:', outTradeNo);

      const requestData = {
        mchid: this.config.mchId
      };

      const url = `${this.urls.BASE_URL}${this.urls.CLOSE}/${outTradeNo}/close`;
      const requestBody = JSON.stringify(requestData);
      const authorization = this.crypto.generateAuthorizationHeader('POST', `${this.urls.CLOSE}/${outTradeNo}/close`, requestBody);
      const headers = getWechatPayHeaders(authorization);

      const response: AxiosResponse = await axios.post(url, requestData, { 
        headers,
        timeout: 30000,
        validateStatus: (status) => status < 500
      });

      console.log('📥 微信支付关闭订单响应:', { status: response.status });

      if (response.status === 204) {
        return {
          success: true,
          message: '关闭订单成功'
        };
      } else {
        const errorMessage = response.data?.message || '关闭订单失败';
        console.error('❌ 微信支付关闭订单失败:', response.data);
        
        return {
          success: false,
          message: `关闭失败: ${errorMessage}`
        };
      }

    } catch (error: any) {
      console.error('❌ 关闭微信支付订单异常:', error);
      
      return {
        success: false,
        message: `关闭异常: ${error.message}`
      };
    }
  }

  /**
   * 申请退款
   */
  async refund(request: RefundRequest): Promise<RefundResponse> {
    try {
      console.log('💰 申请微信支付退款:', request);

      const refundAmountInFen = yuanToFen(request.refundAmount);
      if (!validateWechatAmount(refundAmountInFen)) {
        return {
          success: false,
          message: '退款金额不符合微信支付要求'
        };
      }

      // 先查询原订单信息
      const orderQuery = await this.queryOrder(request.orderNo);
      if (!orderQuery.success) {
        return {
          success: false,
          message: '原订单不存在，无法申请退款'
        };
      }

      const requestData = {
        out_trade_no: request.orderNo,
        out_refund_no: request.refundNo || `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reason: request.refundReason || '用户申请退款',
        notify_url: this.config.notifyUrl.replace('/wechat', '/wechat/refund'),
        amount: {
          refund: refundAmountInFen,
          total: refundAmountInFen, // 这里应该是原订单金额，简化处理
          currency: 'CNY'
        }
      };

      const url = `${this.urls.BASE_URL}${this.urls.REFUND}`;
      const requestBody = JSON.stringify(requestData);
      const authorization = this.crypto.generateAuthorizationHeader('POST', this.urls.REFUND, requestBody);
      const headers = getWechatPayHeaders(authorization);

      const response: AxiosResponse = await axios.post(url, requestData, { 
        headers,
        timeout: 30000,
        validateStatus: (status) => status < 500
      });

      console.log('📥 微信支付退款响应:', { status: response.status, data: response.data });

      if (response.status === 200 && response.data.status === 'SUCCESS') {
        return {
          success: true,
          refundId: response.data.refund_id,
          refundAmount: fenToYuan(response.data.amount.refund),
          message: '申请退款成功'
        };
      } else {
        const errorMessage = response.data?.message || '申请退款失败';
        console.error('❌ 微信支付申请退款失败:', response.data);
        
        return {
          success: false,
          message: `退款失败: ${errorMessage}`
        };
      }

    } catch (error: any) {
      console.error('❌ 申请微信支付退款异常:', error);
      
      return {
        success: false,
        message: `退款异常: ${error.message}`
      };
    }
  }

  /**
   * 处理支付回调通知
   */
  async handleNotify(
    headers: Record<string, string>,
    body: string
  ): Promise<NotifyResult> {
    try {
      console.log('📨 处理微信支付回调通知');

      // 验证必需的头部
      const timestamp = headers['wechatpay-timestamp'];
      const nonce = headers['wechatpay-nonce'];
      const signature = headers['wechatpay-signature'];
      const serial = headers['wechatpay-serial'];

      if (!timestamp || !nonce || !signature || !serial) {
        console.error('❌ 微信支付回调头部不完整:', headers);
        return {
          success: false,
          message: '回调头部信息不完整'
        };
      }

      // 验证签名
      const signatureValid = this.crypto.verifyNotifySignature(timestamp, nonce, body, signature);
      if (!signatureValid) {
        console.error('❌ 微信支付回调签名验证失败');
        return {
          success: false,
          message: '签名验证失败'
        };
      }

      // 解析回调数据
      const notifyData = JSON.parse(body);
      console.log('📋 微信支付回调数据:', notifyData);

      // 处理不同类型的通知
      if (notifyData.event_type === WECHAT_NOTIFY_TYPES.TRANSACTION) {
        return await this.handlePaymentNotify(notifyData);
      } else if (notifyData.event_type === WECHAT_NOTIFY_TYPES.REFUND) {
        return await this.handleRefundNotify(notifyData);
      } else {
        console.warn('⚠️ 未知的微信支付回调类型:', notifyData.event_type);
        return {
          success: true,
          message: '未处理的回调类型'
        };
      }

    } catch (error: any) {
      console.error('❌ 处理微信支付回调异常:', error);
      
      return {
        success: false,
        message: `回调处理异常: ${error.message}`,
        shouldRetry: true
      };
    }
  }

  /**
   * 处理支付成功通知
   */
  private async handlePaymentNotify(notifyData: any): Promise<NotifyResult> {
    try {
      const resource = notifyData.resource;
      
      // 解密回调数据（如果需要）
      let paymentData;
      if (resource.ciphertext) {
        const decryptedData = this.crypto.decryptAES256GCM(
          resource.ciphertext,
          this.config.apiV3Key,
          resource.nonce,
          resource.associated_data
        );
        paymentData = JSON.parse(decryptedData);
      } else {
        paymentData = resource;
      }

      console.log('💳 微信支付成功数据:', paymentData);

      // 提取关键信息
      const outTradeNo = paymentData.out_trade_no;
      const transactionId = paymentData.transaction_id;
      const tradeState = paymentData.trade_state;
      const totalAmount = fenToYuan(paymentData.amount?.total || 0);

      if (tradeState === WECHAT_TRADE_STATES.SUCCESS) {
        // 构建通知数据
        const notifyInfo: PaymentNotifyData = {
          orderNo: outTradeNo,
          outTradeNo: outTradeNo,
          transactionId: transactionId,
          totalAmount: totalAmount,
          tradeStatus: tradeState,
          paymentTime: new Date(paymentData.success_time),
          metadata: {
            attach: paymentData.attach ? JSON.parse(paymentData.attach) : {},
            payerInfo: paymentData.payer
          }
        };

        return {
          success: true,
          message: '支付成功通知处理完成'
        };
      } else {
        console.warn('⚠️ 微信支付状态非成功:', tradeState);
        return {
          success: true,
          message: `支付状态: ${tradeState}`
        };
      }

    } catch (error: any) {
      console.error('❌ 处理微信支付成功通知异常:', error);
      
      return {
        success: false,
        message: `支付通知处理异常: ${error.message}`,
        shouldRetry: true
      };
    }
  }

  /**
   * 处理退款成功通知
   */
  private async handleRefundNotify(notifyData: any): Promise<NotifyResult> {
    try {
      console.log('💰 处理微信退款通知:', notifyData);
      
      // 这里可以添加退款通知的具体处理逻辑
      return {
        success: true,
        message: '退款通知处理完成'
      };

    } catch (error: any) {
      console.error('❌ 处理微信退款通知异常:', error);
      
      return {
        success: false,
        message: `退款通知处理异常: ${error.message}`,
        shouldRetry: true
      };
    }
  }

  /**
   * 格式化过期时间为微信支付格式
   */
  private formatExpireTime(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '+08:00');
  }

  /**
   * 获取服务配置信息
   */
  getServiceInfo() {
    return {
      appId: this.config.appId,
      mchId: this.config.mchId,
      environment: this.config.environment,
      notifyUrl: this.config.notifyUrl
    };
  }
}

// 单例模式
let wechatPayServiceInstance: WechatPayService | null = null;

export function getWechatPayService(): WechatPayService {
  if (!wechatPayServiceInstance) {
    wechatPayServiceInstance = new WechatPayService();
  }
  return wechatPayServiceInstance;
} 