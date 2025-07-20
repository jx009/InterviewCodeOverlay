import axios, { AxiosResponse } from 'axios';
import fs from 'fs';
import https from 'https';
import { WechatPayV2Crypto, createWechatPayV2Crypto, WECHAT_PAY_V2_CONSTANTS } from '../payment/utils/wechat-v2-crypto';
import { 
  WechatPayV2Config, 
  WechatPayV2UnifiedOrderRequest,
  WechatPayV2UnifiedOrderResponse,
  WechatPayV2OrderQueryRequest,
  WechatPayV2OrderQueryResponse,
  WechatPayV2RefundRequest,
  WechatPayV2RefundResponse,
  WechatPayV2NotifyData,
  getWechatPayV2Config,
  getWechatPayV2Urls,
  getWechatPayV2ErrorMessage,
  WECHAT_PAY_V2_ERROR_CODES
} from '../config/wechat-pay-v2';

// 统一下单请求参数
export interface CreateOrderRequest {
  outTradeNo: string;
  totalFee: number;
  body: string;
  attach?: string;
  timeExpire?: Date;
  notifyUrl?: string;
  spbillCreateIp?: string;
}

// 统一下单响应结果
export interface CreateOrderResult {
  success: boolean;
  message: string;
  data?: {
    prepayId?: string;
    codeUrl?: string;
    outTradeNo: string;
  };
  errorCode?: string;
}

// 订单查询响应结果
export interface QueryOrderResult {
  success: boolean;
  message: string;
  data?: {
    tradeState: string;
    tradeStateDesc: string;
    outTradeNo: string;
    transactionId?: string;
    totalFee?: number;
    cashFee?: number;
    timeEnd?: string;
    attach?: string;
  };
  errorCode?: string;
}

// 关闭订单响应结果
export interface CloseOrderResult {
  success: boolean;
  message: string;
  errorCode?: string;
}

// 回调处理结果
export interface NotifyResult {
  success: boolean;
  message: string;
  data?: {
    outTradeNo: string;
    transactionId: string;
    totalFee: number;
    timeEnd: string;
    attach?: any;
  };
}

export class WechatPayV2Service {
  private config: WechatPayV2Config;
  private crypto: WechatPayV2Crypto;
  private urls: any;

  constructor() {
    this.config = getWechatPayV2Config();
    this.crypto = createWechatPayV2Crypto(this.config.apiKey, this.config.signType);
    this.urls = getWechatPayV2Urls(this.config.environment);
  }

