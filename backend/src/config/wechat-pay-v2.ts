import crypto from 'crypto';

// 微信支付V2配置接口
export interface WechatPayV2Config {
  appId: string;          // 应用ID
  mchId: string;          // 商户号
  apiKey: string;         // 商户API密钥
  notifyUrl: string;      // 支付回调URL
  certPath?: string;      // 证书路径（退款时需要）
  keyPath?: string;       // 私钥路径（退款时需要）
  signType: 'MD5' | 'HMAC-SHA256'; // 签名类型
  environment: 'sandbox' | 'production'; // 环境
}

// 微信支付V2 API地址
export const WECHAT_PAY_V2_URLS = {
  UNIFIED_ORDER: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
  ORDER_QUERY: 'https://api.mch.weixin.qq.com/pay/orderquery',
  CLOSE_ORDER: 'https://api.mch.weixin.qq.com/pay/closeorder',
  REFUND: 'https://api.mch.weixin.qq.com/secapi/pay/refund',
  REFUND_QUERY: 'https://api.mch.weixin.qq.com/pay/refundquery',
  DOWNLOAD_BILL: 'https://api.mch.weixin.qq.com/pay/downloadbill',
  REPORT: 'https://api.mch.weixin.qq.com/payitil/report',
};

// 微信支付V2交易状态
export const WECHAT_PAY_V2_TRADE_STATES = {
  SUCCESS: 'SUCCESS',         // 支付成功
  REFUND: 'REFUND',          // 转入退款
  NOTPAY: 'NOTPAY',          // 未支付
  CLOSED: 'CLOSED',          // 已关闭
  REVOKED: 'REVOKED',        // 已撤销（刷卡支付）
  USERPAYING: 'USERPAYING',  // 用户支付中
  PAYERROR: 'PAYERROR',      // 支付失败
};

// 微信支付V2错误代码
export const WECHAT_PAY_V2_ERROR_CODES = {
  NOAUTH: 'NOAUTH',                       // 商户无此接口权限
  NOTENOUGH: 'NOTENOUGH',                 // 余额不足
  ORDERPAID: 'ORDERPAID',                 // 商户订单已支付
  ORDERCLOSED: 'ORDERCLOSED',             // 订单已关闭
  SYSTEMERROR: 'SYSTEMERROR',             // 系统错误
  APPID_NOT_EXIST: 'APPID_NOT_EXIST',     // APPID不存在
  MCHID_NOT_EXIST: 'MCHID_NOT_EXIST',     // MCHID不存在
  APPID_MCHID_NOT_MATCH: 'APPID_MCHID_NOT_MATCH', // appid和mch_id不匹配
  LACK_PARAMS: 'LACK_PARAMS',             // 缺少参数
  OUT_TRADE_NO_USED: 'OUT_TRADE_NO_USED', // 商户订单号重复
  SIGNERROR: 'SIGNERROR',                 // 签名错误
  XML_FORMAT_ERROR: 'XML_FORMAT_ERROR',   // XML格式错误
  REQUIRE_POST_METHOD: 'REQUIRE_POST_METHOD', // 请求方式错误
  POST_DATA_EMPTY: 'POST_DATA_EMPTY',     // post数据为空
  NOT_UTF8: 'NOT_UTF8',                   // 编码格式错误
};

// 获取微信支付V2配置
export function getWechatPayV2Config(): WechatPayV2Config {
  const config: WechatPayV2Config = {
    // 兼容两种环境变量格式
    appId: process.env.WECHAT_PAY_V2_APP_ID || process.env.WECHAT_PAY_APP_ID || '',
    mchId: process.env.WECHAT_PAY_V2_MCH_ID || process.env.WECHAT_PAY_MCH_ID || '',
    apiKey: process.env.WECHAT_PAY_V2_API_KEY || process.env.WECHAT_PAY_API_KEY || '',
    notifyUrl: process.env.WECHAT_PAY_V2_NOTIFY_URL || process.env.WECHAT_PAY_NOTIFY_URL || '',
    certPath: process.env.WECHAT_PAY_V2_CERT_PATH || process.env.WECHAT_PAY_CERT_PATH,
    keyPath: process.env.WECHAT_PAY_V2_KEY_PATH || process.env.WECHAT_PAY_KEY_PATH,
    signType: ((process.env.WECHAT_PAY_V2_SIGN_TYPE || process.env.WECHAT_PAY_SIGN_TYPE) as 'MD5' | 'HMAC-SHA256') || 'MD5',
    environment: (process.env.PAYMENT_ENVIRONMENT === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
  };

  // 验证必要配置
  if (!config.appId || !config.mchId || !config.apiKey) {
    throw new Error('微信支付V2配置不完整：缺少 appId, mchId 或 apiKey');
  }

  if (!config.notifyUrl) {
    throw new Error('微信支付V2配置不完整：缺少 notifyUrl');
  }

  return config;
}

// 获取微信支付V2错误信息
export function getWechatPayV2ErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    [WECHAT_PAY_V2_ERROR_CODES.NOAUTH]: '商户无此接口权限',
    [WECHAT_PAY_V2_ERROR_CODES.NOTENOUGH]: '余额不足',
    [WECHAT_PAY_V2_ERROR_CODES.ORDERPAID]: '商户订单已支付',
    [WECHAT_PAY_V2_ERROR_CODES.ORDERCLOSED]: '订单已关闭',
    [WECHAT_PAY_V2_ERROR_CODES.SYSTEMERROR]: '系统错误',
    [WECHAT_PAY_V2_ERROR_CODES.APPID_NOT_EXIST]: 'APPID不存在',
    [WECHAT_PAY_V2_ERROR_CODES.MCHID_NOT_EXIST]: 'MCHID不存在',
    [WECHAT_PAY_V2_ERROR_CODES.APPID_MCHID_NOT_MATCH]: 'appid和mch_id不匹配',
    [WECHAT_PAY_V2_ERROR_CODES.LACK_PARAMS]: '缺少参数',
    [WECHAT_PAY_V2_ERROR_CODES.OUT_TRADE_NO_USED]: '商户订单号重复',
    [WECHAT_PAY_V2_ERROR_CODES.SIGNERROR]: '签名错误',
    [WECHAT_PAY_V2_ERROR_CODES.XML_FORMAT_ERROR]: 'XML格式错误',
    [WECHAT_PAY_V2_ERROR_CODES.REQUIRE_POST_METHOD]: '请求方式错误',
    [WECHAT_PAY_V2_ERROR_CODES.POST_DATA_EMPTY]: 'post数据为空',
    [WECHAT_PAY_V2_ERROR_CODES.NOT_UTF8]: '编码格式错误',
  };

  return errorMessages[errorCode] || `未知错误: ${errorCode}`;
}

