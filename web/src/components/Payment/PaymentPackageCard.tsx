// 支付套餐卡片组件
import React from 'react';
import { PaymentPackage, PaymentMethod } from '../../types/payment';

interface PaymentPackageCardProps {
  package: PaymentPackage;
  selected?: boolean;
  onSelect?: (packageId: number) => void;
  onPurchase?: (packageId: number, paymentMethod: PaymentMethod) => void;
  loading?: boolean;
}

const PaymentPackageCard: React.FC<PaymentPackageCardProps> = ({
  package: pkg,
  selected = false,
  onSelect,
  onPurchase,
  loading = false
}) => {
  const handleCardClick = () => {
    if (onSelect && !loading) {
      onSelect(pkg.id);
    }
  };

  const handlePurchase = (paymentMethod: PaymentMethod) => {
    if (onPurchase && !loading) {
      onPurchase(pkg.id, paymentMethod);
    }
  };

  // 计算总积分
  const totalPoints = pkg.points + pkg.bonusPoints;
  
  // 计算性价比（积分/元）
  const costEffectiveness = totalPoints / pkg.amount;

  return (
    <div
      className={`
        relative bg-white rounded-lg border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-lg
        ${selected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}
        ${pkg.isRecommended ? 'ring-2 ring-orange-200' : ''}
        ${pkg.id === 999 ? 'border-green-300 bg-green-50' : ''}
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={handleCardClick}
    >
      {/* 推荐标签 */}
      {pkg.isRecommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            推荐
          </span>
        </div>
      )}

      {/* 测试套餐标签 */}
      {pkg.id === 999 && (
        <div className="absolute -top-3 right-4">
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            🧪 测试
          </span>
        </div>
      )}

      {/* 套餐名称 */}
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
        {pkg.description && (
          <p className="text-gray-600 text-sm">{pkg.description}</p>
        )}
      </div>

      {/* 价格 */}
      <div className="text-center mb-4">
        <div className="flex items-baseline justify-center">
          <span className="text-3xl font-bold text-gray-900">¥{pkg.amount}</span>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          性价比: {costEffectiveness.toFixed(1)} 积分/元
        </div>
      </div>

      {/* 积分信息 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">基础积分:</span>
          <span className="font-semibold text-blue-600">{pkg.points.toLocaleString()}</span>
        </div>
        
        {pkg.bonusPoints > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">赠送积分:</span>
            <span className="font-semibold text-green-600">+{pkg.bonusPoints.toLocaleString()}</span>
          </div>
        )}
        
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-900 font-medium">总计积分:</span>
            <span className="font-bold text-lg text-indigo-600">{totalPoints.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 标签 */}
      {pkg.tags && pkg.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {pkg.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 购买按钮 */}
      <div className="space-y-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePurchase(PaymentMethod.WECHAT_PAY);
          }}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              处理中...
            </div>
          ) : (
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
              </svg>
              微信支付
            </div>
          )}
        </button>

        {/* 备用支付方式 - 暂时隐藏支付宝 */}
        {/* <button
          onClick={(e) => {
            e.stopPropagation();
            handlePurchase(PaymentMethod.ALIPAY);
          }}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          支付宝支付
        </button> */}
      </div>

      {/* 选中状态指示器 */}
      {selected && (
        <div className="absolute top-4 right-4">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPackageCard; 