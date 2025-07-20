// 微信支付V2版本配置
import { WECHAT_PAY_V2_CONSTANTS } from '../utils/wechat-v2-crypto';

// 微信支付V2配置接口
export interface WechatPayV2Config {
  appId: string;          // 应用ID
  mchId: string;          // 商户号
  apiKey: string;         // 商户API密钥
  signType: 'MD5' | 'HMAC-SHA256'; // 签名类型
  notifyUrl: string;      // 支付回调URL
  certPath?: string;      // 证书路径（退款时需要）
  keyPath?: string;       // 私钥路径（退款时需要）
  environment: 'sandbox' | 'production'; // 环境
}

// 微信支付V2 API地址
export const WECHAT_PAY_V2_URLS = {
  // 生产环境
  PRODUCTION: {
    UNIFIED_ORDER: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
    ORDER_QUERY: 'https://api.mch.weixin.qq.com/pay/orderquery',
    CLOSE_ORDER: 'https://api.mch.weixin.qq.com/pay/closeorder',
    REFUND: 'https://api.mch.weixin.qq.com/secapi/pay/refund',
    REFUND_QUERY: 'https://api.mch.weixin.qq.com/pay/refundquery',
    DOWNLOAD_BILL: 'https://api.mch.weixin.qq.com/pay/downloadbill',
    REPORT: 'https://api.mch.weixin.qq.com/payitil/report',
    SHORTURL: 'https://api.mch.weixin.qq.com/tools/shorturl',
    MICROPAY: 'https://api.mch.weixin.qq.com/pay/micropay',
    REVERSE: 'https://api.mch.weixin.qq.com/secapi/pay/reverse'
  },
  // 沙箱环境
  SANDBOX: {
    UNIFIED_ORDER: 'https://api.mch.weixin.qq.com/sandboxnew/pay/unifiedorder',
    ORDER_QUERY: 'https://api.mch.weixin.qq.com/sandboxnew/pay/orderquery',
    CLOSE_ORDER: 'https://api.mch.weixin.qq.com/sandboxnew/pay/closeorder',
    REFUND: 'https://api.mch.weixin.qq.com/sandboxnew/secapi/pay/refund',
    REFUND_QUERY: 'https://api.mch.weixin.qq.com/sandboxnew/pay/refundquery',
    DOWNLOAD_BILL: 'https://api.mch.weixin.qq.com/sandboxnew/pay/downloadbill',
    REPORT: 'https://api.mch.weixin.qq.com/sandboxnew/payitil/report',
    SHORTURL: 'https://api.mch.weixin.qq.com/sandboxnew/tools/shorturl',
    MICROPAY: 'https://api.mch.weixin.qq.com/sandboxnew/pay/micropay',
    REVERSE: 'https://api.mch.weixin.qq.com/sandboxnew/secapi/pay/reverse'
  }
};

// 微信支付V2错误码
export const WECHAT_PAY_V2_ERROR_CODES = {
  // 通用错误码
  NOAUTH: 'NOAUTH',                           // 没有权限
  AMOUNT_ERROR: 'AMOUNT_ERROR',               // 金额错误
  ORDERPAID: 'ORDERPAID',                     // 订单已支付
  ORDERCLOSED: 'ORDERCLOSED',                 // 订单已关闭
  SYSTEMERROR: 'SYSTEMERROR',                 // 系统错误
  APPID_NOT_EXIST: 'APPID_NOT_EXIST',        // APPID不存在
  MCHID_NOT_EXIST: 'MCHID_NOT_EXIST',        // MCHID不存在
  APPID_MCHID_NOT_MATCH: 'APPID_MCHID_NOT_MATCH', // appid和mch_id不匹配
  LACK_PARAMS: 'LACK_PARAMS',                 // 缺少参数
  OUT_TRADE_NO_USED: 'OUT_TRADE_NO_USED',    // 商户订单号重复
  SIGNERROR: 'SIGNERROR',                     // 签名错误
  XML_FORMAT_ERROR: 'XML_FORMAT_ERROR',       // XML格式错误
  REQUIRE_POST_METHOD: 'REQUIRE_POST_METHOD', // 请求方式错误
  POST_DATA_EMPTY: 'POST_DATA_EMPTY',         // post数据为空
  NOT_UTF8: 'NOT_UTF8',                       // 编码格式错误
  
  // 统一下单错误码
  INVALID_REQUEST: 'INVALID_REQUEST',         // 参数错误
  PARAM_ERROR: 'PARAM_ERROR',                 // 参数格式校验错误
  ORDERNOTEXIST: 'ORDERNOTEXIST',             // 此交易订单号不存在
  CLOSED: 'CLOSED',                           // 订单已关闭
  NOTPAY: 'NOTPAY',                           // 未支付
  USERPAYING: 'USERPAYING',                   // 用户支付中
  PAYERROR: 'PAYERROR',                       // 支付失败
  
  // 退款错误码
  TRANSACTION_ID_NOT_EXIST: 'TRANSACTION_ID_NOT_EXIST',       // 订单不存在
  PARTIAL_REFUND_NOT_SUPPORTED: 'PARTIAL_REFUND_NOT_SUPPORTED', // 不支持部分退款
  REFUND_AMOUNT_ERROR: 'REFUND_AMOUNT_ERROR',                 // 退款金额错误
  REFUNDNOTEXIST: 'REFUNDNOTEXIST',                           // 退款订单查询失败
  INVALID_TRANSACTIONID: 'INVALID_TRANSACTIONID',             // 无效transaction_id
  REFUND_FEE_ERROR: 'REFUND_FEE_ERROR',                       // 退款金额大于支付金额
  FREQUENCY_LIMITED: 'FREQUENCY_LIMITED',                     // 频率限制
  
  // 关闭订单错误码
  ORDERNOTEXIST_CLOSE: 'ORDERNOTEXIST',       // 订单不存在
  ORDERPAID_CLOSE: 'ORDERPAID',               // 订单已支付
  ORDERCLOSED_CLOSE: 'ORDERCLOSED',           // 订单已关闭
} as const;

