import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface RechargeQRCodeProps {
  orderNo: string;
  qrCodeUrl: string;
  amount: number;
  points: number;
  expireTime: string;
  packageInfo: {
    name: string;
    description: string;
  };
  onPaymentSuccess?: () => void;
  onPaymentFailed?: () => void;
  onCancel?: () => void;
}

const RechargeQRCode: React.FC<RechargeQRCodeProps> = ({
  orderNo,
  qrCodeUrl,
  amount,
  points,
  expireTime,
  packageInfo,
  onPaymentSuccess,
  onPaymentFailed,
  onCancel
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isPolling, setIsPolling] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED'>('PENDING');

  // 生成二维码
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(qrCodeUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        setQrCodeDataUrl(dataUrl);
      } catch (error) {
        console.error('生成二维码失败:', error);
      }
    };

    if (qrCodeUrl) {
      generateQRCode();
    }
  }, [qrCodeUrl]);

  // 计算剩余时间
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expire = new Date(expireTime).getTime();
      const difference = expire - now;
      
      if (difference > 0) {
        setTimeLeft(Math.floor(difference / 1000));
      } else {
        setTimeLeft(0);
        setOrderStatus('EXPIRED');
        onPaymentFailed?.();
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expireTime, onPaymentFailed]);

  // 轮询订单状态
  useEffect(() => {
    if (!orderNo || orderStatus !== 'PENDING') return;

    const pollOrderStatus = async () => {
      try {
        const sessionId = localStorage.getItem('sessionId');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        // 使用正确的认证头
        if (sessionId) {
          headers['Authorization'] = `Bearer ${sessionId}`;
          headers['X-Session-Id'] = sessionId;
        }

        const response = await fetch(`/api/recharge/order-status/${orderNo}`, {
          headers,
          credentials: 'include'
        });
        
        const data = await response.json();
        console.log('🔍 轮询订单状态响应:', data);
        
        if (data.success && data.data) {
          const status = data.data.status;
          setOrderStatus(status);
          
          if (status === 'PAID') {
            console.log('🎉 支付成功！');
            // 延迟一点时间让用户看到成功状态
            setTimeout(() => {
              onPaymentSuccess?.();
            }, 1000);
          } else if (status === 'FAILED' || status === 'EXPIRED') {
            console.log('❌ 支付失败或过期');
            onPaymentFailed?.();
          }
        }
      } catch (error) {
        console.error('查询订单状态失败:', error);
      }
    };

    setIsPolling(true);
    pollOrderStatus(); // 立即执行一次
    
    const interval = setInterval(pollOrderStatus, 3000); // 每3秒查询一次

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [orderNo, orderStatus, onPaymentSuccess, onPaymentFailed]);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 获取状态显示
  const getStatusDisplay = () => {
    switch (orderStatus) {
      case 'PENDING':
        return {
          text: '等待支付',
          color: 'text-yellow-400',
          icon: '⏳'
        };
      case 'PAID':
        return {
          text: '支付成功',
          color: 'text-green-400',
          icon: '✅'
        };
      case 'FAILED':
        return {
          text: '支付失败',
          color: 'text-red-400',
          icon: '❌'
        };
      case 'EXPIRED':
        return {
          text: '订单已过期',
          color: 'text-gray-400',
          icon: '⏰'
        };
      default:
        return {
          text: '未知状态',
          color: 'text-gray-400',
          icon: '❓'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="max-w-md mx-auto bg-gray-800 rounded-lg border border-gray-600 p-6">
      {/* 订单信息 */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">{packageInfo.name}</h3>
        <p className="text-gray-400 text-sm mb-4">{packageInfo.description}</p>
        
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">订单号：</span>
            <span className="text-white font-mono text-sm">{orderNo}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">支付金额：</span>
            <span className="text-white font-bold">¥{amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">获得积分：</span>
            <span className="text-blue-400 font-bold">{points}</span>
          </div>
        </div>
      </div>

      {/* 支付状态 */}
      <div className="text-center mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.color} bg-gray-700`}>
          <span className="mr-1">{statusDisplay.icon}</span>
          {statusDisplay.text}
          {isPolling && orderStatus === 'PENDING' && (
            <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b border-current"></div>
          )}
        </div>
      </div>

      {/* 二维码 */}
      {orderStatus === 'PENDING' && (
        <div className="text-center mb-6">
          <div className="bg-white rounded-lg p-4 inline-block mb-4">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="支付二维码" className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
              </div>
            )}
          </div>
          
          <p className="text-gray-400 text-sm mb-2">
            请使用微信扫描上方二维码完成支付
          </p>
          
          {timeLeft > 0 && (
            <p className="text-yellow-400 text-sm">
              订单将在 {formatTime(timeLeft)} 后过期
            </p>
          )}
        </div>
      )}

      {/* 支付成功信息 */}
      {orderStatus === 'PAID' && (
        <div className="text-center mb-6">
          <div className="bg-green-100 rounded-lg p-6 mb-4">
            <div className="text-green-600 text-4xl mb-2">✅</div>
            <p className="text-green-800 font-medium">支付成功！</p>
            <p className="text-green-700 text-sm">积分已充值到您的账户</p>
          </div>
        </div>
      )}

      {/* 支付失败信息 */}
      {(orderStatus === 'FAILED' || orderStatus === 'EXPIRED') && (
        <div className="text-center mb-6">
          <div className="bg-red-100 rounded-lg p-6 mb-4">
            <div className="text-red-600 text-4xl mb-2">❌</div>
            <p className="text-red-800 font-medium">
              {orderStatus === 'EXPIRED' ? '订单已过期' : '支付失败'}
            </p>
            <p className="text-red-700 text-sm">
              {orderStatus === 'EXPIRED' ? '请重新创建订单' : '请稍后重试'}
            </p>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="space-y-3">
        {orderStatus === 'PENDING' && (
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            取消支付
          </button>
        )}
        
        {(orderStatus === 'FAILED' || orderStatus === 'EXPIRED') && (
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            重新选择套餐
          </button>
        )}

        {orderStatus === 'PAID' && (
          <button
            onClick={onPaymentSuccess}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
          >
            查看订单记录
          </button>
        )}
      </div>

      {/* 帮助信息 */}
      {orderStatus === 'PENDING' && (
        <div className="mt-4 p-3 bg-gray-700 rounded-lg">
          <p className="text-gray-400 text-xs text-center">
            💡 支付遇到问题？请确保微信已更新到最新版本
          </p>
        </div>
      )}
    </div>
  );
};

export default RechargeQRCode;