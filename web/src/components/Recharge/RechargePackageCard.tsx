import React from 'react';
import { RechargePackage } from '../../services/rechargeApi';

interface RechargePackageCardProps {
  package: RechargePackage;
  selected: boolean;
  onSelect: (packageId: number) => void;
  onPurchase: (packageId: number) => void;
  loading?: boolean;
}

const RechargePackageCard: React.FC<RechargePackageCardProps> = ({
  package: pkg,
  selected,
  onSelect,
  onPurchase,
  loading = false
}) => {
  return (
    <div
      className={`relative bg-gray-800 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-blue-500 bg-gray-700'
          : 'border-gray-600 hover:border-gray-500'
      } ${pkg.isRecommended ? 'ring-2 ring-yellow-400' : ''}`}
      onClick={() => onSelect(pkg.id)}
    >
      {/* 推荐标签 */}
      {pkg.isRecommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
            推荐
          </span>
        </div>
      )}

      {/* 标签 */}
      {pkg.tags && pkg.tags.length > 0 && (
        <div className="absolute top-3 right-3 flex flex-wrap gap-1">
          {pkg.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="p-6">
        {/* 套餐头部 */}
        <div className="text-center mb-4">
          {pkg.icon && (
            <div className="text-3xl mb-2">{pkg.icon}</div>
          )}
          <h3 className="text-xl font-bold text-white mb-1">{pkg.name}</h3>
          <p className="text-gray-400 text-sm">{pkg.description}</p>
        </div>

        {/* 价格 */}
        <div className="text-center mb-4">
          <div className="text-3xl font-bold text-white">
            ¥{pkg.amount.toFixed(2)}
          </div>
        </div>

        {/* 积分信息 */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">基础积分：</span>
            <span className="text-white font-medium">{pkg.points}</span>
          </div>
          
          {pkg.bonusPoints > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">赠送积分：</span>
              <span className="text-green-400 font-medium">+{pkg.bonusPoints}</span>
            </div>
          )}
          
          <div className="border-t border-gray-600 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">总计积分：</span>
              <span className="text-blue-400 font-bold text-lg">{pkg.totalPoints}</span>
            </div>
          </div>
        </div>

        {/* 购买按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPurchase(pkg.id);
          }}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            selected
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              创建订单中...
            </div>
          ) : (
            '立即充值'
          )}
        </button>

        {/* 性价比显示 */}
        {pkg.bonusPoints > 0 && (
          <div className="mt-3 text-center">
            <span className="text-xs text-green-400">
              额外获得 {Math.round((pkg.bonusPoints / pkg.points) * 100)}% 积分
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RechargePackageCard;