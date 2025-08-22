import React, { useState, useEffect } from 'react';

interface SummaryData {
  dailyConsumed: number;
  dailyRecharged: number;
  monthlyConsumed: number;
  monthlyRecharged: number;
  trendData: Array<{
    date: string;
    consumed: number;
    recharged: number;
  }>;
}

interface UsageSummaryCardsProps {
  className?: string;
}

const UsageSummaryCards: React.FC<UsageSummaryCardsProps> = ({ className = '' }) => {
  const [summaryData, setSummaryData] = useState<SummaryData>({
    dailyConsumed: 0,
    dailyRecharged: 0,
    monthlyConsumed: 0,
    monthlyRecharged: 0,
    trendData: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载汇总数据
  const loadSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const sessionId = localStorage.getItem('sessionId');
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // 获取当日数据
      const dailyResponse = await fetch(`/api/admin/usage-stats/summary?startDate=${startOfToday.toISOString()}&excludeAdmin=true`, {
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      // 获取当月数据
      const monthlyResponse = await fetch(`/api/admin/usage-stats/summary?startDate=${startOfMonth.toISOString()}&excludeAdmin=true`, {
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      // 获取趋势数据（最近30天） - 临时注释掉避免404错误
      // const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      // const trendResponse = await fetch(`/api/admin/usage-stats/trend?startDate=${thirtyDaysAgo.toISOString()}&endDate=${today.toISOString()}&excludeAdmin=true`, {
      //   headers: {
      //     'X-Session-Id': sessionId || '',
      //     'Content-Type': 'application/json'
      //   }
      // });

      if (!dailyResponse.ok || !monthlyResponse.ok) {
        throw new Error('获取汇总数据失败');
      }

      const dailyData = await dailyResponse.json();
      const monthlyData = await monthlyResponse.json();
      // const trendData = await trendResponse.json();
      const trendData = { data: { trend: [] } }; // 临时使用空数据

      // 调试输出，查看实际的数据结构
      console.log('Daily data structure:', dailyData);
      console.log('Monthly data structure:', monthlyData);

      // 计算消耗和充值数据
      const calculateStats = (data: any) => {
        console.log('Processing data:', data);
        // 修正数据访问路径，应该是 data.data.summary.transactionsByType
        const transactions = data.data?.summary?.transactionsByType || [];
        console.log('Transactions found:', transactions);
        const consumed = transactions
          .filter((t: any) => ['CONSUME', 'PROGRAMMING', 'MULTIPLE_CHOICE'].includes(t.type))
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
        const recharged = transactions
          .filter((t: any) => ['RECHARGE'].includes(t.type))
          .reduce((sum: number, t: any) => sum + t.amount, 0);
        console.log('Calculated stats:', { consumed, recharged });
        return { consumed, recharged };
      };

      const dailyStats = calculateStats(dailyData);
      const monthlyStats = calculateStats(monthlyData);

      setSummaryData({
        dailyConsumed: dailyStats.consumed,
        dailyRecharged: dailyStats.recharged,
        monthlyConsumed: monthlyStats.consumed,
        monthlyRecharged: monthlyStats.recharged,
        trendData: trendData.data?.trend || []
      });

    } catch (error) {
      console.error('加载汇总数据失败:', error);
      setError(error instanceof Error ? error.message : '加载汇总数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummaryData();
  }, []);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-400">加载汇总数据中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="text-center text-red-400">
          <p>加载失败: {error}</p>
          <button 
            onClick={loadSummaryData}
            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  const StatCard: React.FC<{
    title: string;
    value: number;
    type: 'consumed' | 'recharged';
    period: 'daily' | 'monthly';
  }> = ({ title, value, type, period }) => {
    const isConsumed = type === 'consumed';
    const colorClass = isConsumed ? 'text-red-400' : 'text-green-400';
    const bgClass = isConsumed ? 'bg-red-600/20' : 'bg-green-600/20';
    const iconClass = isConsumed ? '↓' : '↑';

    return (
      <div className={`${bgClass} rounded-lg p-4 border border-gray-700`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <p className={`text-2xl font-bold ${colorClass} mt-1`}>
              {value.toLocaleString()}
            </p>
          </div>
          <div className={`text-3xl ${colorClass}`}>
            {iconClass}
          </div>
        </div>
      </div>
    );
  };

  // 简单的迷你折线图组件
  const MiniChart: React.FC<{ data: SummaryData['trendData'] }> = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">暂无趋势数据</p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => Math.max(d.consumed, d.recharged)));
    const chartHeight = 120;

    return (
      <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-white font-medium mb-3">30天趋势</h3>
        <div className="relative" style={{ height: chartHeight }}>
          <svg width="100%" height={chartHeight} className="overflow-visible">
            {/* 消费趋势线 */}
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              points={data.map((point, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = ((maxValue - point.consumed) / maxValue) * (chartHeight - 20) + 10;
                return `${x}%,${y}`;
              }).join(' ')}
            />
            {/* 充值趋势线 */}
            <polyline
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              points={data.map((point, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = ((maxValue - point.recharged) / maxValue) * (chartHeight - 20) + 10;
                return `${x}%,${y}`;
              }).join(' ')}
            />
          </svg>
        </div>
        <div className="flex justify-center space-x-4 mt-3 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-0.5 bg-red-400 mr-1"></div>
            <span className="text-gray-400">消费</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-0.5 bg-green-400 mr-1"></div>
            <span className="text-gray-400">充值</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">使用情况汇总</h2>
        <button 
          onClick={loadSummaryData}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          刷新
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="今日消费积分"
          value={summaryData.dailyConsumed}
          type="consumed"
          period="daily"
        />
        <StatCard
          title="今日充值积分"
          value={summaryData.dailyRecharged}
          type="recharged"
          period="daily"
        />
        <StatCard
          title="本月消费积分"
          value={summaryData.monthlyConsumed}
          type="consumed"
          period="monthly"
        />
        <StatCard
          title="本月充值积分"
          value={summaryData.monthlyRecharged}
          type="recharged"
          period="monthly"
        />
      </div>

      <MiniChart data={summaryData.trendData} />
    </div>
  );
};

export default UsageSummaryCards;