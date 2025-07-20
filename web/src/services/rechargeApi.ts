// 充值相关的API服务
import api from './api';

// 充值套餐接口
export interface RechargePackage {
  id: number;
  name: string;
  description: string;
  amount: number;
  points: number;
  bonusPoints: number;
  totalPoints: number;
  isRecommended: boolean;
  icon?: string;
  tags?: string[];
}

// 创建订单请求
export interface CreateRechargeOrderRequest {
  packageId: number;
}

// 创建订单响应
export interface CreateRechargeOrderResponse {
  success: boolean;
  message?: string;
  data?: {
    orderNo: string;
    qrCodeUrl: string;
    amount: number;
    points: number;
    expireTime: string;
    packageInfo: {
      name: string;
      description: string;
    };
  };
}

// 订单状态响应
export interface OrderStatusResponse {
  success: boolean;
  message?: string;
  data?: {
    orderNo: string;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
    paymentTime?: string;
    amount?: number;
    points?: number;
    expireTime?: string;
  };
}

// 充值记录
export interface RechargeRecord {
  orderNo: string;
  packageName: string;
  packageDescription: string;
  amount: number;
  points: number;
  bonusPoints: number;
  totalPoints: number;
  status: string;
  paymentTime: string | null;
  createdAt: string;
}

// 充值记录响应
export interface RechargeHistoryResponse {
  success: boolean;
  message?: string;
  data?: {
    records: RechargeRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export const rechargeApi = {
  /**
   * 获取充值套餐列表
   */
  async getPackages(): Promise<{ success: boolean; data?: RechargePackage[]; message?: string }> {
    try {
      const response = await api.get('/recharge/packages');
      return response.data;
    } catch (error: any) {
      console.error('获取充值套餐失败:', error);
      throw error;
    }
  },

  /**
   * 创建充值订单
   */
  async createOrder(data: CreateRechargeOrderRequest): Promise<CreateRechargeOrderResponse> {
    try {
      const response = await api.post('/recharge/create-order', data);
      return response.data;
    } catch (error: any) {
      console.error('创建充值订单失败:', error);
      throw error;
    }
  },

  /**
   * 查询订单状态
   */
  async getOrderStatus(orderNo: string): Promise<OrderStatusResponse> {
    try {
      const response = await api.get(`/recharge/order-status/${orderNo}`);
      return response.data;
    } catch (error: any) {
      console.error('查询订单状态失败:', error);
      throw error;
    }
  },

  /**
   * 强制同步支付状态
   */
  async syncOrderStatus(orderNo: string): Promise<OrderStatusResponse> {
    try {
      const response = await api.post(`/recharge/sync-status/${orderNo}`);
      return response.data;
    } catch (error: any) {
      console.error('同步订单状态失败:', error);
      throw error;
    }
  },

  /**
   * 获取充值记录
   */
  async getHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<RechargeHistoryResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      
      const url = `/recharge/history${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      console.error('获取充值记录失败:', error);
      throw error;
    }
  }
};