import React, { useState, useEffect } from 'react';
import { inviteApi } from '../../services/api';
// import { UrlUtils } from '../../utils/urlUtils';

interface InviteRecord {
  id: number;
  inviteeId: number;
  inviteCode: string;
  status: string;
  firstRechargeAmount: number;
  commissionAmount: number;
  commissionStatus: string;
  createdAt: string;
  invitee: {
    id: number;
    username: string;
    email: string;
    createdAt: string;
  };
}

interface InviteStats {
  totalInvites: number;
  registeredInvites: number;
  activatedInvites: number;
  totalCommission: number;
  pendingCommission: number;
}

interface InviteReward {
  id: number;
  rewardType: string;
  rewardAmount: number;
  rewardPercentage?: number;
  sourceAmount?: number;
  description: string;
  status: string;
  createdAt: string;
  invitee: {
    id: number;
    username: string;
    email: string;
  };
}

export const InvitePanel: React.FC = () => {
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [, setInviteCode] = useState<string>('');
  const [records, setRecords] = useState<InviteRecord[]>([]);
  const [rewards, setRewards] = useState<InviteReward[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'records' | 'rewards'>('records');

  // 生成邀请链接
  const generateInviteUrl = async () => {
    try {
      setLoading(true);
      const response = await inviteApi.generateInviteUrl();
      
      if (response.success) {
        setInviteCode(response.data.inviteCode);
        setInviteUrl(response.data.inviteUrl);
      } else {
        alert('生成邀请链接失败: ' + response.message);
      }
    } catch (error: any) {
      console.error('生成邀请链接失败:', error);
      alert('生成邀请链接失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 复制邀请链接
  const copyInviteUrl = async () => {
    if (!inviteUrl) {
      alert('请先生成邀请链接');
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert('邀请链接已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      // 降级方案
      try {
        const textArea = document.createElement('textarea');
        textArea.value = inviteUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          alert('邀请链接已复制到剪贴板');
        } else {
          alert('复制失败，请手动复制邀请链接');
        }
      } catch (fallbackError) {
        console.error('降级复制方案也失败了:', fallbackError);
        alert('复制失败，请手动复制邀请链接');
      }
    }
  };

  // 加载邀请记录
  const loadInviteRecords = async (page: number = 1) => {
    try {
      const response = await inviteApi.getInviteRegistrations({ page, limit: 10 });
      
      if (response.success) {
        setRecords(response.data.records);
        setTotalPages(response.data.totalPages);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('加载邀请记录失败:', error);
    }
  };

  // 加载邀请奖励记录
  const loadInviteRewards = async (page: number = 1) => {
    try {
      const response = await inviteApi.getInviteRecharges({ page, limit: 10 });
      
      if (response.success) {
        setRewards(response.data.rewards);
        setTotalPages(response.data.totalPages);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('加载邀请奖励记录失败:', error);
    }
  };

  // 加载邀请统计
  const loadInviteStats = async () => {
    try {
      const response = await inviteApi.getInviteStats();
      
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('加载邀请统计失败:', error);
    }
  };

  // 切换标签时重新加载数据
  const handleTabChange = (tab: 'records' | 'rewards') => {
    setActiveTab(tab);
    setCurrentPage(1);
    if (tab === 'records') {
      loadInviteRecords(1);
    } else {
      loadInviteRewards(1);
    }
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    if (activeTab === 'records') {
      loadInviteRecords(page);
    } else {
      loadInviteRewards(page);
    }
  };

  // 格式化状态
  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDING': '待激活',
      'REGISTERED': '已注册',
      'ACTIVATED': '已激活',
      'GRANTED': '已发放',
      'CANCELLED': '已取消'
    };
    return statusMap[status] || status;
  };

  // 格式化奖励类型
  const formatRewardType = (type: string) => {
    const typeMap: Record<string, string> = {
      'REGISTER': '注册奖励',
      'FIRST_RECHARGE': '首充佣金',
      'COMMISSION': '佣金奖励'
    };
    return typeMap[type] || type;
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    generateInviteUrl();
    loadInviteStats();
    loadInviteRecords();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">💎 邀请好友</h2>
      
      {/* 邀请链接生成 */}
      <div className="mb-6">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={inviteUrl}
            readOnly
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            placeholder={loading ? "正在生成邀请链接..." : "点击生成邀请链接"}
          />
          <button
            onClick={copyInviteUrl}
            disabled={!inviteUrl || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
          >
            复制链接
          </button>
        </div>
        <div className="text-sm text-gray-400 mb-4">
          <p>🎁 邀请奖励规则：</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>好友注册成功：获得 <span className="text-green-400 font-medium">10积分</span></li>
            <li>好友首次充值：获得 <span className="text-green-400 font-medium">5%佣金</span></li>
            <li>所有奖励将自动发放到您的账户</li>
          </ul>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.totalInvites}</div>
            <div className="text-sm text-gray-400">总邀请数</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.registeredInvites}</div>
            <div className="text-sm text-gray-400">已注册</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.activatedInvites}</div>
            <div className="text-sm text-gray-400">已激活</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">¥{stats.totalCommission.toFixed(2)}</div>
            <div className="text-sm text-gray-400">总佣金</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">¥{stats.pendingCommission.toFixed(2)}</div>
            <div className="text-sm text-gray-400">待发放</div>
          </div>
        </div>
      )}

      {/* 标签切换 */}
      <div className="flex border-b border-gray-700 mb-4">
        <button
          onClick={() => handleTabChange('records')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'records'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          邀请记录
        </button>
        <button
          onClick={() => handleTabChange('rewards')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'rewards'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          奖励记录
        </button>
      </div>

      {/* 邀请记录表格 */}
      {activeTab === 'records' && (
        <div className="overflow-x-auto">
          {records.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    用户名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    注册时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    首次充值
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    获得佣金
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800">
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-gray-700">
                    <td className="px-4 py-3 text-sm text-white">
                      {record.invitee.username}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDate(record.invitee.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        record.status === 'ACTIVATED' 
                          ? 'bg-green-100 text-green-800' 
                          : record.status === 'REGISTERED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {formatStatus(record.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      ¥{record.firstRechargeAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-400">
                      ¥{record.commissionAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-400">
              暂无邀请记录
            </div>
          )}
        </div>
      )}

      {/* 奖励记录表格 */}
      {activeTab === 'rewards' && (
        <div className="overflow-x-auto">
          {rewards.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    奖励类型
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    被邀请人
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    奖励积分
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    时间
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800">
                {rewards.map((reward) => (
                  <tr key={reward.id} className="border-b border-gray-700">
                    <td className="px-4 py-3 text-sm text-white">
                      {formatRewardType(reward.rewardType)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {reward.invitee.username}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-400">
                      {reward.rewardAmount}积分
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        reward.status === 'GRANTED' 
                          ? 'bg-green-100 text-green-800' 
                          : reward.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {formatStatus(reward.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDate(reward.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-400">
              暂无奖励记录
            </div>
          )}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-400">
            第 {currentPage} 页，共 {totalPages} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              首页
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-sm bg-blue-600 rounded">
              {currentPage}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              下一页
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              末页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 