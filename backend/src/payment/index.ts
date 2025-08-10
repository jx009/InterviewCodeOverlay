// 支付系统主要导出
export * from './services/PaymentService';
export * from './services/PaymentNotifyService';
export * from './utils/wechat-v2-crypto';
export {
  getWechatPayV2Config,
  validateWechatPayV2Config,
  getWechatPayV2URLs,
  getWechatPayV2ErrorMessage,
  WECHAT_PAY_V2_ERROR_CODES
} from './config/wechat-v2-config';
export {
  getWechatPayV2Config as getPaymentConfig,
  validateWechatPayV2Config as validatePaymentConfig,
  checkPaymentConfig,
  PAYMENT_CONFIG,
  generateOrderNo,
  generateOutTradeNo,
  calculateExpireTime,
  validateAmount,
  calculatePoints,
  validatePoints
} from './config/payment-config';

// 导出路由
export { default as paymentRoutes } from './routes/payment';

// 导出类型定义
export type {
  WechatPayV2Config,
  WechatPayV2UnifiedOrderRequest,
  WechatPayV2UnifiedOrderResponse,
  WechatPayV2OrderQueryRequest,
  WechatPayV2OrderQueryResponse,
  WechatPayV2NotifyData
} from './config/wechat-v2-config'; 