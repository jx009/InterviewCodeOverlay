import React, { useState, useEffect } from 'react';
import { rechargeApi, RechargeRecord } from '../../services/rechargeApi';
import LoadingSpinner from '../LoadingSpinner';

interface RechargeHistoryProps {
  className?: string;
}

const RechargeHistory: React.FC<RechargeHistoryProps> = ({ className = '' }) => {
  const [records, setRecords] = useState<RechargeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // 获取充值记录
  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await rechargeApi.getHistory({
        page,
        limit: pagination.limit
      });
      
      if (response.success && response.data) {
        setRecords(response.data.records);
        setPagination(response.data.pagination);
      } else {
        setError(response.message || '获取充值记录失败');
      }
    } catch (err: any) {
      console.error('获取充值记录失败:', err);
      setError(err.response?.data?.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取状态显示
  const getStatusDisplay = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return {
          text: '支付成功',
          className: 'bg-green-100 text-green-800',
          icon: '✅'
        };
      case 'pending':
        return {
          text: '待支付',
          className: 'bg-yellow-100 text-yellow-800',
          icon: '⏳'
        };
      case 'failed':
        return {
          text: '支付失败',
          className: 'bg-red-100 text-red-800',
          icon: '❌'
        };
      case 'expired':
        return {
          text: '已过期',
          className: 'bg-gray-100 text-gray-800',
          icon: '⏰'
        };
      case 'cancelled':
        return {
          text: '已取消',
          className: 'bg-gray-100 text-gray-800',
          icon: '🚫'
        };
      default:
        return {
          text: status,
          className: 'bg-gray-100 text-gray-800',
          icon: '❓'
        };
    }
  };

  // 处理分页
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchHistory(newPage);
    }
  };

  if (loading && records.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <LoadingSpinner />
        <span className="ml-2 text-gray-400">加载充值记录...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
          <button
            onClick={() => fetchHistory(pagination.page)}
            className="text-red-600 hover:text-red-800 text-sm underline"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 text-lg mb-2">📝</div>
        <p className="text-gray-400">暂无充值记录</p>
        <p className="text-gray-500 text-sm mt-1">您还没有进行过充值操作</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 记录列表 */}
      <div className="space-y-4 mb-6">
        {records.map((record) => {
          const statusDisplay = getStatusDisplay(record.status);
          
          return (
            <div
              key={record.orderNo}
              className="bg-gray-800 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-colors duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-1">{record.packageName}</h4>
                  <p className="text-gray-400 text-sm">{record.packageDescription}</p>
                </div>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.className}`}>
                  <span className="mr-1">{statusDisplay.icon}</span>
                  {statusDisplay.text}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                <div>
                  <span className="text-gray-400">支付金额：</span>
                  <span className="text-white font-medium">¥{record.amount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400">基础积分：</span>
                  <span className="text-blue-400 font-medium">{record.points}</span>
                </div>
                {record.bonusPoints > 0 && (
                  <div>
                    <span className="text-gray-400">赠送积分：</span>
                    <span className="text-green-400 font-medium">+{record.bonusPoints}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">总积分：</span>
                  <span className="text-yellow-400 font-bold">{record.totalPoints}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-600 pt-3">
                <span>订单号：{record.orderNo}</span>
                <div className="text-right">
                  <div>创建时间：{formatDate(record.createdAt)}</div>
                  {record.paymentTime && (
                    <div>支付时间：{formatDate(record.paymentTime)}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 分页控件 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev || loading}
              className="px-3 py-1 text-sm border border-gray-600 rounded text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              上一页
            </button>
            
            <div className="flex items-center space-x-1">
              {/* 页码按钮 */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={loading}
                    className={`px-3 py-1 text-sm rounded transition-colors duration-200 ${
                      pageNum === pagination.page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-600 text-gray-300 hover:bg-gray-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext || loading}
              className="px-3 py-1 text-sm border border-gray-600 rounded text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              下一页
            </button>
          </div>
        </div>
      )}
      
      {loading && (
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner />
          <span className="ml-2 text-gray-400 text-sm">加载中...</span>
        </div>
      )}
    </div>
  );
};

export default RechargeHistory;