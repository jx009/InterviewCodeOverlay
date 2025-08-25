import { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { configApi, clientCreditsApi, inviteApi } from '../services/api';
import { UrlUtils } from '../utils/urlUtils';
import { Pagination } from '../components/shared/Pagination';

interface UserConfig {
  aiModel: string;
  programmingModel?: string;
  multipleChoiceModel?: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  shortcuts: {
    takeScreenshot: string;
    openQueue: string;
    openSettings: string;
  };
  display: {
    opacity: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    autoHide: boolean;
    hideDelay: number;
  };
  processing: {
    autoProcess: boolean;
    saveScreenshots: boolean;
    compressionLevel: number;
  };
}

// 积分交易记录类型
interface PointTransaction {
  id: number;
  transactionType: 'RECHARGE' | 'DEDUCT' | 'CONSUME' | 'REFUND' | 'REWARD' | 'INVITE_REWARD';
  amount: number;
  balanceAfter: number;
  modelName?: string;
  questionType?: string;
  description?: string;
  displayText?: string; // 🆕 后端格式化的显示文本
  createdAt: string;
}

// 邀请相关类型
interface InviteData {
  inviteCode: string;
  inviteUrl: string;
  userId: number;
}

interface InviteRegistration {
  id: number;
  email: string;
  username: string;
  createdAt: string;
}

interface InviteRecharge {
  id: number;
  userId: number;
  amount: number | string; // 允许字符串类型，因为后端可能返回字符串
  createdAt: string;
  orderNo: string;
  user?: {
    email: string;
    username: string;
  };
}

// 新增邀请汇总数据类型
interface InviteSummary {
  userInfo: {
    id: number;
    username: string;
    isTrafficAgent: boolean;
  };
  pointRewards: {
    totalRewards: number;
    registerRewards: number;
    rechargeRewards: number;
  };
  commissionSummary?: {
    totalCommission: number;
    pendingCommission: number;
    paidCommission: number;
    monthlyCommission: number;
  };
}

// 佣金记录类型
interface CommissionRecord {
  id: number;
  inviteeId: number;
  inviteeUsername: string;
  inviteeEmail: string;
  rechargeAmount: number;
  commissionRate: number;
  commissionAmount: number;
  paymentOrderId: string;
  status: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuthContext()
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [aiModels, setAiModels] = useState<any[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [currentTab, setCurrentTab] = useState('config')
  // 添加积分余额状态
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [creditLoading, setCreditLoading] = useState(false)
  // 添加积分交易记录状态
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize] = useState(10)
  const maxPages = 100

  // 邀请功能状态
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  // 邀请记录状态
  const [inviteDetailTab, setInviteDetailTab] = useState<'overview' | 'registrations' | 'recharges' | 'commissions'>('overview')
  const [registrations, setRegistrations] = useState<InviteRegistration[]>([])
  const [recharges, setRecharges] = useState<InviteRecharge[]>([])
  const [registrationsLoading, setRegistrationsLoading] = useState(false)
  const [rechargesLoading, setRechargesLoading] = useState(false)
  const [registrationsPage, setRegistrationsPage] = useState(1)
  const [rechargesPage, setRechargesPage] = useState(1)
  const [registrationsTotalPages, setRegistrationsTotalPages] = useState(1)
  const [rechargesTotalPages, setRechargesTotalPages] = useState(1)
  const [registrationsPageSize, setRegistrationsPageSize] = useState(10)
  const [rechargesPageSize, setRechargesPageSize] = useState(10)
  const [registrationsTotal, setRegistrationsTotal] = useState(0)
  const [rechargesTotal, setRechargesTotal] = useState(0)

  // 筛选状态
  const [inviteFilters, setInviteFilters] = useState(() => {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    return {
      startDate: oneMonthAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      email: ''
    };
  })
  const [inviteStats, setInviteStats] = useState({
    totalInvitedUsers: 0,
    totalRechargeUsers: 0,
    totalRechargeAmount: 0,
    totalRechargeCount: 0
  })

  // 新增：邀请汇总数据状态
  const [inviteSummary, setInviteSummary] = useState<InviteSummary | null>(null)
  const [inviteSummaryLoading, setInviteSummaryLoading] = useState(false)

  // 新增：佣金记录状态（仅流量手）
  const [commissionRecords, setCommissionRecords] = useState<CommissionRecord[]>([])
  const [commissionLoading, setCommissionLoading] = useState(false)
  const [commissionPage, setCommissionPage] = useState(1)
  const [commissionTotalPages, setCommissionTotalPages] = useState(1)
  const [commissionPageSize] = useState(10)


  // 检查认证状态，与ProtectedRoute保持一致
  const hasSessionId = !!localStorage.getItem('sessionId');
  const hasValidSession = isAuthenticated || hasSessionId;

  useEffect(() => {
    // 只有在认证状态明确且不在加载中时才加载数据
    if (!authLoading && hasValidSession) {
      console.log('🔄 ProfilePage: 开始加载初始数据');
      loadInitialData()
      loadCreditBalance()
    } else {
      console.log('⏳ ProfilePage: 等待认证状态确认', { authLoading, hasValidSession });
    }
  }, [authLoading, hasValidSession])

  // 加载积分交易记录
  useEffect(() => {
    if (currentTab === 'history' && hasValidSession) {
      loadTransactionHistory(1); // 默认加载第一页
    }
  }, [currentTab, hasValidSession]);

  // 加载邀请数据
  useEffect(() => {
    if (currentTab === 'invite' && hasValidSession) {
      loadInviteData();
      loadInviteSummary(); // 加载新的邀请汇总数据
    }
  }, [currentTab, hasValidSession]);

  // 加载邀请详细记录（应用默认筛选）
  useEffect(() => {
    if (currentTab === 'invite' && hasValidSession && inviteSummary) {
      console.log('🎯 加载邀请数据，使用默认筛选:', inviteFilters);
      if (inviteDetailTab === 'overview') {
        loadInviteStats(inviteFilters);
      } else if (inviteDetailTab === 'registrations') {
        loadInviteRegistrations(1, inviteFilters);
      } else if (inviteDetailTab === 'recharges') {
        loadInviteRecharges(1, inviteFilters);
      } else if (inviteDetailTab === 'commissions' && inviteSummary?.userInfo.isTrafficAgent) {
        loadCommissionRecords(1);
      }
    }
  }, [currentTab, hasValidSession, inviteDetailTab, inviteSummary]); // 注意：这里不包含inviteFilters，避免循环

  const loadInviteData = async () => {
    if (!user?.id) return;

    try {
      setInviteLoading(true);

      // 生成基于用户ID的邀请链接
      const userId = user.id;
      const inviteUrl = UrlUtils.generateInviteUrl(userId);

      setInviteData({
        inviteCode: userId.toString(),
        inviteUrl,
        userId: parseInt(userId)
      });

      console.log('✅ 邀请数据加载成功:', { userId, inviteUrl });
    } catch (error) {
      console.error('❌ 加载邀请数据失败:', error);
      setMessage('加载邀请数据失败');
    } finally {
      setInviteLoading(false);
    }
  };

  const loadInviteRegistrations = async (page: number = 1, filters?: any) => {
    if (!user?.id) return;

    try {
      setRegistrationsLoading(true);
      const params = {
        page,
        limit: registrationsPageSize,
        userId: user.id,
        ...(filters || inviteFilters)
      };
      console.log('🔍 调用邀请注册记录API，参数:', params);
      const result = await inviteApi.getInviteRegistrations(params);
      console.log('📋 邀请注册记录API返回结果:', result);

      if (result.success) {
        setRegistrations(result.data.registrations);
        setRegistrationsPage(result.data.page);
        setRegistrationsTotalPages(result.data.totalPages);
        setRegistrationsTotal(result.data.total || 0);
      }
    } catch (error) {
      console.error('❌ 加载邀请注册记录失败:', error);
      setMessage('加载邀请注册记录失败');
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const loadInviteRecharges = async (page: number = 1, filters?: any) => {
    if (!user?.id) return;

    try {
      setRechargesLoading(true);
      const params = {
        page,
        limit: rechargesPageSize,
        userId: user.id,
        ...(filters || inviteFilters)
      };
      console.log('🔍 调用邀请充值记录API，参数:', params);
      const result = await inviteApi.getInviteRecharges(params);
      console.log('💰 邀请充值记录API返回结果:', result);

      if (result.success) {
        setRecharges(result.data.recharges);
        setRechargesPage(result.data.page);
        setRechargesTotalPages(result.data.totalPages);
        setRechargesTotal(result.data.total || 0);
      }
    } catch (error) {
      console.error('❌ 加载邀请充值记录失败:', error);
      setMessage('加载邀请充值记录失败');
    } finally {
      setRechargesLoading(false);
    }
  };

  const loadInviteStats = async (filters?: any) => {
    if (!user?.id) return;

    try {
      const params = {
        userId: user.id,
        ...(filters || inviteFilters)
      };
      console.log('🔍 调用邀请统计API，参数:', params);
      const result = await inviteApi.getInviteStats(params);
      console.log('📊 邀请统计API返回结果:', result);

      if (result.success) {
        // 确保所有数值都是有效的数字
        const stats = {
          totalInvitedUsers: Number(result.data.totalInvitedUsers) || 0,
          totalRechargeUsers: Number(result.data.totalRechargeUsers) || 0,
          totalRechargeAmount: Number(result.data.totalRechargeAmount) || 0,
          totalRechargeCount: Number(result.data.totalRechargeCount) || 0
        };
        console.log('📊 处理后的统计数据:', stats);
        setInviteStats(stats);
      }
    } catch (error) {
      console.error('❌ 加载邀请统计失败:', error);
      setMessage('加载邀请统计失败');
    }
  };

  // 加载邀请汇总数据
  const loadInviteSummary = async () => {
    try {
      setInviteSummaryLoading(true);
      console.log('🔍 调用邀请汇总API...');
      const result = await inviteApi.getInviteSummary();
      console.log('📊 邀请汇总API返回结果:', result);

      if (result.success) {
        setInviteSummary(result.data);
        console.log('✅ 邀请汇总数据加载成功:', {
          isTrafficAgent: result.data.userInfo.isTrafficAgent,
          totalRewards: result.data.pointRewards.totalRewards
        });
      }
    } catch (error) {
      console.error('❌ 加载邀请汇总数据失败:', error);
      setMessage('加载邀请汇总数据失败');
    } finally {
      setInviteSummaryLoading(false);
    }
  };

  // 加载佣金记录（仅流量手）
  const loadCommissionRecords = async (page: number = 1) => {
    if (!user?.id) return;

    try {
      setCommissionLoading(true);
      const params = {
        page,
        limit: commissionPageSize,
        userId: user.id
      };
      console.log('🔍 调用佣金记录API，参数:', params);
      const result = await inviteApi.getCommissionRecords(params);
      console.log('💰 佣金记录API返回结果:', result);

      if (result.success) {
        setCommissionRecords(result.data.records);
        setCommissionPage(result.data.page);
        setCommissionTotalPages(result.data.totalPages);
      }
    } catch (error) {
      console.error('❌ 加载佣金记录失败:', error);
      setMessage('加载佣金记录失败');
    } finally {
      setCommissionLoading(false);
    }
  };

  // 处理筛选
  const handleInviteFilter = () => {
    console.log('🔍 确认筛选被点击，当前筛选条件:', inviteFilters);

    // 验证日期格式
    if (inviteFilters.startDate && inviteFilters.endDate) {
      const startDate = new Date(inviteFilters.startDate);
      const endDate = new Date(inviteFilters.endDate);
      if (startDate > endDate) {
        setMessage('开始日期不能晚于结束日期');
        return;
      }
    }

    // 重置页码
    setRegistrationsPage(1);
    setRechargesPage(1);

    // 重新加载数据
    loadInviteStats(inviteFilters);
    if (inviteDetailTab === 'registrations') {
      loadInviteRegistrations(1, inviteFilters);
    } else if (inviteDetailTab === 'recharges') {
      loadInviteRecharges(1, inviteFilters);
    }
  };

  // 处理注册明细页面大小变化
  const handleRegistrationsPageSizeChange = (newSize: number) => {
    setRegistrationsPageSize(newSize);
    setRegistrationsPage(1);
    loadInviteRegistrations(1, inviteFilters);
  };

  // 处理充值明细页面大小变化
  const handleRechargesPageSizeChange = (newSize: number) => {
    setRechargesPageSize(newSize);
    setRechargesPage(1);
    loadInviteRecharges(1, inviteFilters);
  };

  // 重置筛选
  const handleResetInviteFilter = () => {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const defaultFilters = {
      startDate: oneMonthAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      email: ''
    };

    setInviteFilters(defaultFilters);

    // 重置页码
    setRegistrationsPage(1);
    setRechargesPage(1);

    // 重新加载数据
    loadInviteStats(defaultFilters);
    if (inviteDetailTab === 'registrations') {
      loadInviteRegistrations(1, defaultFilters);
    } else if (inviteDetailTab === 'recharges') {
      loadInviteRecharges(1, defaultFilters);
    }
  };

  const copyInviteUrl = async () => {
    if (!inviteData?.inviteUrl) {
      console.error('❌ 邀请链接不存在');
      setMessage('邀请链接不存在');
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteData.inviteUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      console.log('✅ 邀请链接已复制到剪贴板:', inviteData.inviteUrl);
    } catch (error) {
      console.error('❌ 现代API复制失败，尝试备用方案:', error);
      try {
        // 备用方案：选择文本
        const textArea = document.createElement('textarea');
        textArea.value = inviteData.inviteUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (result) {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
          console.log('✅ 使用备用方案复制成功');
        } else {
          throw new Error('备用复制方案也失败');
        }
      } catch (fallbackError) {
        console.error('❌ 备用复制方案也失败:', fallbackError);
        setMessage('复制失败，请手动复制链接');
      }
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadTransactionHistory = async (page: number = 1) => {
    try {
      setTransactionsLoading(true);
      // 🆕 使用新的客户端API，支持分页
      const offset = (page - 1) * pageSize;
      const result = await clientCreditsApi.getTransactions({
        limit: pageSize,
        offset
      });

      // 转换数据格式以兼容现有组件
      const formattedTransactions = (result.data?.transactions || []).map((tx: any) => ({
        id: tx.id,
        transactionType: tx.type === 'CONSUME' ? 'DEDUCT' : tx.type, // 兼容现有类型
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        modelName: tx.modelName,
        questionType: tx.questionType,
        description: tx.description,
        displayText: tx.displayText, // 使用后端格式化的显示文本
        createdAt: tx.createdAt
      }));

      setTransactions(formattedTransactions);

      // 使用后端返回的分页信息
      const pagination = result.data?.pagination;
      if (pagination) {
        setTotalPages(Math.min(pagination.totalPages || 1, maxPages));
        setCurrentPage(pagination.currentPage || page);
      } else {
        // 兜底逻辑：如果没有分页信息，使用原来的估算方式
        if (formattedTransactions.length === pageSize) {
          setTotalPages(Math.min(page + 1, maxPages));
        } else {
          setTotalPages(page);
        }
        setCurrentPage(page);
      }

      // 加载交易记录后刷新积分余额
      loadCreditBalance();
    } catch (error) {
      console.error('加载交易记录失败:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const loadCreditBalance = async () => {
    try {
      setCreditLoading(true)
      console.log('🔄 开始加载积分余额...')
      const result = await clientCreditsApi.getBalance()
      console.log('📊 积分余额API响应:', result)
      if (result.success && result.data) {
        setCreditBalance(result.data.credits)
        console.log('✅ 积分余额加载成功:', result.data.credits)
      } else {
        console.warn('⚠️ 积分余额API返回格式异常:', result)
      }
    } catch (error) {
      console.error('❌ 加载积分余额失败:', error)
      setMessage('加载积分余额失败')
    } finally {
      setCreditLoading(false)
    }
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)

      // 首先设置默认的模型数据
      const defaultModels = [
        { id: 1, name: 'claude-sonnet-4-20250514', displayName: 'claude4', provider: 'anthropic', description: '最新版Claude，综合能力出色' },
        { id: 2, name: 'gpt-5-mini', displayName: 'gpt-5', provider: 'openai', description: 'GPT-5迷你版本' },
        { id: 3, name: 'gpt-4o', displayName: 'gpt4o', provider: 'openai', description: '最新的GPT-4o模型，适合复杂编程任务' },
        { id: 4, name: 'o4-mini-high-all', displayName: 'o4-mini-high', provider: 'openai', description: 'OpenAI的高性能迷你模型' },
      ]

      const defaultLanguages = ['python', 'javascript', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'typescript', 'kotlin', 'swift', 'php', 'ruby', 'scala', 'shell', 'makefile', 'verilog']

      // 首先设置默认数据
      setAiModels(defaultModels)
      setLanguages(defaultLanguages)

      // 尝试获取配置和更新的数据
      try {
        const [configData, modelsData, languagesData] = await Promise.all([
          configApi.getConfig().catch(() => null),
          configApi.getAIModels().catch(() => null),
          configApi.getLanguages().catch(() => null)
        ])

        if (configData) {
          setConfig(configData)
        } else {
          // 如果配置获取失败，使用默认配置
          setConfig({
            aiModel: 'claude-sonnet-4-20250514',
            programmingModel: 'claude-sonnet-4-20250514',
            multipleChoiceModel: 'claude-sonnet-4-20250514',
            language: 'python',
            theme: 'system',
            shortcuts: {
              takeScreenshot: 'Ctrl+Shift+S',
              openQueue: 'Ctrl+Shift+Q',
              openSettings: 'Ctrl+Shift+P'
            },
            display: {
              opacity: 1,
              position: 'top-right',
              autoHide: false,
              hideDelay: 3000
            },
            processing: {
              autoProcess: false,
              saveScreenshots: true,
              compressionLevel: 0.8
            }
          })
        }

        if (modelsData && modelsData.length > 0) {
          setAiModels(modelsData)
        }

        if (languagesData && languagesData.length > 0) {
          // 转换API返回的格式 {value: 'python', label: 'Python'} 为字符串数组
          const languageValues = languagesData.map((lang: any) => lang.value || lang);
          setLanguages(languageValues)
        }
      } catch (apiError) {
        console.error('API调用失败，使用默认数据:', apiError)
        // 已经设置了默认数据，所以不需要额外处理
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
      setMessage('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/'
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  const isAdmin = user?.role === 'ADMIN'

  const handleNavigateToManager = () => {
    window.location.href = '/manager';
  }

  const handleNavigateToRecharge = () => {
    window.location.href = '/recharge';
  }

  const handleConfigChange = (key: string, value: any) => {
    if (config) {
      setConfig({
        ...config,
        [key]: value
      })
    }
  }

  const handleNestedConfigChange = (section: string, key: string, value: any) => {
    if (config) {
      const currentSection = config[section as keyof UserConfig] as any
      setConfig({
        ...config,
        [section]: {
          ...currentSection,
          [key]: value
        }
      })
    }
  }

  const handleSaveConfig = async () => {
    if (!config) return

    try {
      setSaving(true)
      await configApi.updateConfig(config)
      setMessage('配置保存成功！')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('保存配置失败:', error)
      setMessage('保存配置失败')
    } finally {
      setSaving(false)
    }
  }

  // 格式化交易类型
  const formatTransactionType = (transaction: PointTransaction) => {
    switch (transaction.transactionType) {
      case 'RECHARGE':
        return '充值';
      case 'CONSUME':
      case 'DEDUCT':
        if (transaction.questionType === 'MULTIPLE_CHOICE') {
          return '选择题搜题';
        } else if (transaction.questionType === 'PROGRAMMING') {
          return '编程题搜题';
        }
        return '消费';
      case 'REFUND':
        return '退款';
      case 'REWARD':
        return '积分补偿';
      case 'INVITE_REWARD':
        return '邀请';
      default:
        return transaction.transactionType;
    }
  };

  // 格式化交易日期
  const formatTransactionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 格式化模型名称显示
  const formatModelName = (modelName: string) => {
    const modelDisplayMap: Record<string, string> = {
      'gpt-5-mini': 'gpt-5',
      'claude-sonnet-4-20250514': 'claude4',
      'o4-mini-high-all': 'o4-mini-high',
      'gpt-4o': 'gpt4o'
    };
    return modelDisplayMap[modelName] || modelName;
  };

  if (!hasValidSession) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-center">
            <h2 className="text-2xl font-bold mb-4">未登录</h2>
            <p>请先登录</p>
          </div>
        </div>
    )
  }

  if (loading) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>加载中...</p>
          </div>
        </div>
    )
  }

  return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">欢迎，{user?.username || '用户'}！</h1>
              <p className="text-gray-400 mb-2">{user?.email || ''}</p>
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm">积分余额:</span>
                {creditLoading ? (
                    <div className="flex items-center gap-1">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                      <span className="text-gray-400 text-sm">加载中...</span>
                    </div>
                ) : (
                    <span className="text-blue-400 font-semibold text-lg">
                  {creditBalance !== null ? creditBalance : '未知'}
                </span>
                )}
                <button
                    onClick={loadCreditBalance}
                    disabled={creditLoading}
                    className="ml-2 p-1 text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                    title="刷新积分余额"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              {isAdmin && (
                  <button
                      onClick={handleNavigateToManager}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                      <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    积分配置管理
                  </button>
              )}
              <button
                  onClick={handleNavigateToRecharge}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                  <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
                积分充值
              </button>
              <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                退出登录
              </button>
            </div>
          </div>

          {message && (
              <div className={`p-4 rounded-lg mb-6 ${
                  message.includes('成功') ? 'bg-green-600' : 'bg-red-600'
              }`}>
                {message}
              </div>
          )}

          <div className="flex border-b border-gray-700 mb-6">
            <button
                onClick={() => setCurrentTab('config')}
                className={`px-4 py-2 font-medium transition-colors ${
                    currentTab === 'config'
                        ? 'text-blue-400 border-b-2 border-blue-400 bg-gradient-to-r from-blue-600/20 to-indigo-600/20'
                        : 'text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-blue-600/10 hover:to-indigo-600/10'
                }`}
            >
              个人配置
            </button>
            <button
                onClick={() => setCurrentTab('history')}
                className={`px-4 py-2 font-medium transition-colors ${
                    currentTab === 'history'
                        ? 'text-orange-400 border-b-2 border-orange-400 bg-gradient-to-r from-orange-600/20 to-amber-600/20'
                        : 'text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-orange-600/10 hover:to-amber-600/10'
                }`}
            >
              历史记录
            </button>
            <button
                onClick={() => setCurrentTab('invite')}
                className={`px-4 py-2 font-medium transition-colors ${
                    currentTab === 'invite'
                        ? 'text-green-400 border-b-2 border-green-400 bg-gradient-to-r from-green-600/20 to-emerald-600/20'
                        : 'text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-green-600/10 hover:to-emerald-600/10'
                }`}
            >
              邀请管理
            </button>
          </div>

          {currentTab === 'config' && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">🤖 AI模型配置</h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">编程题模型</label>
                      <select
                          value={config?.programmingModel || config?.aiModel || ''}
                          onChange={(e) => handleConfigChange('programmingModel', e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      >
                        {aiModels.map((model) => (
                            <option key={model.id} value={model.name}>
                              {model.displayName || model.name}
                            </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-400 mt-1">用于代码生成和算法分析</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">选择题模型</label>
                      <select
                          value={config?.multipleChoiceModel || config?.aiModel || ''}
                          onChange={(e) => handleConfigChange('multipleChoiceModel', e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      >
                        {aiModels.map((model) => (
                            <option key={model.id} value={model.name}>
                              {model.displayName || model.name}
                            </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-400 mt-1">用于选择题识别和分析</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">首选编程语言</label>
                      <select
                          value={config?.language || ''}
                          onChange={(e) => handleConfigChange('language', e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      >
                        {languages.map((lang) => {
                          // 语言显示名称映射
                          const languageLabels: Record<string, string> = {
                            'python': 'Python',
                            'javascript': 'JavaScript',
                            'java': 'Java',
                            'cpp': 'C++',
                            'c': 'C',
                            'csharp': 'C#',
                            'go': 'Go',
                            'rust': 'Rust',
                            'typescript': 'TypeScript',
                            'kotlin': 'Kotlin',
                            'swift': 'Swift',
                            'php': 'PHP',
                            'ruby': 'Ruby',
                            'scala': 'Scala',
                            'shell': 'Shell',
                            'makefile': 'Makefile',
                            'verilog': 'Verilog'
                          };
                          
                          return (
                            <option key={lang} value={lang}>
                              {languageLabels[lang] || lang.charAt(0).toUpperCase() + lang.slice(1)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                        onClick={handleSaveConfig}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-2 rounded-lg transition-colors"
                    >
                      {saving ? '保存中...' : '保存配置'}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">🤖 AI模型介绍</h2>
                  <p className="text-gray-300 mb-6">首选推荐使用claude4和GPT5模型，适合编程题和选择题</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* claude4 - 推荐 */}
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 ring-2 ring-yellow-500">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-white">claude4</h3>
                        <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold">推荐</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">均衡型AI助手，在编程和逻辑推理方面表现优异</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-green-400">🎯 均衡</span>
                      </div>
                      <div className="bg-gray-600 rounded-lg p-3 border-l-4 border-blue-400">
                        <div className="text-sm font-bold text-white mb-1">积分消耗</div>
                        <div className="text-blue-400 font-semibold">选择题：8积分 | 编程题：12积分</div>
                      </div>
                    </div>

                    {/* GPT5 - 推荐 */}
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 ring-2 ring-yellow-500">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-white">GPT5</h3>
                        <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold">推荐</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">GPT-5迷你版本，性价比高，适合日常使用</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-orange-400">⚡ 高效</span>
                      </div>
                      <div className="bg-gray-600 rounded-lg p-3 border-l-4 border-blue-400">
                        <div className="text-sm font-bold text-white mb-1">积分消耗</div>
                        <div className="text-blue-400 font-semibold">选择题：20分 | 编程题：40分</div>
                      </div>
                    </div>

                    {/* gpt4o */}
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <h3 className="text-lg font-semibold text-white mb-2">gpt4o</h3>
                      <p className="text-sm text-gray-300 mb-3">全能型语言模型，在文本理解和知识问答方面见长</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-400">🧠 全能</span>
                      </div>
                      <div className="bg-gray-600 rounded-lg p-3 border-l-4 border-green-400">
                        <div className="text-sm font-bold text-white mb-1">积分消耗</div>
                        <div className="text-green-400 font-semibold">选择题：6积分 | 编程题：10积分</div>
                      </div>
                    </div>

                    {/* o4-mini-high */}
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <h3 className="text-lg font-semibold text-white mb-2">o4-mini-high</h3>
                      <p className="text-sm text-gray-300 mb-3">高级推理引擎，逻辑能力卓越，适合复杂问题求解</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-400">🚀 高级</span>
                      </div>
                      <div className="bg-gray-600 rounded-lg p-3 border-l-4 border-red-400">
                        <div className="text-sm font-bold text-white mb-1">积分消耗</div>
                        <div className="text-red-400 font-semibold">选择题：100分 | 编程题：150分</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {currentTab === 'history' && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">📊 积分消费历史</h2>

                {transactionsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                ) : transactions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            类型
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            积分变动
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            剩余积分
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            使用模型
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            时间
                          </th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                        {transactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-700">
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              ['RECHARGE', 'REFUND', 'REWARD', 'INVITE_REWARD'].includes(transaction.transactionType)
                                  ? 'bg-green-600 text-green-100'
                                  : 'bg-red-600 text-red-100'
                          }`}>
                            {formatTransactionType(transaction)}
                          </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={['RECHARGE', 'REFUND', 'REWARD', 'INVITE_REWARD'].includes(transaction.transactionType) ? 'text-green-400' : 'text-red-400'}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                          </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {transaction.balanceAfter}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                {transaction.modelName ? formatModelName(transaction.modelName) : '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                {formatTransactionDate(transaction.createdAt)}
                              </td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p>暂无交易记录</p>
                    </div>
                )}

                {/* 🆕 分页控件 */}
                {transactions.length > 0 && (
                    <div className="flex justify-between items-center mt-6">
                      <div className="text-sm text-gray-400">
                        第 {currentPage} 页，每页 {pageSize} 条记录
                      </div>
                      <div className="flex gap-2">
                        <button
                            onClick={() => loadTransactionHistory(1)}
                            disabled={currentPage === 1 || transactionsLoading}
                            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                        >
                          首页
                        </button>
                        <button
                            onClick={() => loadTransactionHistory(currentPage - 1)}
                            disabled={currentPage === 1 || transactionsLoading}
                            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                        >
                          上一页
                        </button>
                        <span className="px-3 py-1 text-sm bg-blue-600 rounded">
                    {currentPage}
                  </span>
                        <button
                            onClick={() => loadTransactionHistory(currentPage + 1)}
                            disabled={currentPage >= totalPages || transactionsLoading}
                            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                        >
                          下一页
                        </button>
                        <button
                            onClick={() => loadTransactionHistory(Math.min(totalPages, maxPages))}
                            disabled={currentPage >= totalPages || transactionsLoading}
                            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                        >
                          末页
                        </button>
                      </div>
                    </div>
                )}
              </div>
          )}

          {currentTab === 'invite' && (
              <div className="space-y-6">

                {/* 积分奖励和邀请链接 */}
                {inviteSummary && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* 积分奖励汇总 - 窄一点的宽度 */}
                    <div className="lg:col-span-1 bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-600 rounded-lg p-2">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">积分奖励</h3>
                          <p className="text-blue-200 text-sm">累计获得积分奖励</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-blue-200 text-sm">注册奖励:</span>
                          <span className="text-white font-medium">{inviteSummary.pointRewards.registerRewards}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-200 text-sm">充值奖励:</span>
                          <span className="text-white font-medium">{inviteSummary.pointRewards.rechargeRewards}</span>
                        </div>
                        <div className="border-t border-blue-700 pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-blue-100 font-medium">总计:</span>
                            <span className="text-blue-300 font-bold text-lg">{inviteSummary.pointRewards.totalRewards}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 邀请链接生成 - 宽一点的宽度 */}
                    <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
                      <h2 className="text-lg font-semibold mb-4">🔗 邀请链接</h2>

                      {inviteLoading ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          </div>
                      ) : inviteData ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">邀请码</label>
                              <div className="bg-gray-700 rounded-lg p-2">
                                <code className="text-green-400 text-sm">{inviteData.inviteCode}</code>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">邀请链接</label>
                              <div className="bg-gray-700 rounded-lg p-2 break-all">
                                <code className="text-blue-400 text-xs">{inviteData.inviteUrl}</code>
                              </div>
                            </div>
                            <button
                                onClick={copyInviteUrl}
                                className={`w-full px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                                    copySuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              {copySuccess ? '已复制' : '复制链接'}
                            </button>
                          </div>
                      ) : (
                          <div className="text-center py-6 text-gray-400">
                            <p className="text-sm">暂无数据</p>
                          </div>
                      )}
                    </div>

                    {/* 现金佣金汇总（仅流量手） */}
                    {inviteSummary.userInfo.isTrafficAgent && inviteSummary.commissionSummary && (
                      <div className="lg:col-span-3 bg-gradient-to-br from-green-800 to-green-900 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-green-600 rounded-lg p-2">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">现金佣金</h3>
                            <p className="text-green-200 text-sm">流量手专属现金收益</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex justify-between">
                            <span className="text-green-200 text-sm">本月佣金:</span>
                            <span className="text-white font-medium">¥{inviteSummary.commissionSummary.monthlyCommission.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-200 text-sm">待结算:</span>
                            <span className="text-white font-medium">¥{inviteSummary.commissionSummary.pendingCommission.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-100 font-medium">总佣金:</span>
                            <span className="text-green-300 font-bold text-lg">¥{inviteSummary.commissionSummary.totalCommission.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* 邀请记录详情 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">📊 邀请记录详情</h3>

                  {/* 子标签页 */}
                  <div className="flex border-b border-gray-700 mb-4">
                    <button
                        onClick={() => setInviteDetailTab('overview')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            inviteDetailTab === 'overview'
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      总览
                    </button>
                    <button
                        onClick={() => setInviteDetailTab('registrations')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            inviteDetailTab === 'registrations'
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      注册明细
                    </button>
                    <button
                        onClick={() => setInviteDetailTab('recharges')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            inviteDetailTab === 'recharges'
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      充值明细
                    </button>
                    {/* 佣金记录标签页（仅流量手可见） */}
                    {inviteSummary?.userInfo.isTrafficAgent && (
                      <button
                          onClick={() => setInviteDetailTab('commissions')}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                              inviteDetailTab === 'commissions'
                                  ? 'text-green-400 border-b-2 border-green-400'
                                  : 'text-gray-400 hover:text-white'
                          }`}
                      >
                        💰 佣金记录
                      </button>
                    )}
                  </div>

                  {/* 筛选条件 */}
                  <div className="bg-gray-700 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">🔍 筛选条件</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">开始日期</label>
                        <input
                            type="date"
                            value={inviteFilters.startDate}
                            onChange={(e) => setInviteFilters({...inviteFilters, startDate: e.target.value})}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">结束日期</label>
                        <input
                            type="date"
                            value={inviteFilters.endDate}
                            onChange={(e) => setInviteFilters({...inviteFilters, endDate: e.target.value})}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        />
                      </div>
                      {(inviteDetailTab === 'registrations' || inviteDetailTab === 'recharges') && (
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">邮箱搜索</label>
                            <input
                                type="email"
                                value={inviteFilters.email}
                                onChange={(e) => setInviteFilters({...inviteFilters, email: e.target.value})}
                                placeholder="输入邮箱进行搜索"
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm placeholder-gray-400"
                            />
                          </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                          onClick={handleInviteFilter}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                      >
                        确认筛选
                      </button>
                      <button
                          onClick={handleResetInviteFilter}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm font-medium transition-colors"
                      >
                        重置筛选
                      </button>
                    </div>
                  </div>

                  {/* 总览内容 */}
                  {inviteDetailTab === 'overview' && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-2xl font-bold text-green-400">{inviteStats.totalInvitedUsers || 0}</div>
                          <div className="text-sm text-gray-400">成功邀请注册</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-2xl font-bold text-blue-400">{inviteStats.totalRechargeUsers || 0}</div>
                          <div className="text-sm text-gray-400">充值用户数</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-2xl font-bold text-purple-400">{inviteStats.totalRechargeCount || 0}</div>
                          <div className="text-sm text-gray-400">总充值次数</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-2xl font-bold text-yellow-400">
                            ¥{(inviteStats.totalRechargeAmount || 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-400">累计充值金额</div>
                        </div>
                      </div>
                  )}

                  {/* 注册明细 */}
                  {inviteDetailTab === 'registrations' && (
                      <div>
                        {registrationsLoading ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                              {registrations.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead className="bg-gray-700">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">用户ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">邮箱</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">用户名</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">注册时间</th>
                                      </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-700">
                                      {registrations.map((registration) => (
                                          <tr key={registration.id} className="hover:bg-gray-700">
                                            <td className="px-4 py-3 text-sm">{registration.id}</td>
                                            <td className="px-4 py-3 text-sm">{registration.email}</td>
                                            <td className="px-4 py-3 text-sm">{registration.username}</td>
                                            <td className="px-4 py-3 text-sm">{formatDateTime(registration.createdAt)}</td>
                                          </tr>
                                      ))}
                                      </tbody>
                                    </table>
                                  </div>
                              ) : (
                                  <div className="text-center py-8 text-gray-400">
                                    <p>暂无注册记录</p>
                                  </div>
                              )}

                              {/* 注册记录分页 - 始终显示 */}
                              <Pagination
                                  currentPage={registrationsPage}
                                  totalPages={registrationsTotalPages}
                                  pageSize={registrationsPageSize}
                                  totalItems={registrationsTotal}
                                  onPageChange={(page) => loadInviteRegistrations(page, inviteFilters)}
                                  onPageSizeChange={handleRegistrationsPageSizeChange}
                                  loading={registrationsLoading}
                                  className="mt-4"
                              />
                            </div>
                        )}
                      </div>
                  )}

                  {/* 充值明细 */}
                  {inviteDetailTab === 'recharges' && (
                      <div>
                        {rechargesLoading ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                              {recharges.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead className="bg-gray-700">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">用户ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">邮箱</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">用户名</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">充值金额</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">充值时间</th>
                                      </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-700">
                                      {recharges.map((recharge) => (
                                          <tr key={recharge.id} className="hover:bg-gray-700">
                                            <td className="px-4 py-3 text-sm">{recharge.userId}</td>
                                            <td className="px-4 py-3 text-sm">{recharge.user?.email || '-'}</td>
                                            <td className="px-4 py-3 text-sm">{recharge.user?.username || '-'}</td>
                                            <td className="px-4 py-3 text-sm">
                                              <span className="text-green-400 font-medium">¥{(typeof recharge.amount === 'string' ? parseFloat(recharge.amount) : recharge.amount).toFixed(2)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">{formatDateTime(recharge.createdAt)}</td>
                                          </tr>
                                      ))}
                                      </tbody>
                                    </table>
                                  </div>
                              ) : (
                                  <div className="text-center py-8 text-gray-400">
                                    <p>暂无充值记录</p>
                                  </div>
                              )}

                              {/* 充值记录分页 - 始终显示 */}
                              <Pagination
                                  currentPage={rechargesPage}
                                  totalPages={rechargesTotalPages}
                                  pageSize={rechargesPageSize}
                                  totalItems={rechargesTotal}
                                  onPageChange={(page) => loadInviteRecharges(page, inviteFilters)}
                                  onPageSizeChange={handleRechargesPageSizeChange}
                                  loading={rechargesLoading}
                                  className="mt-4"
                              />
                            </div>
                        )}
                      </div>
                  )}

                  {/* 佣金记录（仅流量手） */}
                  {inviteDetailTab === 'commissions' && inviteSummary?.userInfo.isTrafficAgent && (
                      <div>
                        {commissionLoading ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                              {/* 佣金汇总信息 */}
                              {inviteSummary.commissionSummary && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                  <div className="bg-green-700 rounded-lg p-3">
                                    <div className="text-green-200 text-sm">总佣金</div>
                                    <div className="text-white font-bold text-lg">
                                      ¥{inviteSummary.commissionSummary.totalCommission.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="bg-yellow-700 rounded-lg p-3">
                                    <div className="text-yellow-200 text-sm">本月佣金</div>
                                    <div className="text-white font-bold text-lg">
                                      ¥{inviteSummary.commissionSummary.monthlyCommission.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="bg-orange-700 rounded-lg p-3">
                                    <div className="text-orange-200 text-sm">待结算</div>
                                    <div className="text-white font-bold text-lg">
                                      ¥{inviteSummary.commissionSummary.pendingCommission.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="bg-blue-700 rounded-lg p-3">
                                    <div className="text-blue-200 text-sm">已结算</div>
                                    <div className="text-white font-bold text-lg">
                                      ¥{inviteSummary.commissionSummary.paidCommission.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {commissionRecords.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead className="bg-gray-700">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">被邀请用户</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">充值金额</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">佣金比例</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">佣金金额</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">状态</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">时间</th>
                                      </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-700">
                                      {commissionRecords.map((record) => (
                                          <tr key={record.id} className="hover:bg-gray-700">
                                            <td className="px-4 py-3 text-sm">
                                              <div>
                                                <div className="font-medium">{record.inviteeUsername}</div>
                                                <div className="text-gray-400 text-xs">{record.inviteeEmail}</div>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                              <span className="text-blue-400 font-medium">¥{record.rechargeAmount.toFixed(2)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                              {(record.commissionRate * 100).toFixed(1)}%
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                              <span className="text-green-400 font-medium">¥{record.commissionAmount.toFixed(2)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                record.status === 'PAID' 
                                                  ? 'bg-green-600 text-green-100' 
                                                  : record.status === 'PENDING'
                                                  ? 'bg-yellow-600 text-yellow-100'
                                                  : 'bg-gray-600 text-gray-100'
                                              }`}>
                                                {record.status === 'PAID' ? '已结算' : record.status === 'PENDING' ? '待结算' : '已取消'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-300">
                                              {formatDateTime(record.createdAt)}
                                            </td>
                                          </tr>
                                      ))}
                                      </tbody>
                                    </table>
                                  </div>
                              ) : (
                                  <div className="text-center py-8 text-gray-400">
                                    <div className="text-gray-500 mb-2">
                                      <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                                      </svg>
                                    </div>
                                    <p>暂无佣金记录</p>
                                    <p className="text-sm mt-1">当被邀请用户充值时，您将获得现金佣金</p>
                                  </div>
                              )}

                              {/* 佣金记录分页 */}
                              {commissionRecords.length > 0 && (
                                <div className="flex justify-between items-center mt-6">
                                  <div className="text-sm text-gray-400">
                                    第 {commissionPage} 页，共 {commissionTotalPages} 页
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                        onClick={() => loadCommissionRecords(1)}
                                        disabled={commissionPage === 1 || commissionLoading}
                                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                                    >
                                      首页
                                    </button>
                                    <button
                                        onClick={() => loadCommissionRecords(commissionPage - 1)}
                                        disabled={commissionPage === 1 || commissionLoading}
                                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                                    >
                                      上一页
                                    </button>
                                    <span className="px-3 py-1 text-sm bg-green-600 rounded">
                                      {commissionPage}
                                    </span>
                                    <button
                                        onClick={() => loadCommissionRecords(commissionPage + 1)}
                                        disabled={commissionPage >= commissionTotalPages || commissionLoading}
                                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                                    >
                                      下一页
                                    </button>
                                    <button
                                        onClick={() => loadCommissionRecords(commissionTotalPages)}
                                        disabled={commissionPage >= commissionTotalPages || commissionLoading}
                                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                                    >
                                      末页
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                        )}
                      </div>
                  )}

                </div>
              </div>
          )}

        </div>
      </div>
  )
} 