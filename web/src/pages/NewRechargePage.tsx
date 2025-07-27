import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rechargeApi, RechargePackage } from '../services/rechargeApi';
import { useAuthContext } from '../contexts/AuthContext';
import RechargePackageCard from '../components/Recharge/RechargePackageCard';
import RechargeQRCode from '../components/Recharge/RechargeQRCode';
import RechargeHistory from '../components/Recharge/RechargeHistory';
import LoadingSpinner from '../components/LoadingSpinner';

type PageStep = 'packages' | 'payment' | 'history';

const NewRechargePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  
  // 页面状态
  const [currentStep, setCurrentStep] = useState<PageStep>('packages');
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  
  // 数据状态
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  
  // 订单状态
  const [currentOrder, setCurrentOrder] = useState<{
    orderNo: string;
    qrCodeUrl: string;
    amount: number;
    points: number;
    expireTime: string;
    packageInfo: {
      name: string;
      description: string;
    };
  } | null>(null);
  const [createOrderLoading, setCreateOrderLoading] = useState(false);
  const [createOrderError, setCreateOrderError] = useState<string | null>(null);

  // 从URL参数获取初始状态
  useEffect(() => {
    const step = searchParams.get('step') as PageStep;
    if (step && ['packages', 'payment', 'history'].includes(step)) {
      setCurrentStep(step);
    }
  }, [searchParams]);

  // 检查用户认证状态
  useEffect(() => {
    const hasSessionId = !!localStorage.getItem('sessionId');
    const hasValidSession = isAuthenticated || hasSessionId;
    
    if (!authLoading && !hasValidSession) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // 获取充值套餐
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setPackagesLoading(true);
        setPackagesError(null);
        
        const response = await rechargeApi.getPackages();
        
        if (response.success && response.data) {
          const sortedPackages = response.data.sort((a, b) => {
            if (a.isRecommended && !b.isRecommended) return -1;
            if (!a.isRecommended && b.isRecommended) return 1;
            return a.id - b.id;
          });
          setPackages(sortedPackages);
        } else {
          setPackagesError(response.message || '获取套餐列表失败');
        }
      } catch (error: any) {
        console.error('获取充值套餐失败:', error);
        if (error.response?.status !== 401) {
          setPackagesError(error.response?.data?.message || '网络错误');
        }
      } finally {
        setPackagesLoading(false);
      }
    };

    if (currentStep === 'packages') {
      fetchPackages();
    }
  }, [currentStep]);

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
  
  if (!hasValidSession) {
    return null;
  }

  // 更新URL参数
  const updateSearchParams = (step: PageStep) => {
    const params = new URLSearchParams();
    params.set('step', step);
    setSearchParams(params);
  };

  // 处理套餐选择
  const handlePackageSelect = (packageId: number) => {
    setSelectedPackageId(packageId);
  };

  // 处理购买
  const handlePurchase = async (packageId: number) => {
    try {
      setCreateOrderLoading(true);
      setCreateOrderError(null);

      const response = await rechargeApi.createOrder({ packageId });
      
      if (response.success && response.data) {
        setCurrentOrder(response.data);
        setCurrentStep('payment');
        updateSearchParams('payment');
      } else {
        setCreateOrderError(response.message || '创建订单失败');
      }
    } catch (error: any) {
      console.error('创建订单失败:', error);
      setCreateOrderError(error.response?.data?.message || '网络错误');
    } finally {
      setCreateOrderLoading(false);
    }
  };

  // 处理支付成功
  const handlePaymentSuccess = () => {
    setCurrentStep('packages');
    updateSearchParams('packages');
    setCurrentOrder(null);
  };

  // 处理支付失败
  const handlePaymentFailed = () => {
    setCurrentStep('packages');
    updateSearchParams('packages');
    setCurrentOrder(null);
  };

  // 处理取消支付
  const handleCancelPayment = () => {
    setCurrentStep('packages');
    updateSearchParams('packages');
    setCurrentOrder(null);
  };

  // 处理步骤切换
  const handleStepChange = (step: PageStep) => {
    if (step !== currentStep) {
      setCurrentStep(step);
      updateSearchParams(step);
      
      if (step !== 'payment') {
        setCurrentOrder(null);
      }
    }
  };

  // 渲染步骤指示器
  const renderStepIndicator = () => {
    const steps = [
      { key: 'packages', label: '选择套餐', icon: '📦' },
      { key: 'payment', label: '支付订单', icon: '💳' },
      { key: 'history', label: '充值记录', icon: '📋' }
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
            <div key={index} className="bg-gray-800 rounded-lg border border-gray-600 p-6 animate-pulse">
              <div className="text-center mb-4">
                <div className="h-6 bg-gray-700 rounded w-32 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-48 mx-auto"></div>
              </div>
              <div className="text-center mb-4">
                <div className="h-8 bg-gray-700 rounded w-20 mx-auto"></div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-700 rounded"></div>
              </div>
              <div className="h-10 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <RechargePackageCard
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

      {currentOrder ? (
        <RechargeQRCode
          orderNo={currentOrder.orderNo}
          qrCodeUrl={currentOrder.qrCodeUrl}
          amount={currentOrder.amount}
          points={currentOrder.points}
          expireTime={currentOrder.expireTime}
          packageInfo={currentOrder.packageInfo}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailed={handlePaymentFailed}
          onCancel={handleCancelPayment}
        />
      ) : (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">正在生成支付二维码...</p>
        </div>
      )}
    </div>
  );

  // 渲染充值记录页面
  const renderHistoryStep = () => (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">充值记录</h2>
        <p className="text-gray-400">查看您的充值订单历史</p>
      </div>

      <RechargeHistory />
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
          {currentStep === 'history' && renderHistoryStep()}
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

export default NewRechargePage;