// 微信支付V2错误消息映射
export const WECHAT_PAY_V2_ERROR_MESSAGES: Record<string, string> = {
  [WECHAT_PAY_V2_ERROR_CODES.NOAUTH]: '商户无此接口权限',
  [WECHAT_PAY_V2_ERROR_CODES.AMOUNT_ERROR]: '金额错误',
  [WECHAT_PAY_V2_ERROR_CODES.ORDERPAID]: '订单已支付',
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
  [WECHAT_PAY_V2_ERROR_CODES.INVALID_REQUEST]: '参数错误',
  [WECHAT_PAY_V2_ERROR_CODES.PARAM_ERROR]: '参数格式校验错误',
  [WECHAT_PAY_V2_ERROR_CODES.ORDERNOTEXIST]: '此交易订单号不存在',
  [WECHAT_PAY_V2_ERROR_CODES.CLOSED]: '订单已关闭',
  [WECHAT_PAY_V2_ERROR_CODES.NOTPAY]: '未支付',
  [WECHAT_PAY_V2_ERROR_CODES.USERPAYING]: '用户支付中',
  [WECHAT_PAY_V2_ERROR_CODES.PAYERROR]: '支付失败',
  [WECHAT_PAY_V2_ERROR_CODES.TRANSACTION_ID_NOT_EXIST]: '订单不存在',
  [WECHAT_PAY_V2_ERROR_CODES.PARTIAL_REFUND_NOT_SUPPORTED]: '不支持部分退款',
  [WECHAT_PAY_V2_ERROR_CODES.REFUND_AMOUNT_ERROR]: '退款金额错误',
  [WECHAT_PAY_V2_ERROR_CODES.REFUNDNOTEXIST]: '退款订单查询失败',
  [WECHAT_PAY_V2_ERROR_CODES.INVALID_TRANSACTIONID]: '无效transaction_id',
  [WECHAT_PAY_V2_ERROR_CODES.REFUND_FEE_ERROR]: '退款金额大于支付金额',
  [WECHAT_PAY_V2_ERROR_CODES.FREQUENCY_LIMITED]: '频率限制'
};

// 微信支付V2请求数据接口
export interface WechatPayV2UnifiedOrderRequest {
  appid: string;
  mch_id: string;
  device_info?: string;
  nonce_str: string;
  sign_type?: string;
  body: string;
  detail?: string;
  attach?: string;
  out_trade_no: string;
  fee_type?: string;
  total_fee: number;
  spbill_create_ip: string;
  time_start?: string;
  time_expire?: string;
  goods_tag?: string;
  notify_url: string;
  trade_type: string;
  product_id?: string;
  limit_pay?: string;
  openid?: string;
  receipt?: string;
  scene_info?: string;
  sign?: string;
}

// 微信支付V2统一下单响应
export interface WechatPayV2UnifiedOrderResponse {
  return_code: string;
  return_msg: string;
  appid?: string;
  mch_id?: string;
  device_info?: string;
  nonce_str?: string;
  sign?: string;
  result_code?: string;
  err_code?: string;
  err_code_des?: string;
  trade_type?: string;
  prepay_id?: string;
  code_url?: string;
  mweb_url?: string;
}

