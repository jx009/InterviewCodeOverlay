import React, { useState, useEffect } from 'react';

interface ModelStat {
  model: string;
  count: number;
  amount: number;
}

interface RechargeStat {
  amount: number;
  count: number;
}

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
  dailyModelStats: ModelStat[];
  monthlyModelStats: ModelStat[];
  dailyRechargeStats: RechargeStat[];
  monthlyRechargeStats: RechargeStat[];
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
    trendData: [],
    dailyModelStats: [],
    monthlyModelStats: [],
    dailyRechargeStats: [],
    monthlyRechargeStats: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载汇总数据
  const loadSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const sessionId = localStorage.getItem('sessionId');
      
      if (!sessionId) {
        console.error('🔍 没有找到sessionId');
        throw new Error('未找到登录信息，请重新登录');
      }
      
      console.log('🔍 Session信息:', {
        sessionId: sessionId?.substring(0, 10) + '...',
        sessionExists: !!sessionId
      });
      
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // 修复时区问题：使用当地时间格式化日期字符串
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayDateString = startOfToday.getFullYear() + '-' + 
        String(startOfToday.getMonth() + 1).padStart(2, '0') + '-' + 
        String(startOfToday.getDate()).padStart(2, '0');

      console.log('🔍 调试日期参数:', {
        today: today.toISOString(),
        startOfToday: startOfToday.toISOString(),
        todayDateString: todayDateString,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      // 获取当日数据 - 使用本地日期字符串而不是ISO字符串
      const dailyResponse = await fetch(`/api/admin/usage-stats/summary?startDate=${todayDateString}&excludeAdmin=true`, {
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      // 获取当月数据 - 同样使用本地日期字符串
      const monthDateString = startOfMonth.getFullYear() + '-' + 
        String(startOfMonth.getMonth() + 1).padStart(2, '0') + '-' + 
        String(startOfMonth.getDate()).padStart(2, '0');
      
      const monthlyResponse = await fetch(`/api/admin/usage-stats/summary?startDate=${monthDateString}&excludeAdmin=true`, {
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

      console.log('🔍 API响应状态:', {
        dailyStatus: dailyResponse.status,
        monthlyStatus: monthlyResponse.status,
        dailyOk: dailyResponse.ok,
        monthlyOk: monthlyResponse.ok
      });

      if (!dailyResponse.ok) {
        const errorText = await dailyResponse.text();
        console.error('🔍 今日数据请求失败:', {
          status: dailyResponse.status,
          statusText: dailyResponse.statusText,
          url: dailyResponse.url,
          error: errorText
        });
        throw new Error(`获取今日数据失败: ${dailyResponse.status} - ${errorText}`);
      }

      if (!monthlyResponse.ok) {
        const errorText = await monthlyResponse.text();
        console.error('🔍 本月数据请求失败:', {
          status: monthlyResponse.status,
          statusText: monthlyResponse.statusText,
          url: monthlyResponse.url,
          error: errorText
        });
        throw new Error(`获取本月数据失败: ${monthlyResponse.status} - ${errorText}`);
      }

      const dailyData = await dailyResponse.json();
      const monthlyData = await monthlyResponse.json();

      // 检查响应结构
      console.log('🔍 响应状态检查:');
      console.log('  - dailyData.success:', dailyData.success);
      console.log('  - monthlyData.success:', monthlyData.success);
      
      if (!dailyData.success) {
        console.error('🔍 今日数据API返回失败:', dailyData.error);
        throw new Error(`今日数据API错误: ${dailyData.error}`);
      }
      
      if (!monthlyData.success) {
        console.error('🔍 本月数据API返回失败:', monthlyData.error);
        throw new Error(`本月数据API错误: ${monthlyData.error}`);
      }
      // const trendData = await trendResponse.json();
      const trendData = { data: { trend: [] } }; // 临时使用空数据

      // 调试输出
      console.log('🔍 前端调试 - 今日数据:', dailyData);
      console.log('🔍 前端调试 - 本月数据:', monthlyData);
      console.log('🔍 前端调试 - 今日modelStats:', dailyData.data?.summary?.modelStats);
      console.log('🔍 前端调试 - 今日rechargeStats:', dailyData.data?.summary?.rechargeStats);
      console.log('🔍 前端调试 - API响应成功状态:', dailyData.success);
      console.log('🔍 前端调试 - 今日数据结构:', JSON.stringify(dailyData, null, 2));
      console.log('🔍 前端调试 - 访问路径测试 dailyData.data:', dailyData.data);
      console.log('🔍 前端调试 - 访问路径测试 dailyData.data?.summary:', dailyData.data?.summary);
      console.log('🔍 前端调试 - 访问路径测试 dailyData.data?.summary?.modelStats:', dailyData.data?.summary?.modelStats);
      console.log('🔍 前端调试 - 访问路径测试 dailyData.data?.summary?.rechargeStats:', dailyData.data?.summary?.rechargeStats);

      // 计算消耗和充值数据
      const calculateStats = (data: any) => {
        console.log('🔍 calculateStats 输入数据:', data);
        const transactions = data.data?.summary?.transactionsByType || [];
        console.log('🔍 提取的交易数据:', transactions);
        const consumed = transactions
          .filter((t: any) => ['CONSUME', 'PROGRAMMING', 'MULTIPLE_CHOICE'].includes(t.type))
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
        const recharged = transactions
          .filter((t: any) => ['RECHARGE'].includes(t.type))
          .reduce((sum: number, t: any) => sum + t.amount, 0);
        console.log('🔍 计算结果 - 消费:', consumed, '充值:', recharged);
        return { consumed, recharged };
      };

      const dailyStats = calculateStats(dailyData);
      const monthlyStats = calculateStats(monthlyData);

      // 提取模型和充值统计数据
      const dailyModelStats = dailyData.data?.summary?.modelStats || [];
      const monthlyModelStats = monthlyData.data?.summary?.modelStats || [];
      const dailyRechargeStats = dailyData.data?.summary?.rechargeStats || [];
      const monthlyRechargeStats = monthlyData.data?.summary?.rechargeStats || [];

      console.log('🔍 提取的统计数据:');
      console.log('  - dailyModelStats:', dailyModelStats, '长度:', dailyModelStats.length);
      console.log('  - monthlyModelStats:', monthlyModelStats, '长度:', monthlyModelStats.length);
      console.log('  - dailyRechargeStats:', dailyRechargeStats, '长度:', dailyRechargeStats.length);
      console.log('  - monthlyRechargeStats:', monthlyRechargeStats, '长度:', monthlyRechargeStats.length);

      // 检查是否有任何数据
      const hasAnyData = dailyStats.consumed > 0 || dailyStats.recharged > 0 || 
                         monthlyStats.consumed > 0 || monthlyStats.recharged > 0 ||
                         dailyModelStats.length > 0 || dailyRechargeStats.length > 0;
      
      console.log('🔍 数据检查结果:', {
        dailyConsumed: dailyStats.consumed,
        dailyRecharged: dailyStats.recharged,
        monthlyConsumed: monthlyStats.consumed,
        monthlyRecharged: monthlyStats.recharged,
        hasAnyData: hasAnyData
      });

      setSummaryData({
        dailyConsumed: dailyStats.consumed,
        dailyRecharged: dailyStats.recharged,
        monthlyConsumed: monthlyStats.consumed,
        monthlyRecharged: monthlyStats.recharged,
        trendData: trendData.data?.trend || [],
        dailyModelStats,
        monthlyModelStats,
        dailyRechargeStats,
        monthlyRechargeStats
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

      {/* 模型使用统计 */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-white mb-4">今日模型使用统计</h3>
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-700">
          {summaryData.dailyModelStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left text-gray-400 pb-2">模型名称</th>
                    <th className="text-right text-gray-400 pb-2">使用次数</th>
                    <th className="text-right text-gray-400 pb-2">消费积分</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.dailyModelStats.map((stat, index) => (
                    <tr key={index} className="border-b border-gray-700/50 last:border-b-0">
                      <td className="py-2 text-white">{stat.model || '未知模型'}</td>
                      <td className="py-2 text-right text-blue-400">{stat.count}</td>
                      <td className="py-2 text-right text-red-400">{stat.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">今日暂无模型使用记录</p>
          )}
        </div>
      </div>

      {/* 充值统计 */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-white mb-4">今日充值统计</h3>
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-700">
          {summaryData.dailyRechargeStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summaryData.dailyRechargeStats.map((stat, index) => (
                <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-white font-medium mb-1">+{stat.amount} 积分</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">充值次数:</span>
                    <span className="text-green-400">{stat.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">总积分:</span>
                    <span className="text-green-400">{stat.amount * stat.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">今日暂无充值记录</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsageSummaryCards;