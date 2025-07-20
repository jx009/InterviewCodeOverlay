// 支付相关的React Hook
import { useState, useEffect, useCallback } from 'react';
import { rechargeApi } from '../services/rechargeApi';
import {
  PaymentPackage,
  PaymentOrder,
  PaymentMethod,
  PaymentStatus,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderStatusResponse,
  UserOrdersResponse,
  PaymentPackageResponse
} from '../types/payment';

// 支付套餐Hook
export const usePaymentPackages = () => {
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📦 获取支付套餐列表...');
      const response = await rechargeApi.getPackages();
      
      if (response.success && response.data) {
        // 按sortOrder排序，推荐套餐优先
        const sortedPackages = response.data.sort((a, b) => {
          if (a.isRecommended && !b.isRecommended) return -1;
          if (!a.isRecommended && b.isRecommended) return 1;
          return a.sortOrder - b.sortOrder;
        });
        setPackages(sortedPackages);
        console.log('✅ 获取支付套餐成功，数量:', sortedPackages.length);
      } else {
        const errorMsg = response.message || '获取套餐列表失败';
        console.log('❌ 获取套餐失败:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      // 捕获并记录错误，但不触发页面跳转
      const errorMessage = err.response?.data?.message || err.message || '网络错误';
      console.error('❌ 获取套餐列表异常:', errorMessage, err);
      
      // 忽略401错误，由页面的认证检查来处理
      if (err.response?.status !== 401) {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return {
    packages,
    loading,
    error,
    refetch: fetchPackages
  };
};

// 订单创建Hook
export const useCreateOrder = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCallback(async (data: CreateOrderRequest): Promise<CreateOrderResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await rechargeApi.createOrder({
        packageId: data.packageId
      });

      if (response.success) {
        return response;
      } else {
        setError(response.message || '创建订单失败');
        return null;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '网络错误';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createOrder,
    loading,
    error,
    clearError: () => setError(null)
  };
};

// 订单状态查询Hook
export const useOrderStatus = (orderNo?: string) => {
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [tradeState, setTradeState] = useState<string>('');
  const [tradeStateDesc, setTradeStateDesc] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderStatus = useCallback(async (orderNumber?: string) => {
    const targetOrderNo = orderNumber || orderNo;
    if (!targetOrderNo) return;

    try {
      setLoading(true);
      setError(null);

      const response = await rechargeApi.getOrderStatus(targetOrderNo);

      if (response.success && response.data) {
        // 后端返回的是简单的状态数据，需要转换为order对象
        const orderData = {
          ...order,
          orderNo: response.data.orderNo,
          paymentStatus: response.data.status as PaymentStatus,
          paymentTime: response.data.paymentTime || order?.paymentTime,
          amount: response.data.amount || order?.amount,
          points: response.data.points || order?.points
        } as PaymentOrder;
        
        setOrder(orderData);
        setTradeState(response.data.status);
        setTradeStateDesc(response.data.message || '');
      } else {
        setError(response.message || '查询订单失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  }, [orderNo]);

  useEffect(() => {
    if (orderNo) {
      fetchOrderStatus();
    }
  }, [orderNo, fetchOrderStatus]);

  return {
    order,
    tradeState,
    tradeStateDesc,
    loading,
    error,
    refetch: fetchOrderStatus
  };
};

// 用户订单列表Hook
export const useUserOrders = (initialParams?: {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  method?: PaymentMethod;
}) => {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    method?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 获取用户订单列表...');
      const response = await rechargeApi.getHistory(params);

      if (response.success && response.data) {
        // 将rechargeApi的records转换为PaymentOrder格式
        const orders = response.data.records.map(record => ({
          id: 0,
          orderNo: record.orderNo,
          outTradeNo: record.orderNo,
          userId: 0,
          packageId: 0,
          amount: record.amount,
          points: record.points,
          bonusPoints: record.bonusPoints,
          paymentMethod: 'WECHAT_PAY' as PaymentMethod,
          paymentStatus: record.status as PaymentStatus,
          paymentTime: record.paymentTime,
          expiredAt: '',
          createdAt: record.createdAt,
          updatedAt: record.createdAt
        }));
        setOrders(orders);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
        console.log('✅ 获取订单列表成功，数量:', response.data.records.length);
      } else {
        const errorMsg = response.message || '获取订单列表失败';
        console.log('❌ 获取订单列表失败:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      // 捕获并记录错误，但不触发页面跳转
      const errorMessage = err.response?.data?.message || err.message || '网络错误';
      console.error('❌ 获取订单列表异常:', errorMessage, err);
      
      // 忽略401错误，由页面的认证检查来处理
      if (err.response?.status !== 401) {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialParams) {
      fetchOrders(initialParams);
    }
  }, [fetchOrders, initialParams]);

  const loadMore = useCallback((params?: any) => {
    fetchOrders({ ...initialParams, ...params });
  }, [fetchOrders, initialParams]);

  return {
    orders,
    pagination,
    loading,
    error,
    refetch: fetchOrders,
    loadMore
  };
};

// 订单取消Hook
export const useCancelOrder = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelOrder = useCallback(async (orderNo: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // TODO: 实现取消订单API
      setError('取消订单功能暂未实现');
      return false;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '网络错误');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    cancelOrder,
    loading,
    error,
    clearError: () => setError(null)
  };
};

// 支付轮询Hook（用于检查支付状态）
export const usePaymentPolling = (orderNo?: string, initialOrder?: PaymentOrder, interval: number = 5000) => {
  const [isPolling, setIsPolling] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(initialOrder || null);
  const { order, tradeState, refetch } = useOrderStatus(orderNo);

  const startPolling = useCallback(() => {
    if (!orderNo) return;
    
    setIsPolling(true);
  }, [orderNo]);

  // 更新当前订单状态
  useEffect(() => {
    if (order) {
      setCurrentOrder(order);
    }
  }, [order]);

  // 使用useEffect处理轮询逻辑
  useEffect(() => {
    if (!isPolling || !orderNo) return;

    const poll = async () => {
      try {
        console.log(`🔄 轮询订单支付状态: ${orderNo}`);
        await refetch(orderNo);
        if (order) {
          console.log(`📊 当前订单状态: ${order.paymentStatus}`);
        }
      } catch (error) {
        console.error('轮询支付状态失败:', error);
      }
    };

    // 立即执行一次
    poll();

    // 设置定时器
    const timer = setInterval(() => {
      // 检查订单状态，如果已完成则停止轮询
      if (order && (
        order.paymentStatus === PaymentStatus.PAID ||
        order.paymentStatus === PaymentStatus.FAILED ||
        order.paymentStatus === PaymentStatus.CANCELLED ||
        order.paymentStatus === PaymentStatus.EXPIRED
      )) {
        setIsPolling(false);
        return;
      }
      
      poll();
    }, interval);

    // 清理函数
    return () => {
      clearInterval(timer);
    };
  }, [isPolling, orderNo, refetch, order, interval]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  useEffect(() => {
    return () => {
      setIsPolling(false);
    };
  }, []);

  return {
    isPolling,
    startPolling,
    stopPolling,
    order: currentOrder,
    tradeState
  };
}; 