// 微信支付V2订单查询请求
export interface WechatPayV2OrderQueryRequest {
  appid: string;
  mch_id: string;
  transaction_id?: string;
  out_trade_no?: string;
  nonce_str: string;
  sign_type?: string;
  sign?: string;
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
  device_info?: string;
  openid?: string;
  is_subscribe?: string;
  trade_type?: string;
  trade_state?: string;
  bank_type?: string;
  total_fee?: number;
  settlement_total_fee?: number;
  fee_type?: string;
  cash_fee?: number;
  cash_fee_type?: string;
  coupon_fee?: number;
  coupon_count?: number;
  coupon_type_0?: string;
  coupon_id_0?: string;
  coupon_fee_0?: number;
  transaction_id?: string;
  out_trade_no?: string;
  attach?: string;
  time_end?: string;
  trade_state_desc?: string;
}

// 微信支付V2退款请求
export interface WechatPayV2RefundRequest {
  appid: string;
  mch_id: string;
  nonce_str: string;
  sign_type?: string;
  transaction_id?: string;
  out_trade_no?: string;
  out_refund_no: string;
  total_fee: number;
  refund_fee: number;
  refund_fee_type?: string;
  refund_desc?: string;
  refund_account?: string;
  notify_url?: string;
  sign?: string;
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
  refund_channel?: string;
  refund_fee?: number;
  settlement_refund_fee?: number;
  total_fee?: number;
  settlement_total_fee?: number;
  fee_type?: string;
  cash_fee?: number;
  cash_fee_type?: string;
  cash_refund_fee?: number;
  coupon_refund_fee?: number;
  coupon_refund_count?: number;
}

// 微信支付V2回调通知数据
export interface WechatPayV2NotifyData {
  return_code: string;
  return_msg: string;
  appid?: string;
  mch_id?: string;
  device_info?: string;
  nonce_str?: string;
  sign?: string;
  sign_type?: string;
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

// 获取微信支付V2配置
export function getWechatPayV2Config(): WechatPayV2Config {
  console.log('🔧 加载微信支付V2配置...');
  
  // 从环境变量读取配置，支持多种变量名
  const config: WechatPayV2Config = {
    appId: process.env.WECHAT_PAY_V2_APP_ID || 
           process.env.WECHAT_PAY_APP_ID || 
           process.env.WECHAT_APPID || 
           '',
    mchId: process.env.WECHAT_PAY_V2_MCH_ID || 
           process.env.WECHAT_PAY_MCH_ID || 
           process.env.WECHAT_MCHID || 
           '',
    apiKey: process.env.WECHAT_PAY_V2_API_KEY || 
            process.env.WECHAT_PAY_API_KEY || 
            process.env.WECHAT_API_KEY || 
            '',
    notifyUrl: process.env.WECHAT_PAY_V2_NOTIFY_URL || 
               process.env.WECHAT_PAY_NOTIFY_URL || 
               '',
    certPath: process.env.WECHAT_PAY_V2_CERT_PATH || 
              process.env.WECHAT_PAY_CERT_PATH,
    keyPath: process.env.WECHAT_PAY_V2_KEY_PATH || 
             process.env.WECHAT_PAY_KEY_PATH,
    signType: (process.env.WECHAT_PAY_V2_SIGN_TYPE || 
               process.env.WECHAT_PAY_SIGN_TYPE || 
               'MD5') as 'MD5' | 'HMAC-SHA256',
    environment: determineEnvironment(),
  };

  // 如果notifyUrl为空，尝试根据BASE_URL构建
  if (!config.notifyUrl) {
    const baseUrl = process.env.BASE_URL || 
                   process.env.DOMAIN || 
                   'http://localhost:3001';
    config.notifyUrl = `${baseUrl}/api/payment/notify/wechat`;
    console.log('🔗 自动生成回调URL:', config.notifyUrl);
  }

  // 验证必要的配置
  const validation = validateWechatPayV2Config(config);
  if (!validation.valid) {
    console.error('❌ 微信支付V2配置验证失败:', validation.errors);
    
    // 提供详细的配置指导
    console.log('📋 请检查以下环境变量配置:');
    console.log('  WECHAT_PAY_V2_APP_ID=wxYourAppIdHere');
    console.log('  WECHAT_PAY_V2_MCH_ID=1234567890');
    console.log('  WECHAT_PAY_V2_API_KEY=your32characterapikeyhere1234567890');
    console.log('  WECHAT_PAY_V2_NOTIFY_URL=https://yourdomain.com/api/payment/notify/wechat');
    console.log('  BASE_URL=https://yourdomain.com');
    
    throw new Error(`微信支付V2配置不完整: ${validation.errors.join(', ')}`);
  }

  // 输出配置状态（敏感信息部分隐藏）
  console.log('✅ 微信支付V2配置加载成功:', {
    appId: config.appId ? `${config.appId.substring(0, 6)}...` : '未配置',
    mchId: config.mchId ? `${config.mchId.substring(0, 6)}...` : '未配置',
    apiKey: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : '未配置',
    notifyUrl: config.notifyUrl,
    signType: config.signType,
    environment: config.environment,
    certPath: config.certPath ? '已配置' : '未配置',
    keyPath: config.keyPath ? '已配置' : '未配置'
  });

  return config;
}

// 确定运行环境
function determineEnvironment(): 'sandbox' | 'production' {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  const sandboxMode = process.env.PAYMENT_SANDBOX_MODE?.toLowerCase();
  
  // 如果明确设置了沙箱模式
  if (sandboxMode === 'true' || sandboxMode === '1') {
    return 'sandbox';
  }
  
  // 如果明确设置了生产模式
  if (sandboxMode === 'false' || sandboxMode === '0') {
    return 'production';
  }
  
  // 根据NODE_ENV判断
  if (nodeEnv === 'production') {
    return 'production';
  }
  
  // 默认使用沙箱模式（开发环境）
  return 'sandbox';
}

// 获取微信支付V2 API地址
export function getWechatPayV2URLs(environment: 'sandbox' | 'production' = 'production') {
  console.log('🔗 获取微信支付V2 API地址，环境:', environment);
  
  const urls = environment === 'sandbox' ? WECHAT_PAY_V2_URLS.SANDBOX : WECHAT_PAY_V2_URLS.PRODUCTION;
  
  console.log('📋 API地址配置:', {
    UNIFIED_ORDER: urls.UNIFIED_ORDER,
    ORDER_QUERY: urls.ORDER_QUERY,
    CLOSE_ORDER: urls.CLOSE_ORDER,
    REFUND: urls.REFUND,
    NOTIFY: '由notifyUrl配置决定'
  });
  
  return urls;
}

// 获取错误消息
export function getWechatPayV2ErrorMessage(errorCode: string): string {
  const message = WECHAT_PAY_V2_ERROR_MESSAGES[errorCode];
  if (message) {
    return message;
  }
  
  // 如果没有找到对应的错误消息，提供通用错误信息
  console.warn('⚠️ 未知的微信支付错误码:', errorCode);
  return `微信支付错误 (${errorCode})，请检查支付配置和参数`;
}

// 验证微信支付V2配置
export function validateWechatPayV2Config(config: WechatPayV2Config): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证appId
  if (!config.appId) {
    errors.push('appId 未配置，请设置环境变量 WECHAT_PAY_V2_APP_ID');
  } else if (!/^wx[a-zA-Z0-9]{16}$/.test(config.appId)) {
    errors.push('appId 格式不正确，应为wx开头的18位字符串');
  }

