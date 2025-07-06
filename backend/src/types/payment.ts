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
  WECHAT_PAY: 'WECHAT_PAY' as PrismaPaymentMethod,
  ALIPAY: 'ALIPAY' as PrismaPaymentMethod
} as const;

export const PaymentStatus = {
  PENDING: 'PENDING' as PrismaPaymentStatus,
  PAID: 'PAID' as PrismaPaymentStatus,
  FAILED: 'FAILED' as PrismaPaymentStatus,
  CANCELLED: 'CANCELLED' as PrismaPaymentStatus,
  REFUNDED: 'REFUNDED' as PrismaPaymentStatus,
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
  paymentData?: WechatPayData | AlipayData;
  expireTime?: Date;
  message: string;
}

// 微信支付数据
export interface WechatPayData {
  codeUrl?: string;      // Native支付二维码链接
  prepayId?: string;     // 预支付交易会话标识
  paySign?: string;      // 支付签名
  timeStamp?: string;    // 时间戳
  nonceStr?: string;     // 随机字符串
  package?: string;      // 订单详情扩展字符串
  signType?: string;     // 签名方式
  appId?: string;        // 应用ID
  mwebUrl?: string;      // H5支付跳转链接
}

// 支付宝支付数据
export interface AlipayData {
  qrCode?: string;       // 支付二维码
  orderString?: string;  // 订单字符串
  form?: string;         // 支付表单
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

// 退款请求
export interface RefundRequest {
  orderNo: string;
  refundAmount: number;
  refundReason?: string;
  refundNo?: string;
}

// 退款响应
export interface RefundResponse {
  success: boolean;
  refundId?: string;
  refundAmount?: number;
  message: string;
}

// 微信支付配置
export interface WechatPayConfig {
  appId: string;          // 应用ID
  mchId: string;          // 商户号
  apiKey: string;         // API密钥
  apiV3Key: string;       // APIv3密钥
  certPath: string;       // 证书路径
  keyPath: string;        // 私钥路径
  serialNo: string;       // 证书序列号
  notifyUrl: string;      // 回调地址
  environment: 'sandbox' | 'production'; // 环境
}

// 支付宝配置
export interface AlipayConfig {
  appId: string;          // 应用ID
  privateKey: string;     // 应用私钥
  publicKey: string;      // 支付宝公钥
  notifyUrl: string;      // 回调地址
  environment: 'sandbox' | 'production'; // 环境
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