// 支付系统类型定义
import { 
  PaymentMethod as PrismaPaymentMethod, 
  PaymentStatus as PrismaPaymentStatus,
  NotifyStatus as PrismaNotifyStatus
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// 使用Prisma生成的枚举类型
export type PaymentMethod = PrismaPaymentMethod;
export type PaymentStatus = PrismaPaymentStatus;
export type NotifyStatus = PrismaNotifyStatus;

// 枚举值常量，方便使用
export const PaymentMethod = {
  WECHAT_PAY: 'WECHAT_PAY' as PrismaPaymentMethod
} as const;

export const PaymentStatus = {
  PENDING: 'PENDING' as PrismaPaymentStatus,
  PAID: 'PAID' as PrismaPaymentStatus,
  FAILED: 'FAILED' as PrismaPaymentStatus,
  CANCELLED: 'CANCELLED' as PrismaPaymentStatus,
  EXPIRED: 'EXPIRED' as PrismaPaymentStatus
} as const;

export const NotifyStatus = {
  PENDING: 'PENDING' as PrismaNotifyStatus,
  SUCCESS: 'SUCCESS' as PrismaNotifyStatus,
  FAILED: 'FAILED' as PrismaNotifyStatus
} as const;

// 支付订单接口
export interface PaymentOrder {
  id: number;
  orderNo: string;
  outTradeNo: string;
  userId: number;
  amount: Decimal;
  points: number;
  bonusPoints: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string | null;
  paymentTime?: Date | null;
  notifyTime?: Date | null;
  expireTime: Date;
  packageId?: number | null;
  metadata?: string | null;
  failReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 支付套餐接口
export interface PaymentPackage {
  id: number;
  name: string;
  description?: string | null;
  amount: Decimal;
  points: number;
  bonusPoints: number;
  isActive: boolean;
  sortOrder: number;
  icon?: string | null;
  tags?: string | null;
  isRecommended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 支付回调日志接口
export interface PaymentNotifyLog {
  id: number;
  orderNo: string;
  paymentMethod: PaymentMethod;
  notifyType: string;
  requestBody: string;
  requestHeaders?: string | null;
  responseStatus: number;
  processStatus: NotifyStatus;
  errorMessage?: string | null;
  processTime?: Date | null;
  retryCount: number;
  createdAt: Date;
}

// 创建订单请求
export interface CreateOrderRequest {
  userId: number;
  packageId?: number;
  amount: number;
  points: number;
  bonusPoints?: number;
  paymentMethod: PaymentMethod;
  description?: string;
  metadata?: Record<string, any>;
}

// 创建订单响应
export interface CreateOrderResponse {
  success: boolean;
  orderNo?: string;
  paymentData?: WechatPayV2Data;
  expireTime?: Date;
  message: string;
}

// 微信支付V2数据
export interface WechatPayV2Data {
  codeUrl?: string;      // Native支付二维码链接
  prepayId?: string;     // 预支付交易会话标识
  tradeType?: string;    // 交易类型
  appId?: string;        // 应用ID
  mchId?: string;        // 商户号
  nonceStr?: string;     // 随机字符串
  sign?: string;         // 签名
  timestamp?: string;    // 时间戳
}

// 订单查询响应
export interface OrderQueryResponse {
  success: boolean;
  order?: PaymentOrder;
  tradeState?: string;
  tradeStateDesc?: string;
  message: string;
}

// 支付回调数据
export interface PaymentNotifyData {
  orderNo: string;
  outTradeNo: string;
  transactionId: string;
  totalAmount: number;
  tradeStatus: string;
  paymentTime: Date;
  buyerInfo?: any;
  metadata?: Record<string, any>;
}

// 回调处理结果
export interface NotifyResult {
  success: boolean;
  message: string;
  shouldRetry?: boolean;
}

// 微信支付V2配置
export interface WechatPayV2Config {
  appId: string;          // 应用ID
  mchId: string;          // 商户号
  apiKey: string;         // API密钥
  signType: 'MD5' | 'HMAC-SHA256'; // 签名类型
  notifyUrl: string;      // 回调地址
  certPath?: string;      // 证书路径（可选）
  keyPath?: string;       // 私钥路径（可选）
  environment: 'sandbox' | 'production'; // 环境
}

// 微信支付V2统一下单请求
export interface WechatPayV2UnifiedOrderRequest {
  body: string;           // 商品描述
  outTradeNo: string;     // 商户订单号
  totalFee: number;       // 总金额（分）
  spbillCreateIp: string; // 用户IP
  notifyUrl?: string;     // 通知URL
  tradeType: string;      // 交易类型
  attach?: string;        // 附加数据
  timeExpire?: Date;      // 过期时间
}

// 微信支付V2统一下单响应
export interface WechatPayV2UnifiedOrderResponse {
  success: boolean;
  prepayId?: string;      // 预支付ID
  codeUrl?: string;       // 二维码链接
  mwebUrl?: string;       // H5支付链接
  message: string;
  errorCode?: string;
}

// 微信支付V2订单查询请求
export interface WechatPayV2OrderQueryRequest {
  outTradeNo?: string;    // 商户订单号
  transactionId?: string; // 微信订单号
}

// 微信支付V2订单查询响应
export interface WechatPayV2OrderQueryResponse {
  success: boolean;
  tradeState?: string;    // 交易状态
  tradeStateDesc?: string; // 交易状态描述
  totalFee?: number;      // 总金额
  transactionId?: string; // 微信订单号
  outTradeNo?: string;    // 商户订单号
  timeEnd?: string;       // 支付完成时间
  attach?: string;        // 附加数据
  message: string;
  errorCode?: string;
}

// 微信支付V2回调通知数据
export interface WechatPayV2NotifyData {
  returnCode: string;     // 返回状态码
  returnMsg: string;      // 返回信息
  appId?: string;         // 应用ID
  mchId?: string;         // 商户号
  nonceStr?: string;      // 随机字符串
  sign?: string;          // 签名
  resultCode?: string;    // 业务结果
  errCode?: string;       // 错误代码
  errCodeDes?: string;    // 错误代码描述
  openId?: string;        // 用户标识
  isSubscribe?: string;   // 是否关注公众账号
  tradeType?: string;     // 交易类型
  bankType?: string;      // 付款银行
  totalFee?: number;      // 总金额
  cashFee?: number;       // 现金支付金额
  transactionId?: string; // 微信支付订单号
  outTradeNo?: string;    // 商户订单号
  attach?: string;        // 商家数据包
  timeEnd?: string;       // 支付完成时间
}

// 支付统计数据
export interface PaymentStatistics {
  totalOrders: number;
  totalAmount: number;
  totalPoints: number;
  successRate: number;
  todayOrders: number;
  todayAmount: number;
  recentOrders: PaymentOrder[];
}

// 套餐统计数据
export interface PackageStatistics {
  packageId: number;
  packageName: string;
  orderCount: number;
  totalAmount: number;
  totalPoints: number;
}

// 错误类型
export interface PaymentError {
  code: string;
  message: string;
  details?: any;
}

// 订单过滤条件
export interface OrderFilterOptions {
  userId?: number;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  startDate?: Date;
  endDate?: Date;
  packageId?: number;
  page?: number;
  limit?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// 支付服务结果类型
export interface PaymentServiceResult<T = any> {
  success: boolean;
  data?: T;
  message: string;
  errorCode?: string;
}

// 创建订单结果
export interface CreateOrderResult extends PaymentServiceResult<WechatPayV2Data> {
  orderNo?: string;
  expireTime?: Date;
}

// 查询订单结果
export interface QueryOrderResult extends PaymentServiceResult {
  order?: PaymentOrder;
  tradeState?: string;
  tradeStateDesc?: string;
}

// 关闭订单结果
export interface CloseOrderResult extends PaymentServiceResult {
  // 关闭订单不需要额外数据
}

// 支付配置验证结果
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

// 支付环境枚举
export enum PaymentEnvironment {
  SANDBOX = 'sandbox',
  PRODUCTION = 'production'
}

// 微信支付交易状态枚举
export enum WechatPayTradeState {
  SUCCESS = 'SUCCESS',      // 支付成功
  REFUND = 'REFUND',       // 转入退款
  NOTPAY = 'NOTPAY',       // 未支付
  CLOSED = 'CLOSED',       // 已关闭
  REVOKED = 'REVOKED',     // 已撤销
  USERPAYING = 'USERPAYING', // 用户支付中
  PAYERROR = 'PAYERROR'    // 支付失败
}

// 微信支付交易类型枚举
export enum WechatPayTradeType {
  JSAPI = 'JSAPI',         // 公众号支付
  NATIVE = 'NATIVE',       // 原生扫码支付
  APP = 'APP',             // APP支付
  MWEB = 'MWEB'            // H5支付
} 