  // 验证mchId
  if (!config.mchId) {
    errors.push('mchId 未配置，请设置环境变量 WECHAT_PAY_V2_MCH_ID');
  } else if (!/^\d{8,10}$/.test(config.mchId)) {
    errors.push('mchId 格式不正确，应为8-10位数字');
  }

  // 验证apiKey
  if (!config.apiKey) {
    errors.push('apiKey 未配置，请设置环境变量 WECHAT_PAY_V2_API_KEY');
  } else if (config.apiKey.length !== 32) {
    errors.push('apiKey 长度不正确，应为32位字符串');
  }

  // 验证notifyUrl
  if (!config.notifyUrl) {
    errors.push('notifyUrl 未配置，请设置环境变量 WECHAT_PAY_V2_NOTIFY_URL 或 BASE_URL');
  } else if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(config.notifyUrl)) {
    errors.push('notifyUrl 格式不正确，应为完整的HTTP/HTTPS URL');
  }

  // 验证签名类型
  if (!['MD5', 'HMAC-SHA256'].includes(config.signType)) {
    errors.push('signType 只能是 MD5 或 HMAC-SHA256');
  }

  // 验证环境
  if (!['sandbox', 'production'].includes(config.environment)) {
    errors.push('environment 只能是 sandbox 或 production');
  }

  // 生产环境额外验证
  if (config.environment === 'production') {
    if (!config.notifyUrl.startsWith('https://')) {
      errors.push('生产环境的notifyUrl必须使用HTTPS');
    }
    
    if (config.apiKey === 'your32characterapikeyhere1234567890') {
      errors.push('生产环境不能使用默认的apiKey');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// 导出常量
export { WECHAT_PAY_V2_CONSTANTS }; 