  /**
   * 统一下单 - Native支付（扫码支付）
   */
  async createNativeOrder(request: CreateOrderRequest): Promise<CreateOrderResult> {
    try {
      console.log('🚀 微信支付V2统一下单开始:', request);

      // 构建请求参数
      const unifiedOrderParams: WechatPayV2UnifiedOrderRequest = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        nonce_str: this.crypto.generateNonceStr(),
        sign_type: this.config.signType,
        body: request.body,
        out_trade_no: request.outTradeNo,
        total_fee: this.crypto.yuanToFen(request.totalFee),
        spbill_create_ip: request.spbillCreateIp || this.getClientIP(),
        notify_url: request.notifyUrl || this.config.notifyUrl,
        trade_type: 'NATIVE',
      };

      // 添加可选参数
      if (request.attach) {
        unifiedOrderParams.attach = request.attach;
      }

      if (request.timeExpire) {
        unifiedOrderParams.time_expire = this.formatDateTime(request.timeExpire);
      }

      console.log('📋 微信支付V2请求参数:', {
        appid: unifiedOrderParams.appid,
        mch_id: unifiedOrderParams.mch_id,
        out_trade_no: unifiedOrderParams.out_trade_no,
        total_fee: unifiedOrderParams.total_fee,
        body: unifiedOrderParams.body,
        trade_type: unifiedOrderParams.trade_type,
        spbill_create_ip: unifiedOrderParams.spbill_create_ip,
        notify_url: unifiedOrderParams.notify_url
      });

      // 生成签名
      const sign = this.crypto.generateSign(unifiedOrderParams);
      const finalParams = { ...unifiedOrderParams, sign };

      // 转换为XML格式
      const xmlData = this.crypto.objectToXml(finalParams);
      console.log('📤 发送XML数据:', xmlData);

      // 发送请求
      const response = await this.sendRequest(this.urls.UNIFIED_ORDER, xmlData);

      // 解析响应
      const responseData = this.crypto.xmlToObjectSync(response.data) as WechatPayV2UnifiedOrderResponse;

      console.log('📥 微信支付V2响应:', {
        return_code: responseData.return_code,
        return_msg: responseData.return_msg,
        result_code: responseData.result_code,
        err_code: responseData.err_code,
        err_code_des: responseData.err_code_des
      });

      // 检查返回状态
      if (responseData.return_code !== 'SUCCESS') {
        const errorMsg = `微信支付通信失败: ${responseData.return_msg || '未知错误'}`;
        console.error('❌ 通信失败:', errorMsg);
        console.error('❌ 完整响应数据:', responseData);
        
        // 如果是XML解析错误或响应格式错误，提供更详细的错误信息
        if (responseData.return_msg && responseData.return_msg.includes('XML')) {
          console.error('❌ 可能的原因: 请求XML格式错误或参数缺失');
          console.error('📤 发送的XML数据:', xmlData);
        }
        
        return {
          success: false,
          message: errorMsg,
          errorCode: responseData.return_code || 'COMMUNICATION_ERROR'
        };
      }

      // 检查业务结果
      if (responseData.result_code !== 'SUCCESS') {
        const errorMessage = getWechatPayV2ErrorMessage(responseData.err_code || '');
        const detailMessage = responseData.err_code_des || errorMessage;
        console.error('❌ 业务失败:', {
          err_code: responseData.err_code,
          err_code_des: responseData.err_code_des,
          message: detailMessage
        });
        
        return {
          success: false,
          message: detailMessage,
          errorCode: responseData.err_code || 'BUSINESS_ERROR'
        };
      }

      // 验证签名
      if (!this.crypto.verifySign(responseData)) {
        console.error('❌ 响应签名验证失败');
        return {
          success: false,
          message: '微信支付响应签名验证失败',
          errorCode: 'SIGN_ERROR'
        };
      }

      console.log('✅ 微信支付V2统一下单成功');

      return {
        success: true,
        message: '创建订单成功',
        data: {
          prepayId: responseData.prepay_id,
          codeUrl: responseData.code_url,
          outTradeNo: request.outTradeNo
        }
      };

    } catch (error: any) {
      console.error('❌ 微信支付V2统一下单失败:', error);
      
      // 根据错误类型返回不同的错误信息
      if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: '网络连接失败，请检查网络连接',
          errorCode: 'NETWORK_ERROR'
        };
      }
      
      if (error.code === 'ENOTFOUND') {
        return {
          success: false,
          message: 'DNS解析失败，请检查网络配置',
          errorCode: 'DNS_ERROR'
        };
      }
      
      if (error.message && error.message.includes('timeout')) {
        return {
          success: false,
          message: '请求超时，请稍后重试',
          errorCode: 'TIMEOUT_ERROR'
        };
      }
      
      return {
        success: false,
        message: `统一下单失败: ${error.message}`,
        errorCode: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * 查询订单
   */
  async queryOrder(outTradeNo: string): Promise<QueryOrderResult> {
    try {
      console.log('🔍 微信支付V2查询订单:', outTradeNo);

      // 构建请求参数
      const queryParams: WechatPayV2OrderQueryRequest = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        out_trade_no: outTradeNo,
        nonce_str: this.crypto.generateNonceStr(),
        sign_type: this.config.signType
      };

      // 生成签名
      const sign = this.crypto.generateSign(queryParams);
      const finalParams = { ...queryParams, sign };

      // 转换为XML格式
      const xmlData = this.crypto.objectToXml(finalParams);

      // 发送请求
      const response = await axios.post(this.urls.ORDER_QUERY, xmlData, {
        headers: {
          'Content-Type': 'text/xml',
          'User-Agent': 'WeChat Pay Node.js SDK'
        },
        timeout: 30000
      });

      // 解析响应
      const responseData = this.crypto.xmlToObjectSync(response.data) as WechatPayV2OrderQueryResponse;

      console.log('📥 微信支付V2查询响应:', {
        return_code: responseData.return_code,
        result_code: responseData.result_code,
        trade_state: responseData.trade_state
      });

      // 检查返回状态
      if (responseData.return_code !== 'SUCCESS') {
        return {
          success: false,
          message: `微信支付通信失败: ${responseData.return_msg}`,
          errorCode: responseData.return_code
        };
      }

      // 检查业务结果
      if (responseData.result_code !== 'SUCCESS') {
        const errorMessage = getWechatPayV2ErrorMessage(responseData.err_code || '');
        return {
          success: false,
          message: errorMessage,
          errorCode: responseData.err_code
        };
      }

      // 验证签名
      if (!this.crypto.verifySign(responseData)) {
        return {
          success: false,
          message: '微信支付响应签名验证失败',
          errorCode: 'SIGN_ERROR'
        };
      }

      console.log('✅ 微信支付V2查询订单成功');

      return {
        success: true,
        message: '查询订单成功',
        data: {
          tradeState: responseData.trade_state || 'UNKNOWN',
          tradeStateDesc: responseData.trade_state_desc || '未知状态',
          outTradeNo: responseData.out_trade_no || outTradeNo,
          transactionId: responseData.transaction_id,
          totalFee: responseData.total_fee ? this.crypto.fenToYuan(responseData.total_fee) : undefined,
          cashFee: responseData.cash_fee ? this.crypto.fenToYuan(responseData.cash_fee) : undefined,
          timeEnd: responseData.time_end,
          attach: responseData.attach
        }
      };

    } catch (error: any) {
      console.error('❌ 微信支付V2查询订单失败:', error);
      
      return {
        success: false,
        message: `查询订单失败: ${error.message}`,
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(outTradeNo: string): Promise<CloseOrderResult> {
    try {
      console.log('🔒 微信支付V2关闭订单:', outTradeNo);

      // 构建请求参数
      const closeParams = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        out_trade_no: outTradeNo,
        nonce_str: this.crypto.generateNonceStr(),
        sign_type: this.config.signType
      };

      // 生成签名
      const sign = this.crypto.generateSign(closeParams);
      const finalParams = { ...closeParams, sign };

      // 转换为XML格式
      const xmlData = this.crypto.objectToXml(finalParams);

      // 发送请求
      const response = await axios.post(this.urls.CLOSE_ORDER, xmlData, {
        headers: {
          'Content-Type': 'text/xml',
          'User-Agent': 'WeChat Pay Node.js SDK'
        },
        timeout: 30000
      });

      // 解析响应
      const responseData = this.crypto.xmlToObjectSync(response.data);

      console.log('📥 微信支付V2关闭订单响应:', {
        return_code: responseData.return_code,
        result_code: responseData.result_code
      });

      // 检查返回状态
      if (responseData.return_code !== 'SUCCESS') {
        return {
          success: false,
          message: `微信支付通信失败: ${responseData.return_msg}`,
          errorCode: responseData.return_code
        };
      }

      // 检查业务结果
      if (responseData.result_code !== 'SUCCESS') {
        const errorMessage = getWechatPayV2ErrorMessage(responseData.err_code || '');
        return {
          success: false,
          message: errorMessage,
          errorCode: responseData.err_code
        };
      }

      console.log('✅ 微信支付V2关闭订单成功');

      return {
        success: true,
        message: '关闭订单成功'
      };

    } catch (error: any) {
      console.error('❌ 微信支付V2关闭订单失败:', error);
      
      return {
        success: false,
        message: `关闭订单失败: ${error.message}`,
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * 处理支付回调通知
   */
  async handleNotify(xmlData: string): Promise<NotifyResult> {
    try {
      console.log('📨 处理微信支付V2回调通知');

      // 解析XML数据
      const notifyData = this.crypto.xmlToObjectSync(xmlData) as WechatPayV2NotifyData;

      console.log('📋 微信支付V2回调数据:', {
        return_code: notifyData.return_code,
        result_code: notifyData.result_code,
        out_trade_no: notifyData.out_trade_no,
        transaction_id: notifyData.transaction_id
      });

      // 检查返回状态
      if (notifyData.return_code !== 'SUCCESS') {
        return {
          success: false,
          message: `微信支付通信失败: ${notifyData.return_msg}`
        };
      }

      // 验证签名
      if (!this.crypto.verifySign(notifyData)) {
        console.error('❌ 微信支付V2回调签名验证失败');
        return {
          success: false,
          message: '签名验证失败'
        };
      }

      // 检查业务结果
      if (notifyData.result_code !== 'SUCCESS') {
        const errorMessage = getWechatPayV2ErrorMessage(notifyData.err_code || '');
        return {
          success: false,
          message: errorMessage
        };
      }

      console.log('✅ 微信支付V2回调验证成功');

      // 解析attach数据
      let attachData;
      try {
        attachData = notifyData.attach ? JSON.parse(notifyData.attach) : {};
      } catch (error) {
        attachData = {};
      }

      return {
        success: true,
        message: '支付回调处理成功',
        data: {
          outTradeNo: notifyData.out_trade_no || '',
          transactionId: notifyData.transaction_id || '',
          totalFee: notifyData.total_fee ? this.crypto.fenToYuan(notifyData.total_fee) : 0,
          timeEnd: notifyData.time_end || '',
          attach: attachData
        }
      };

    } catch (error: any) {
      console.error('❌ 微信支付V2回调处理失败:', error);
      
      return {
        success: false,
        message: `回调处理失败: ${error.message}`
      };
    }
  }

  /**
   * 生成回调响应XML
   */
  generateNotifyResponse(success: boolean, message: string = ''): string {
    const responseData = {
      return_code: success ? 'SUCCESS' : 'FAIL',
      return_msg: message || (success ? 'OK' : 'FAIL')
    };

    return this.crypto.objectToXml(responseData);
  }

  /**
   * 格式化时间为微信支付要求的格式
   */
  private formatDateTime(date: Date): string {
    return this.crypto.formatDateTime(date);
  }

  /**
   * 获取服务信息
   */
  getServiceInfo() {
    return {
      appId: this.config.appId,
      mchId: this.config.mchId,
      environment: this.config.environment,
      signType: this.config.signType,
      notifyUrl: this.config.notifyUrl
    };
  }

  /**
   * 发送HTTP请求
   */
  private async sendRequest(url: string, data: string): Promise<AxiosResponse> {
    const config = {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'WeChat Pay Node.js SDK v2.0',
        'Accept': 'application/xml'
      },
      timeout: 30000,
      maxRedirects: 3
    };

    console.log('🌐 发送请求到:', url);
    console.log('📤 请求配置:', config);
    console.log('📤 请求数据长度:', data.length);
    console.log('📤 请求数据预览:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));

    try {
      const response = await axios.post(url, data, config);
      
      console.log('📥 响应状态:', response.status);
      console.log('📥 响应头:', response.headers);
      console.log('📥 响应数据类型:', typeof response.data);
      console.log('📥 响应数据长度:', response.data ? response.data.length : 0);
      console.log('📥 响应数据预览:', response.data ? 
        (typeof response.data === 'string' ? 
          response.data.substring(0, 500) + (response.data.length > 500 ? '...' : '') :
          JSON.stringify(response.data).substring(0, 500)
        ) : 'null'
      );
      
      return response;
    } catch (error: any) {
      console.error('❌ 请求失败详情:', {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response'
      });
      throw error;
    }
  }

  /**
   * 获取客户端IP
   */
  private getClientIP(): string {
    // 在实际应用中应该从请求中获取真实IP
    return '127.0.0.1';
  }
}

// 导出服务实例
export function getWechatPayV2Service(): WechatPayV2Service {
  return new WechatPayV2Service();
} 