// 获取微信支付V2 API地址
export function getWechatPayV2Urls(environment: 'sandbox' | 'production' = 'production') {
  // 注意：微信支付V2的沙箱环境已于2021年下线，现在统一使用生产环境URL
  // 但在开发环境中可以使用测试商户号和测试金额
  return {
    UNIFIED_ORDER: WECHAT_PAY_V2_URLS.UNIFIED_ORDER,
    ORDER_QUERY: WECHAT_PAY_V2_URLS.ORDER_QUERY,
    CLOSE_ORDER: WECHAT_PAY_V2_URLS.CLOSE_ORDER,
    REFUND: WECHAT_PAY_V2_URLS.REFUND,
    REFUND_QUERY: WECHAT_PAY_V2_URLS.REFUND_QUERY,
  };
}


// 微信支付V2请求参数接口
export interface WechatPayV2UnifiedOrderRequest {
  appid: string;
  mch_id: string;
  nonce_str: string;
  sign_type: string;
  body: string;
  out_trade_no: string;
  total_fee: number;
  spbill_create_ip: string;
  notify_url: string;
  trade_type: string;
  product_id?: string;
  openid?: string;
  attach?: string;
  time_start?: string;
  time_expire?: string;
  goods_tag?: string;
  limit_pay?: string;
  scene_info?: string;
}

// 微信支付V2统一下单响应
export interface WechatPayV2UnifiedOrderResponse {
  return_code: string;
  return_msg: string;
  appid?: string;
  mch_id?: string;
  nonce_str?: string;
  sign?: string;
  result_code?: string;
  err_code?: string;
  err_code_des?: string;
  trade_type?: string;
  prepay_id?: string;
  code_url?: string;
}

// 微信支付V2订单查询请求
export interface WechatPayV2OrderQueryRequest {
  appid: string;
  mch_id: string;
  transaction_id?: string;
  out_trade_no?: string;
  nonce_str: string;
  sign_type: string;
}

// 微信支付V2订单查询响应
export interface WechatPayV2OrderQueryResponse {
  return_code: string;
  return_msg: string;
  appid?: string;
  mch_id?: string;
  nonce_str?: string;
  sign?: string;
  result_code?: string;
  err_code?: string;
  err_code_des?: string;
  trade_state?: string;
  trade_state_desc?: string;
  out_trade_no?: string;
  transaction_id?: string;
  total_fee?: number;
  cash_fee?: number;
  time_end?: string;
  attach?: string;
}

// 微信支付V2退款请求
export interface WechatPayV2RefundRequest {
  appid: string;
  mch_id: string;
  nonce_str: string;
  sign_type: string;
  transaction_id?: string;
  out_trade_no?: string;
  out_refund_no: string;
  total_fee: number;
  refund_fee: number;
  refund_desc?: string;
  refund_account?: string;
  notify_url?: string;
}

// 微信支付V2退款响应
export interface WechatPayV2RefundResponse {
  return_code: string;
  return_msg: string;
  appid?: string;
  mch_id?: string;
  nonce_str?: string;
  sign?: string;
  result_code?: string;
  err_code?: string;
  err_code_des?: string;
  transaction_id?: string;
  out_trade_no?: string;
  out_refund_no?: string;
  refund_id?: string;
  refund_fee?: number;
  total_fee?: number;
  cash_fee?: number;
  coupon_refund_fee?: number;
}

// 微信支付V2回调数据
export interface WechatPayV2NotifyData {
  return_code: string;
  return_msg: string;
  appid?: string;
  mch_id?: string;
  nonce_str?: string;
  sign?: string;
  result_code?: string;
  err_code?: string;
  err_code_des?: string;
  openid?: string;
  is_subscribe?: string;
  trade_type?: string;
  bank_type?: string;
  total_fee?: number;
  settlement_total_fee?: number;
  fee_type?: string;
  cash_fee?: number;
  cash_fee_type?: string;
  coupon_fee?: number;
  coupon_count?: number;
  transaction_id?: string;
  out_trade_no?: string;
  attach?: string;
  time_end?: string;
} 