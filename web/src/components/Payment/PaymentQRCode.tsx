// 支付二维码显示组件
import React, { useEffect, useState } from 'react';
// @ts-ignore
import * as QRCode from 'qrcode';
import { PaymentOrder, PaymentStatus, PaymentStatusMap } from '../../types/payment';
import { rechargeApi } from '../../services/rechargeApi';

interface PaymentQRCodeProps {
  order: PaymentOrder;
  codeUrl: string;
  onPaymentSuccess?: (order: PaymentOrder) => void;
  onPaymentFailed?: (order: PaymentOrder) => void;
  onCancel?: () => void;
}

const PaymentQRCode: React.FC<PaymentQRCodeProps> = ({
  order,
  codeUrl,
  onPaymentSuccess,
  onPaymentFailed,
  onCancel
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);
  const [currentOrderStatus, setCurrentOrderStatus] = useState(order.paymentStatus);

  // 生成二维码
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(codeUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error('生成二维码失败:', err);
        setError('生成二维码失败');
      }
    };

    if (codeUrl) {
      generateQRCode();
    }
  }, [codeUrl]);

  // 计算剩余时间
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!order.expiredAt) {
        setTimeLeft(0);
        return;
      }
      
      const expiredTime = new Date(order.expiredAt).getTime();
      if (isNaN(expiredTime)) {
        setTimeLeft(0);
        return;
      }
      
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiredTime - now) / 1000));
      setTimeLeft(remaining);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [order.expiredAt]);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) {
      return '00:00';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 轮询支付状态
  useEffect(() => {
    if (currentOrderStatus !== PaymentStatus.PENDING) return;

    const pollPaymentStatus = async () => {
      try {
        const response = await rechargeApi.getOrderStatus(order.orderNo);
        console.log('🔍 支付状态轮询响应:', response);
        
        if (response.success && response.data) {
          const newStatus = response.data.status;
          
          if (newStatus !== currentOrderStatus) {
            console.log(`🔄 订单状态变化: ${currentOrderStatus} → ${newStatus}`);
            setCurrentOrderStatus(newStatus as PaymentStatus);
            
            // 更新订单对象
            const updatedOrder = {
              ...order,
              paymentStatus: newStatus as PaymentStatus,
              paymentTime: response.data.paymentTime,
              points: response.data.points || order.points
            };
            
            if (newStatus === 'PAID') {
              console.log('🎉 检测到支付成功！');
              onPaymentSuccess?.(updatedOrder);
            } else if (newStatus === 'FAILED' || newStatus === 'EXPIRED') {
              console.log('❌ 检测到支付失败或过期');
              onPaymentFailed?.(updatedOrder);
            }
          }
        }
      } catch (error) {
        console.error('查询支付状态失败:', error);
      }
    };

    setIsPolling(true);
    pollPaymentStatus(); // 立即执行一次
    
    const interval = setInterval(pollPaymentStatus, 3000); // 每3秒查询一次

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [order.orderNo, currentOrderStatus, onPaymentSuccess, onPaymentFailed]);

  // 监听支付状态变化
  useEffect(() => {
    if (currentOrderStatus === PaymentStatus.PAID && onPaymentSuccess) {
      onPaymentSuccess(order);
    } else if (
      (currentOrderStatus === PaymentStatus.FAILED ||
       currentOrderStatus === PaymentStatus.CANCELLED ||
       currentOrderStatus === PaymentStatus.EXPIRED) &&
      onPaymentFailed
    ) {
      onPaymentFailed(order);
    }
  }, [currentOrderStatus, order, onPaymentSuccess, onPaymentFailed]);

  const isPending = currentOrderStatus === PaymentStatus.PENDING;
  // 只有当订单状态为EXPIRED，或者时间计算完成且真正为0时才认为过期
  const isExpired = currentOrderStatus === PaymentStatus.EXPIRED || (timeLeft === 0 && order.expiredAt);
  
  
  

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* 订单信息 */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">微信扫码支付</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>订单号: {order.orderNo}</p>
          <p>支付金额: <span className="font-semibold text-red-600">¥{order.amount ? order.amount.toFixed(2) : '0.00'}</span></p>
          <p>获得积分: <span className="font-semibold text-blue-600">{(order.points || 0) + (order.bonusPoints || 0)}</span></p>
        </div>
      </div>

      {/* 二维码区域 */}
      <div className="flex flex-col items-center mb-6">
        {error ? (
          <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        ) : qrCodeDataUrl ? (
          <div className={`relative ${isExpired ? 'opacity-50' : ''}`}>
            <img 
              src={qrCodeDataUrl} 
              alt="支付二维码" 
              className="w-64 h-64 border rounded-lg"
            />
            {isExpired && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                <span className="text-white font-bold">二维码已过期</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* 支付状态 */}
        <div className="mt-4 text-center">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isPending ? 'bg-yellow-100 text-yellow-800' : 
            currentOrderStatus === PaymentStatus.PAID ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {PaymentStatusMap[currentOrderStatus]}
            {isPolling && isPending && (
              <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b border-current"></div>
            )}
          </div>
        </div>
      </div>

      {/* 倒计时和说明 */}
      {isPending && !isExpired && (
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-red-600 mb-2">
            {formatTime(timeLeft)}
          </div>
          <p className="text-sm text-gray-600">
            请在有效时间内完成支付
          </p>
        </div>
      )}

      {/* 支付说明 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">支付说明：</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 请使用微信扫描上方二维码完成支付</li>
          <li>• 支付成功后积分将自动充值到您的账户</li>
          <li>• 如遇问题请联系客服</li>
          <li>• 请勿关闭此页面，直到支付完成</li>
        </ul>
      </div>

      {/* 操作按钮 */}
      <div className="flex space-x-3">
        {isExpired ? (
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            返回重新支付
          </button>
        ) : (
          <>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              取消支付
            </button>
            <button
              onClick={async () => {
                try {
                  console.log('🔄 手动刷新支付状态...');
                  const response = await rechargeApi.syncOrderStatus(order.orderNo);
                  console.log('✅ 手动刷新结果:', response);
                  
                  if (response.success && response.data) {
                    const newStatus = response.data.status;
                    setCurrentOrderStatus(newStatus as PaymentStatus);
                    
                    if (newStatus === 'PAID') {
                      const updatedOrder = {
                        ...order,
                        paymentStatus: newStatus as PaymentStatus,
                        paymentTime: response.data.paymentTime
                      };
                      onPaymentSuccess?.(updatedOrder);
                    }
                  }
                } catch (error) {
                  console.error('手动刷新失败:', error);
                  alert('刷新失败，请重试');
                }
              }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              强制刷新
            </button>
          </>
        )}
      </div>

      {/* 支付成功提示 */}
      {currentOrderStatus === PaymentStatus.PAID && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-800 font-medium">支付成功！积分已充值到您的账户</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentQRCode; 