// 微信支付配置
import { WechatPayConfig } from '../../types/payment';
import { getWechatPayConfig } from './payment-config';

// 微信支付API地址
export const WECHAT_PAY_URLS = {
  // 生产环境
  PRODUCTION: {
    BASE_URL: 'https://api.mch.weixin.qq.com',
    UNIFIEDORDER: '/v3/pay/transactions/native', // Native支付
    JSAPI: '/v3/pay/transactions/jsapi', // JSAPI支付
    H5: '/v3/pay/transactions/h5', // H5支付
    APP: '/v3/pay/transactions/app', // APP支付
    QUERY: '/v3/pay/transactions/out-trade-no', // 查询订单
    CLOSE: '/v3/pay/transactions/out-trade-no', // 关闭订单
    REFUND: '/v3/refund/domestic/refunds', // 申请退款
    REFUND_QUERY: '/v3/refund/domestic/refunds', // 查询退款
    CERTIFICATES: '/v3/certificates' // 获取证书
  },
  // 沙箱环境
  SANDBOX: {
    BASE_URL: 'https://api.mch.weixin.qq.com/sandboxnew',
    UNIFIEDORDER: '/pay/unifiedorder',
    QUERY: '/pay/orderquery',
    CLOSE: '/pay/closeorder',
    REFUND: '/secapi/pay/refund',
    REFUND_QUERY: '/pay/refundquery'
  }
};

// 微信支付交易类型
export const WECHAT_TRADE_TYPES = {
  NATIVE: 'NATIVE', // 扫码支付
  JSAPI: 'JSAPI',   // 公众号支付
  MWEB: 'MWEB',     // H5支付
  APP: 'APP'        // APP支付
} as const;

// 微信支付交易状态
export const WECHAT_TRADE_STATES = {
  SUCCESS: 'SUCCESS',     // 支付成功
  REFUND: 'REFUND',       // 转入退款
  NOTPAY: 'NOTPAY',       // 未支付
  CLOSED: 'CLOSED',       // 已关闭
  REVOKED: 'REVOKED',     // 已撤销（刷卡支付）
  USERPAYING: 'USERPAYING', // 用户支付中
  PAYERROR: 'PAYERROR'    // 支付失败
} as const;

// 微信支付错误码
export const WECHAT_ERROR_CODES = {
  ORDERNOTEXIST: 'ORDERNOTEXIST',           // 订单不存在
  SYSTEMERROR: 'SYSTEMERROR',               // 系统错误
  INVALID_REQUEST: 'INVALID_REQUEST',       // 参数错误
  PARAM_ERROR: 'PARAM_ERROR',               // 参数格式校验错误
  APPID_NOT_EXIST: 'APPID_NOT_EXIST',      // APPID不存在
  MCHID_NOT_EXIST: 'MCHID_NOT_EXIST',      // MCHID不存在
  APPID_MCHID_NOT_MATCH: 'APPID_MCHID_NOT_MATCH', // appid和mch_id不匹配
  LACK_PARAMS: 'LACK_PARAMS',               // 缺少参数
  OUT_TRADE_NO_USED: 'OUT_TRADE_NO_USED',  // 商户订单号重复
  SIGNERROR: 'SIGNERROR',                   // 签名错误
  XML_FORMAT_ERROR: 'XML_FORMAT_ERROR',     // XML格式错误
  REQUIRE_POST_METHOD: 'REQUIRE_POST_METHOD', // 请求方式错误
  POST_DATA_EMPTY: 'POST_DATA_EMPTY',       // post数据为空
  NOT_UTF8: 'NOT_UTF8'                      // 编码格式错误
} as const;

// 微信支付回调事件类型
export const WECHAT_NOTIFY_TYPES = {
  TRANSACTION: 'TRANSACTION.SUCCESS', // 支付成功通知
  REFUND: 'REFUND.SUCCESS'           // 退款成功通知
} as const;

// 获取微信支付URL配置
export function getWechatPayUrls() {
  const config = getWechatPayConfig();
  return config.environment === 'production' 
    ? WECHAT_PAY_URLS.PRODUCTION 
    : WECHAT_PAY_URLS.SANDBOX;
}

// 微信支付请求头配置
export function getWechatPayHeaders(authorization?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'InterviewCodeOverlay-Payment/1.0.0'
  };

  if (authorization) {
    headers['Authorization'] = authorization;
  }

  return headers;
}

// 微信支付签名算法配置
export const WECHAT_SIGN_CONFIG = {
  ALGORITHM: 'WECHATPAY2-SHA256-RSA2048',
  HASH_ALGORITHM: 'sha256',
  SIGN_TYPE: 'RSA',
  CHARSET: 'utf-8'
} as const;

// 微信支付证书配置
export interface WechatCertificateInfo {
  serialNo: string;
  effectiveTime: string;
  expireTime: string;
  encryptCertificate: {
    algorithm: string;
    nonce: string;
    associatedData: string;
    ciphertext: string;
  };
}

// 微信支付通知签名验证配置
export const WECHAT_NOTIFY_CONFIG = {
  SIGNATURE_HEADERS: [
    'Wechatpay-Timestamp',
    'Wechatpay-Nonce',
    'Wechatpay-Signature',
    'Wechatpay-Serial'
  ],
  MAX_TIMESTAMP_DIFF: 300, // 最大时间戳差异(秒)
  SUCCESS_RESPONSE: { code: 'SUCCESS', message: '成功' },
  FAIL_RESPONSE: { code: 'FAIL', message: '失败' }
} as const;

// 微信支付金额转换 (元转分)
export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100);
}

// 微信支付金额转换 (分转元)
export function fenToYuan(fen: number): number {
  return Math.round(fen) / 100;
}

// 验证微信支付金额
export function validateWechatAmount(amount: number): boolean {
  // 微信支付金额必须为正整数，单位为分
  return Number.isInteger(amount) && amount > 0 && amount <= 100000000; // 最大1000万分
}

// 生成微信支付随机字符串
export function generateNonceStr(length: number = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 生成微信支付时间戳
export function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

// 格式化微信支付时间
export function formatWechatTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '+08:00');
}

// 解析微信支付时间
export function parseWechatTime(timeStr: string): Date {
  return new Date(timeStr);
}

// 微信支付商品描述限制
export function formatDescription(description: string): string {
  // 微信支付商品描述最长127个字符
  if (description.length > 127) {
    return description.substring(0, 124) + '...';
  }
  return description;
}

// 微信支付附加数据限制
export function formatAttach(attach: string): string {
  // 微信支付附加数据最长127个字符
  if (attach.length > 127) {
    return attach.substring(0, 127);
  }
  return attach;
} 