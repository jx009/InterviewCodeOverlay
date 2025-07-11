// 支付相关类型定义
export interface PaymentPackage {
  id: number;
  name: string;
  description: string;
  amount: number; // 价格（元）
  points: number; // 基础积分
  bonusPoints: number; // 赠送积分
  isActive: boolean;
  sortOrder: number;
  tags?: string[];
  isRecommended?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentOrder {
  id: number;
  orderNo: string;
  outTradeNo: string;
  userId: number;
  packageId: number;
  amount: number;
  points: number;
  bonusPoints: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentData?: any;
  paidAt?: string;
  expiredAt: string;
  createdAt: string;
  updatedAt: string;
  package?: {
    name: string;
    description: string;
  };
}

export enum PaymentMethod {
  WECHAT_PAY = 'WECHAT_PAY',
  ALIPAY = 'ALIPAY'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED'
}

export interface CreateOrderRequest {
  packageId: number;
  paymentMethod: PaymentMethod;
}

export interface CreateOrderResponse {
  success: boolean;
  data?: {
    orderNo: string;
    qrCodeUrl: string; // 微信支付二维码链接
    amount: number;
    points: number;
    expireTime: string;
    packageInfo: {
      name: string;
      description: string;
    };
  };
  message?: string;
}

export interface OrderStatusResponse {
  success: boolean;
  data?: {
    order: PaymentOrder;
    tradeState: string;
    tradeStateDesc: string;
  };
  message: string;
}

export interface UserOrdersResponse {
  success: boolean;
  data?: PaymentOrder[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message: string;
}

export interface PaymentPackageResponse {
  success: boolean;
  data?: PaymentPackage[];
  message: string;
}

// 支付状态映射
export const PaymentStatusMap = {
  [PaymentStatus.PENDING]: '待支付',
  [PaymentStatus.PAID]: '已支付',
  [PaymentStatus.FAILED]: '支付失败',
  [PaymentStatus.CANCELLED]: '已取消',
  [PaymentStatus.REFUNDED]: '已退款',
  [PaymentStatus.EXPIRED]: '已过期'
};

// 支付方式映射
export const PaymentMethodMap = {
  [PaymentMethod.WECHAT_PAY]: '微信支付',
  [PaymentMethod.ALIPAY]: '支付宝'
};

// 支付状态颜色映射
export const PaymentStatusColors = {
  [PaymentStatus.PENDING]: 'text-yellow-600 bg-yellow-50',
  [PaymentStatus.PAID]: 'text-green-600 bg-green-50',
  [PaymentStatus.FAILED]: 'text-red-600 bg-red-50',
  [PaymentStatus.CANCELLED]: 'text-gray-600 bg-gray-50',
  [PaymentStatus.REFUNDED]: 'text-blue-600 bg-blue-50',
  [PaymentStatus.EXPIRED]: 'text-gray-600 bg-gray-50'
}; 