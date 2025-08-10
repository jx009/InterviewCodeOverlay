// 订单列表组件
import React, { useState } from 'react';
import { 
  PaymentOrder, 
  PaymentStatus, 
  // PaymentMethod,
  PaymentStatusMap, 
  PaymentMethodMap,
  PaymentStatusColors 
} from '../../types/payment';
import { useCancelOrder } from '../../hooks/usePayment';

interface OrderListProps {
  orders: PaymentOrder[];
  loading?: boolean;
  onOrderClick?: (order: PaymentOrder) => void;
  onRefresh?: () => void;
  showPagination?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange?: (page: number) => void;
}

const OrderList: React.FC<OrderListProps> = ({
  orders,
  loading = false,
  onOrderClick,
  onRefresh,
  showPagination = false,
  pagination,
  onPageChange
}) => {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const { cancelOrder, loading: cancelLoading } = useCancelOrder();

  const handleCancelOrder = async (orderNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (window.confirm('确定要取消这个订单吗？')) {
      const success = await cancelOrder(orderNo);
      if (success && onRefresh) {
        onRefresh();
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canCancelOrder = (order: PaymentOrder) => {
    return order.paymentStatus === PaymentStatus.PENDING;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg border p-4 animate-pulse">
            <div className="flex justify-between items-start mb-3">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无订单</h3>
        <p className="text-gray-600">您还没有任何充值订单</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 订单列表 */}
      {orders.map((order) => (
        <div
          key={order.id}
          className={`
            bg-white rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md
            ${selectedOrder === order.orderNo ? 'border-blue-500 shadow-md' : 'border-gray-200'}
          `}
          onClick={() => {
            setSelectedOrder(order.orderNo);
            if (onOrderClick) {
              onOrderClick(order);
            }
          }}
        >
          <div className="p-4">
            {/* 订单头部 */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  订单号: {order.orderNo}
                </h4>
                <p className="text-sm text-gray-600">
                  {formatDate(order.createdAt)}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* 支付状态 */}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${PaymentStatusColors[order.paymentStatus]}`}>
                  {PaymentStatusMap[order.paymentStatus]}
                </span>
                
                {/* 取消按钮 */}
                {canCancelOrder(order) && (
                  <button
                    onClick={(e) => handleCancelOrder(order.orderNo, e)}
                    disabled={cancelLoading}
                    className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                  >
                    {cancelLoading ? '取消中...' : '取消'}
                  </button>
                )}
              </div>
            </div>

            {/* 订单详情 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">支付金额:</span>
                <p className="font-semibold text-red-600">¥{order.amount}</p>
              </div>
              
              <div>
                <span className="text-gray-600">获得积分:</span>
                <p className="font-semibold text-blue-600">
                  {order.points.toLocaleString()}
                  {order.bonusPoints > 0 && (
                    <span className="text-green-600"> +{order.bonusPoints.toLocaleString()}</span>
                  )}
                </p>
              </div>
              
              <div>
                <span className="text-gray-600">支付方式:</span>
                <p className="font-medium">{PaymentMethodMap[order.paymentMethod]}</p>
              </div>
              
              <div>
                <span className="text-gray-600">套餐:</span>
                <p className="font-medium">{order.package?.name || '未知套餐'}</p>
              </div>
            </div>

            {/* 支付时间 */}
            {order.paidAt && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-600">
                  支付时间: {formatDate(order.paidAt)}
                </span>
              </div>
            )}

            {/* 过期时间（仅待支付订单显示） */}
            {order.paymentStatus === PaymentStatus.PENDING && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-600">
                  过期时间: {formatDate(order.expiredAt)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* 分页 */}
      {showPagination && pagination && pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <button
            onClick={() => onPageChange && onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          
          <div className="flex space-x-1">
            {[...Array(Math.min(pagination.pages, 5))].map((_, index) => {
              const pageNum = Math.max(1, pagination.page - 2) + index;
              if (pageNum > pagination.pages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange && onPageChange(pageNum)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    pageNum === pagination.page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => onPageChange && onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}

      {/* 统计信息 */}
      {showPagination && pagination && (
        <div className="text-center text-sm text-gray-600 mt-4">
          共 {pagination.total} 个订单，第 {pagination.page} / {pagination.pages} 页
        </div>
      )}
    </div>
  );
};

export default OrderList; 