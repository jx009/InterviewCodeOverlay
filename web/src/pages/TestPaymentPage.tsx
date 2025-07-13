// 测试支付页面
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const TestPaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');

  // 从URL参数获取订单信息
  const orderNo = searchParams.get('orderNo') || '';
  const amount = searchParams.get('amount') || '0';
  const points = searchParams.get('points') || '0';

  // 模拟支付成功
  const handlePaymentSuccess = () => {
    setPaymentStatus('processing');
    setTimeout(() => {
      setPaymentStatus('success');
      setTimeout(() => {
        navigate('/recharge?step=orders');
      }, 3000);
    }, 2000);
  };

  // 模拟支付失败
  const handlePaymentFailed = () => {
    setPaymentStatus('failed');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {/* 页面标题 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">测试支付</h1>
          <p className="text-gray-600">一分钱体验支付流程</p>
        </div>

        {/* 订单信息 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">订单信息</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">订单号:</span>
              <span className="font-medium text-sm">{orderNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">支付金额:</span>
              <span className="font-medium text-green-600">¥{amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">获得积分:</span>
              <span className="font-medium text-blue-600">{points}</span>
            </div>
          </div>
        </div>

        {/* 支付状态 */}
        {paymentStatus === 'pending' && (
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">选择支付结果</h3>
            
            <div className="space-y-3">
              <button
                onClick={handlePaymentSuccess}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                ✅ 模拟支付成功
              </button>
              
              <button
                onClick={handlePaymentFailed}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                ❌ 模拟支付失败
              </button>
            </div>
          </div>
        )}

        {paymentStatus === 'processing' && (
          <div className="text-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">正在处理支付...</h3>
            <p className="text-gray-600">请稍候，正在确认支付结果</p>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-lg font-semibold text-green-600 mb-2">支付成功！</h3>
            <p className="text-gray-600 mb-4">恭喜您！已成功充值 {points} 积分</p>
            <p className="text-sm text-gray-500">3秒后自动跳转...</p>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">❌</div>
            <h3 className="text-lg font-semibold text-red-600 mb-2">支付失败</h3>
            <p className="text-gray-600 mb-4">支付未能完成，请重试</p>
            
            <button
              onClick={() => navigate('/recharge')}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              返回充值页面
            </button>
          </div>
        )}

        {/* 测试说明 */}
        {paymentStatus === 'pending' && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">💡 测试说明</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 这是测试支付页面，不会产生真实费用</li>
              <li>• 在生产环境中将跳转到真实微信支付</li>
              <li>• 选择"支付成功"会模拟积分充值</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestPaymentPage; 