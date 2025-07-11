// 充值页面
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PaymentPackageCard from '../components/Payment/PaymentPackageCard';
import PaymentQRCode from '../components/Payment/PaymentQRCode';
import OrderList from '../components/Payment/OrderList';
import { 
  usePaymentPackages, 
  useCreateOrder, 
  useUserOrders,
  usePaymentPolling 
} from '../hooks/usePayment';
import { useAuthContext } from '../contexts/AuthContext';
import { 
  PaymentMethod, 
  PaymentStatus, 
  PaymentOrder,
  CreateOrderRequest 
} from '../types/payment';
import LoadingSpinner from '../components/LoadingSpinner';

type PageStep = 'packages' | 'payment' | 'orders';

const RechargePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  
  // 页面状态
  const [currentStep, setCurrentStep] = useState<PageStep>('packages');
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [paymentCodeUrl, setPaymentCodeUrl] = useState<string>('');

  // Hooks
  const { packages, loading: packagesLoading, error: packagesError } = usePaymentPackages();
  const { createOrder, loading: createOrderLoading, error: createOrderError } = useCreateOrder();
  
  // 只有在orders步骤时才获取订单数据
  const shouldFetchOrders = currentStep === 'orders';
  const { orders, pagination, loading: ordersLoading, refetch: refetchOrders } = useUserOrders(
    shouldFetchOrders ? { page: 1, limit: 10 } : undefined
  );
  const { startPolling, stopPolling } = usePaymentPolling(currentOrder?.orderNo);

  // 从URL参数获取初始状态
  useEffect(() => {
    const step = searchParams.get('step') as PageStep;
    const orderNo = searchParams.get('orderNo');
    
    if (step && ['packages', 'payment', 'orders'].includes(step)) {
      setCurrentStep(step);
    }
    
    if (orderNo && step === 'payment') {
      // 这里可以根据orderNo获取订单详情
      // 暂时简化处理
    }
  }, [searchParams]);

  // 检查用户认证状态
  useEffect(() => {
    // 只要本地存储中有sessionId就视为已登录
    const hasSessionId = !!localStorage.getItem('sessionId');
    const hasValidSession = isAuthenticated || hasSessionId;
    
    console.log('充值页面检查认证状态:', { 
      isAuthenticated, 
      authLoading, 
      hasSessionId,
      hasValidSession
    });
    
    // 仅在加载完成后且没有有效会话时重定向到登录页面
    if (!authLoading && !hasValidSession) {
      console.log('用户未登录，即将跳转到登录页面');
      // 保存当前URL以便登录后跳回
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // 如果认证状态正在加载中，显示加载动画
  if (authLoading) {
      return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <LoadingSpinner />
      <span className="ml-2 text-gray-400">正在验证登录状态...</span>
    </div>
  );
  }

  // 检查是否有有效会话
  const hasSessionId = !!localStorage.getItem('sessionId');
  const hasValidSession = isAuthenticated || hasSessionId;
  
  // 如果用户未登录且没有有效会话，不渲染页面内容
  if (!hasValidSession) {
    return null;
  }

  // 更新URL参数
  const updateSearchParams = (step: PageStep, orderNo?: string) => {
    const params = new URLSearchParams();
    params.set('step', step);
    if (orderNo) {
      params.set('orderNo', orderNo);
    }
    setSearchParams(params);
  };

  // 处理套餐选择
  const handlePackageSelect = (packageId: number) => {
    setSelectedPackageId(packageId);
  };

  // 处理购买
  const handlePurchase = async (packageId: number, paymentMethod: PaymentMethod) => {
    try {
      const orderData: CreateOrderRequest = {
        packageId,
        paymentMethod
      };

      const response = await createOrder(orderData);
      
      if (response && response.data) {
        setCurrentOrder({
          id: 0, // 临时ID
          orderNo: response.data.orderNo,
          outTradeNo: response.data.orderNo,
          userId: 0,
          packageId,
          amount: packages.find(p => p.id === packageId)?.amount || 0,
          points: packages.find(p => p.id === packageId)?.points || 0,
          bonusPoints: packages.find(p => p.id === packageId)?.bonusPoints || 0,
          paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          expiredAt: response.data.expireTime,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        setPaymentCodeUrl(response.data.qrCodeUrl || '');
        setCurrentStep('payment');
        updateSearchParams('payment', response.data.orderNo);
        
        // 开始轮询支付状态
        startPolling();
      }
    } catch (error) {
      console.error('创建订单失败:', error);
    }
  };

  // 处理支付成功
  const handlePaymentSuccess = (_order: PaymentOrder) => {
    stopPolling();
    alert('支付成功！积分已充值到您的账户');
    setCurrentStep('orders');
    updateSearchParams('orders');
    refetchOrders();
  };

  // 处理支付失败
  const handlePaymentFailed = (_order: PaymentOrder) => {
    stopPolling();
    alert('支付失败或已取消');
    setCurrentStep('packages');
    updateSearchParams('packages');
  };

  // 处理取消支付
  const handleCancelPayment = () => {
    stopPolling();
    setCurrentStep('packages');
    updateSearchParams('packages');
    setCurrentOrder(null);
    setPaymentCodeUrl('');
  };

  // 处理步骤切换
  const handleStepChange = (step: PageStep) => {
    if (step !== currentStep) {
      setCurrentStep(step);
      updateSearchParams(step);
      
      if (step !== 'payment') {
        stopPolling();
      }
    }
  };

  // 渲染步骤指示器
  const renderStepIndicator = () => {
    const steps = [
      { key: 'packages', label: '选择套餐', icon: '📦' },
      { key: 'payment', label: '支付订单', icon: '💳' },
      { key: 'orders', label: '订单记录', icon: '📋' }
    ];

    return (
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <button
                onClick={() => handleStepChange(step.key as PageStep)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  currentStep === step.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span>{step.icon}</span>
                <span className="font-medium">{step.label}</span>
              </button>
              
              {index < steps.length - 1 && (
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // 渲染套餐选择页面
  const renderPackagesStep = () => (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">选择充值套餐</h2>
        <p className="text-gray-400">选择适合您的积分充值套餐</p>
      </div>

      {packagesError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800">{packagesError}</span>
          </div>
        </div>
      )}

      {packagesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg border p-6 animate-pulse">
              <div className="text-center mb-4">
                <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
              </div>
              <div className="text-center mb-4">
                <div className="h-8 bg-gray-200 rounded w-20 mx-auto"></div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <PaymentPackageCard
              key={pkg.id}
              package={pkg}
              selected={selectedPackageId === pkg.id}
              onSelect={handlePackageSelect}
              onPurchase={handlePurchase}
              loading={createOrderLoading}
            />
          ))}
        </div>
      )}

      {createOrderError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800">{createOrderError}</span>
          </div>
        </div>
      )}
    </div>
  );

  // 渲染支付页面
  const renderPaymentStep = () => (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">扫码支付</h2>
        <p className="text-gray-400">请使用微信扫描二维码完成支付</p>
      </div>

      {currentOrder && paymentCodeUrl ? (
        <PaymentQRCode
          order={currentOrder}
          codeUrl={paymentCodeUrl}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailed={handlePaymentFailed}
          onCancel={handleCancelPayment}
        />
      ) : (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在生成支付二维码...</p>
        </div>
      )}
    </div>
  );

  // 渲染订单记录页面
  const renderOrdersStep = () => (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">订单记录</h2>
        <p className="text-gray-400">查看您的充值订单历史</p>
      </div>

      <OrderList
        orders={orders}
        loading={ordersLoading}
        onRefresh={refetchOrders}
        showPagination={true}
        pagination={pagination}
        onPageChange={(page) => {
          // 这里可以实现分页逻辑
          console.log('切换到第', page, '页');
        }}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面头部 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">积分充值</h1>
          <p className="text-lg text-gray-400">充值积分，享受更多AI服务</p>
        </div>

        {/* 步骤指示器 */}
        {renderStepIndicator()}

        {/* 页面内容 */}
        <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-700 p-6">
          {currentStep === 'packages' && renderPackagesStep()}
          {currentStep === 'payment' && renderPaymentStep()}
          {currentStep === 'orders' && renderOrdersStep()}
        </div>

        {/* 返回按钮 */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回
          </button>
        </div>
      </div>
    </div>
  );
};

export default RechargePage; 