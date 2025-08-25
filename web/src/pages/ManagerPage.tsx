import { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { User } from '../types';
import { Pagination } from '../components/shared/Pagination';
import UsageSummaryCards from '../components/Admin/UsageSummaryCards';
import APITestComponent from '../components/Admin/APITestComponent';
import { adminApi } from '../services/api';

// 使用与其他模块一致的API基础URL
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'http://quiz.playoffer.cn/api'
  : 'http://quiz.playoffer.cn/api';

interface ModelPointConfig {
  id: number;
  modelName: string;
  questionType: 'multiple_choice' | 'programming';
  cost: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface EditingConfig {
  modelName: string;
  questionType: 'multiple_choice' | 'programming';
  cost: number;
  description: string;
}

interface PaymentPackage {
  id: number;
  name: string;
  description?: string;
  amount: number;
  points: number;
  bonusPoints: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface EditingPackage {
  name: string;
  description: string;
  amount: number;
  points: number;
  bonusPoints: number;
}

interface LLMConfig {
  base_url: {
    value: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  api_key: {
    value: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

interface LLMConfigForm {
  base_url: string;
  api_key: string;
}

// 邀请配置类型
interface InviteConfig {
  id: number;
  configKey: string;
  configValue: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 流量手信息类型
interface TrafficAgent {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  points: number;
  inviteStats: {
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
  };
}

interface UsageTransaction {
  id: number;
  transaction_type: string;
  amount: number;
  balance_after: number;
  model_name?: string;
  question_type?: string;
  description?: string;
  created_at: string;
  end_time?: string;
  username: string;
  email: string;
  operationType: string;
}

interface UsageSummaryUser {
  userId: number;
  username: string;
  email: string;
  totalConsumed: number;     // 总消费积分
  totalRecharged: number;    // 总充值积分  
  totalRewarded: number;     // 总奖励积分
  programmingCount: number;  // 编程题次数
  multipleChoiceCount: number; // 选择题次数
  rechargeCount: number;     // 充值次数
  operations: {
    [key: string]: {
      count: number;
      totalAmount: number;
    };
  };
}

interface UsageFilters {
  startDate: string;
  endDate: string;
  userEmail: string;
  transactionType: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  isActive: boolean;
  priority: number;
  showStyle: string;
  startTime?: string;
  endTime?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

interface EditingAnnouncement {
  title: string;
  content: string;
  isActive: boolean;
  priority: number;
  showStyle: string;
  startTime: string;
  endTime: string;
}

interface InviteFilters {
  startDate: string;
  endDate: string;
  inviterEmail: string;
  inviteeEmail: string;
}

interface InviteRegistration {
  id: number;
  inviterEmail: string;
  inviterUsername: string;
  inviteeEmail: string;
  inviteeUsername: string;
  createdAt: string;
}

interface InviteRecharge {
  id: number;
  inviterEmail: string;
  inviterUsername: string;
  inviteeEmail: string;
  inviteeUsername: string;
  amount: number;
  createdAt: string;
}

interface InviteSummary {
  inviterId: number;
  inviterEmail: string;
  inviterUsername: string;
  totalInvitedUsers: number;
  totalRechargeUsers: number;
  totalRechargeAmount: number;
  totalRechargeCount: number;
}

export default function ManagerPage() {
  const { user, logout } = useAuthContext();
  const [configs, setConfigs] = useState<ModelPointConfig[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchEmail, setSearchEmail] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<'configs' | 'users' | 'credits' | 'invites' | 'packages' | 'usage-stats' | 'announcements' | 'llm-config'>('configs');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // LLM配置相关状态
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  const [llmConfigForm, setLlmConfigForm] = useState<LLMConfigForm>({
    base_url: '',
    api_key: ''
  });
  const [llmConfigLoading, setLlmConfigLoading] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EditingConfig>({
    modelName: '',
    questionType: 'multiple_choice',
    cost: 1,
    description: ''
  });

  // 邀请管理相关状态
  const [inviteTab, setInviteTab] = useState<'summary' | 'registrations' | 'recharges' | 'configs' | 'traffic-agents'>('summary');
  const [inviteFilters, setInviteFilters] = useState<InviteFilters>(() => {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    return {
      startDate: oneMonthAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      inviterEmail: '',
      inviteeEmail: ''
    };
  });
  const [inviteRegistrations, setInviteRegistrations] = useState<InviteRegistration[]>([]);
  const [inviteRecharges, setInviteRecharges] = useState<InviteRecharge[]>([]);
  const [inviteSummary, setInviteSummary] = useState<InviteSummary[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);

  // 邀请配置管理状态
  const [inviteConfigs, setInviteConfigs] = useState<InviteConfig[]>([]);
  const [inviteConfigsLoading, setInviteConfigsLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  // 流量手管理状态
  const [trafficAgents, setTrafficAgents] = useState<TrafficAgent[]>([]);
  const [trafficAgentsLoading, setTrafficAgentsLoading] = useState(false);
  const [settingTrafficAgent, setSettingTrafficAgent] = useState<number | null>(null);

  // 分页状态
  const [registrationsPage, setRegistrationsPage] = useState(1);
  const [rechargesPage, setRechargesPage] = useState(1);
  const [registrationsTotalPages, setRegistrationsTotalPages] = useState(1);
  const [rechargesTotalPages, setRechargesTotalPages] = useState(1);
  const [registrationsPageSize, setRegistrationsPageSize] = useState(10);
  const [rechargesPageSize, setRechargesPageSize] = useState(10);
  const [registrationsTotal, setRegistrationsTotal] = useState(0);
  const [rechargesTotal, setRechargesTotal] = useState(0);

  // 积分管理相关状态
  const [creditUsers, setCreditUsers] = useState<User[]>([]);
  const [filteredCreditUsers, setFilteredCreditUsers] = useState<User[]>([]);
  const [creditSearchEmail, setCreditSearchEmail] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [creditOperation, setCreditOperation] = useState<'add' | 'set'>('add');
  const [creditDescription, setCreditDescription] = useState<string>('');
  const [showCreditForm, setShowCreditForm] = useState(false);

  // 充值套餐管理相关状态
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<EditingPackage>({
    name: '',
    description: '',
    amount: 0,
    points: 0,
    bonusPoints: 0
  });
  const [editingPackageId, setEditingPackageId] = useState<number | null>(null);

  // 使用情况统计相关状态
  const [usageTab, setUsageTab] = useState<'details' | 'summary'>('details');
  const [usageFilters, setUsageFilters] = useState<UsageFilters>(() => {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    return {
      startDate: oneMonthAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      userEmail: '',
      transactionType: ''
    };
  });
  const [usageTransactions, setUsageTransactions] = useState<UsageTransaction[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummaryUser[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usagePage, setUsagePage] = useState(1);
  const [usageTotalPages, setUsageTotalPages] = useState(1);
  const [usagePageSize, setUsagePageSize] = useState(10);
  const [usageTotal, setUsageTotal] = useState(0);

  // 公告管理相关状态
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<EditingAnnouncement>({
    title: '',
    content: '',
    isActive: true,
    priority: 0,
    showStyle: 'info',
    startTime: '',
    endTime: ''
  });
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<number | null>(null);

  // 检查管理员权限
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    console.log('ManagerPage - 用户信息:', user);
    console.log('ManagerPage - 是否为管理员:', isAdmin);
    console.log('ManagerPage - SessionId:', localStorage.getItem('sessionId'));

    if (isAdmin) {
      if (currentTab === 'configs') {
        loadConfigs();
      } else if (currentTab === 'users') {
        loadUsers();
      } else if (currentTab === 'credits') {
        loadCreditUsers();
      } else if (currentTab === 'invites') {
        loadInviteData();
      } else if (currentTab === 'packages') {
        loadPackages();
      } else if (currentTab === 'usage-stats') {
        loadUsageData();
      } else if (currentTab === 'announcements') {
        loadAnnouncements();
      } else if (currentTab === 'llm-config') {
        loadLLMConfig();
      }
    }
  }, [isAdmin, currentTab]);

  // 当邀请子标签页或筛选条件变化时，重新加载数据
  useEffect(() => {
    if (isAdmin && currentTab === 'invites') {
      if (inviteTab === 'configs') {
        loadInviteConfigs();
      } else if (inviteTab === 'traffic-agents') {
        loadTrafficAgents();
      } else {
        loadInviteData();
      }
    }
  }, [inviteTab]);

  // 当使用情况统计子标签页变化时，重新加载数据
  useEffect(() => {
    if (isAdmin && currentTab === 'usage-stats') {
      loadUsageData();
    }
  }, [usageTab]);

  // 筛选用户的Effect
  useEffect(() => {
    if (searchEmail.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(u =>
        u.email.toLowerCase().includes(searchEmail.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchEmail]);

  // 筛选积分用户的Effect
  useEffect(() => {
    if (creditSearchEmail.trim() === '') {
      setFilteredCreditUsers(creditUsers);
    } else {
      const filtered = creditUsers.filter(u =>
        u.email.toLowerCase().includes(creditSearchEmail.toLowerCase())
      );
      setFilteredCreditUsers(filtered);
    }
  }, [creditUsers, creditSearchEmail]);

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchEmail(e.target.value);
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchEmail('');
  };

  // 处理积分搜索输入变化
  const handleCreditSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreditSearchEmail(e.target.value);
  };

  // 清除积分搜索
  const handleClearCreditSearch = () => {
    setCreditSearchEmail('');
  };

  // 加载充值套餐
  const loadPackages = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem('sessionId');

      const response = await fetch('/api/admin/payment-packages', {
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('loadPackages - Error response:', errorText);
        throw new Error(`Failed to load packages: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('loadPackages - Response data:', data);
      setPackages(data.packages || []);
      setMessage('充值套餐加载成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('加载充值套餐失败:', error);
      setMessage(`加载充值套餐失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // 保存充值套餐
  const handleSavePackage = async () => {
    try {
      setSaving(true);



      // 验证输入
      if (!editingPackage.name.trim()) {
        setMessage('套餐名称不能为空');
        return;
      }

      if (editingPackage.amount <= 0) {
        setMessage('套餐价格必须大于0');
        return;
      }

      if (editingPackage.points <= 0) {
        setMessage('积分数量必须大于0');
        return;
      }

      if (editingPackage.bonusPoints < 0) {
        setMessage('奖励积分不能为负数');
        return;
      }

      const sessionId = localStorage.getItem('sessionId');
      const url = editingPackageId
        ? `/api/admin/payment-packages/${editingPackageId}`
        : `/api/admin/payment-packages`;
      const method = editingPackageId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingPackage.name,
          description: editingPackage.description,
          amount: editingPackage.amount,
          points: editingPackage.points,
          bonusPoints: editingPackage.bonusPoints
        })
      });

      if (!response.ok) {
        throw new Error('保存套餐失败');
      }

      const data = await response.json();
      if (data.success) {
        setMessage(editingPackageId ? '套餐更新成功' : '套餐创建成功');
        setShowPackageForm(false);
        setEditingPackageId(null);
        setEditingPackage({
          name: '',
          description: '',
          amount: 0,
          points: 0,
          bonusPoints: 0
        });
        await loadPackages();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error(data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存套餐失败:', error);
      setMessage(`保存失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  // 编辑充值套餐
  const handleEditPackage = (pkg: PaymentPackage) => {
    setEditingPackage({
      name: pkg.name,
      description: pkg.description || '',
      amount: pkg.amount,
      points: pkg.points,
      bonusPoints: pkg.bonusPoints
    });
    setEditingPackageId(pkg.id);
    setShowPackageForm(true);
  };

  // 删除充值套餐
  const handleDeletePackage = async (packageId: number) => {
    if (!confirm('确定要删除这个充值套餐吗？')) {
      return;
    }

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`/api/admin/payment-packages/${packageId}`, {
        method: 'DELETE',
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('删除套餐失败');
      }

      setMessage('套餐删除成功！');
      await loadPackages();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('删除套餐失败:', error);
      setMessage('删除套餐失败');
    }
  };

  // 加载使用情况统计数据
  const loadUsageData = async () => {
    try {
      setUsageLoading(true);
      if (usageTab === 'details') {
        await loadUsageTransactions(1);
        setUsagePage(1);
      } else {
        await loadUsageSummary();
      }
    } catch (error) {
      console.error('加载使用情况数据失败:', error);
      setMessage(`加载使用情况数据失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUsageLoading(false);
    }
  };

  // 加载积分交易明细
  const loadUsageTransactions = async (page: number = 1) => {
    const sessionId = localStorage.getItem('sessionId');
    const queryParams = new URLSearchParams();

    queryParams.append('page', page.toString());
    queryParams.append('limit', usagePageSize.toString());

    if (usageFilters.startDate) queryParams.append('startDate', usageFilters.startDate);
    if (usageFilters.endDate) queryParams.append('endDate', usageFilters.endDate);
    if (usageFilters.userEmail) queryParams.append('userEmail', usageFilters.userEmail);
    if (usageFilters.transactionType) queryParams.append('transactionType', usageFilters.transactionType);

    const response = await fetch(`/api/admin/usage-stats/transactions?${queryParams.toString()}`, {
      headers: {
        'X-Session-Id': sessionId || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('获取交易明细失败');
    }


    const data = await response.json();
    setUsageTransactions(data.data.transactions || []);
    setUsagePage(data.data.pagination.page || page);
    setUsageTotalPages(data.data.pagination.totalPages || 1);
    setUsageTotal(data.data.pagination.total || 0);
  };

  // 加载积分使用汇总
  const loadUsageSummary = async () => {
    const sessionId = localStorage.getItem('sessionId');
    const queryParams = new URLSearchParams();

    queryParams.append('groupBy', 'user');
    if (usageFilters.startDate) queryParams.append('startDate', usageFilters.startDate);
    if (usageFilters.endDate) queryParams.append('endDate', usageFilters.endDate);
    if (usageFilters.userEmail) queryParams.append('userEmail', usageFilters.userEmail);

    const response = await fetch(`/api/admin/usage-stats/summary?${queryParams.toString()}`, {
      headers: {
        'X-Session-Id': sessionId || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('获取使用汇总失败');
    }

    const data = await response.json();
    setUsageSummary(data.data.userSpending || []);
  };

  // 处理使用情况页面大小变化
  const handleUsagePageSizeChange = async (newSize: number) => {
    setUsagePageSize(newSize);
    setUsagePage(1);
    try {
      setUsageLoading(true);
      await loadUsageTransactions(1);
    } catch (error) {
      console.error('加载交易明细失败:', error);
      setMessage('加载交易明细失败');
    } finally {
      setUsageLoading(false);
    }
  };

  // 加载公告列表
  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem('sessionId');

      const response = await fetch('/api/admin/announcements', {
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('loadAnnouncements - Error response:', errorText);
        throw new Error(`Failed to load announcements: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('loadAnnouncements - Response data:', data);
      setAnnouncements(data.data.announcements || []);
      setMessage('公告加载成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('加载公告失败:', error);
      setMessage(`加载公告失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // 保存公告
  const handleSaveAnnouncement = async () => {
    try {
      setSaving(true);

      // 验证输入
      if (!editingAnnouncement.title.trim()) {
        setMessage('公告标题不能为空');
        return;
      }

      if (!editingAnnouncement.content.trim()) {
        setMessage('公告内容不能为空');
        return;
      }

      const sessionId = localStorage.getItem('sessionId');
      const isEditing = editingAnnouncementId !== null;

      const url = isEditing
        ? `/api/admin/announcements/${editingAnnouncementId}`
        : '/api/admin/announcements';

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editingAnnouncement.title,
          content: editingAnnouncement.content,
          isActive: editingAnnouncement.isActive,
          priority: editingAnnouncement.priority,
          showStyle: editingAnnouncement.showStyle,
          startTime: editingAnnouncement.startTime || null,
          endTime: editingAnnouncement.endTime || null
        })
      });

      if (!response.ok) {
        throw new Error('保存公告失败');
      }

      const data = await response.json();
      if (data.success) {
        setMessage(isEditing ? '公告更新成功' : '公告创建成功');
        setShowAnnouncementForm(false);
        setEditingAnnouncementId(null);
        setEditingAnnouncement({
          title: '',
          content: '',
          isActive: true,
          priority: 0,
          showStyle: 'info',
          startTime: '',
          endTime: ''
        });
        await loadAnnouncements();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error(data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存公告失败:', error);
      setMessage(`保存失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  // 编辑公告
  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement({
      title: announcement.title,
      content: announcement.content,
      isActive: announcement.isActive,
      priority: announcement.priority,
      showStyle: announcement.showStyle,
      startTime: announcement.startTime ? announcement.startTime.split('T')[0] : '',
      endTime: announcement.endTime ? announcement.endTime.split('T')[0] : ''
    });
    setEditingAnnouncementId(announcement.id);
    setShowAnnouncementForm(true);
  };

  // 删除公告
  const handleDeleteAnnouncement = async (announcementId: number) => {
    if (!confirm('确定要删除这个公告吗？')) {
      return;
    }

    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`/api/admin/announcements/${announcementId}`, {
        method: 'DELETE',
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('删除公告失败');
      }

      setMessage('公告删除成功！');
      await loadAnnouncements();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('删除公告失败:', error);
      setMessage('删除公告失败');
    }
  };

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem('sessionId');
      console.log('loadConfigs - SessionId:', sessionId);

      const response = await fetch('/api/admin/model-configs', {
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      console.log('loadConfigs - Response status:', response.status);
      console.log('loadConfigs - Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('loadConfigs - Error response:', errorText);
        throw new Error(`Failed to load configs: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('loadConfigs - Response data:', data);
      setConfigs(data.data.configs || []);
      setMessage('配置加载成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('加载配置失败:', error);
      setMessage(`加载配置失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // LLM配置相关函数
  const loadLLMConfig = async () => {
    try {
      setLlmConfigLoading(true);
      const sessionId = localStorage.getItem('sessionId');
      console.log('loadLLMConfig - SessionId:', sessionId);

      const response = await fetch('/api/admin/llm-config', {
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      console.log('loadLLMConfig - Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('loadLLMConfig - Error response:', errorText);
        throw new Error(`Failed to load LLM config: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('loadLLMConfig - Response data:', data);
      
      if (data.success) {
        setLlmConfig(data.data.configs);
        
        // 设置表单初始值
        setLlmConfigForm({
          base_url: data.data.configs?.base_url?.value || '',
          api_key: data.data.configs?.api_key?.value || ''
        });
        
        setMessage('LLM配置加载成功');
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error(data.message || 'Failed to load LLM config');
      }
    } catch (error) {
      console.error('加载LLM配置失败:', error);
      setMessage(`加载LLM配置失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLlmConfigLoading(false);
    }
  };

  const updateLLMConfig = async () => {
    try {
      setSaving(true);
      const sessionId = localStorage.getItem('sessionId');
      console.log('updateLLMConfig - 提交数据:', llmConfigForm);

      const response = await fetch('/api/admin/llm-config', {
        method: 'PUT',
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(llmConfigForm)
      });

      console.log('updateLLMConfig - Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('updateLLMConfig - Error response:', errorText);
        throw new Error(`Failed to update LLM config: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('updateLLMConfig - Response data:', data);
      
      if (data.success) {
        setMessage('LLM配置更新成功');
        // 重新加载配置
        await loadLLMConfig();
      } else {
        throw new Error(data.message || 'Failed to update LLM config');
      }
    } catch (error) {
      console.error('更新LLM配置失败:', error);
      setMessage(`更新LLM配置失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem('sessionId');

      const response = await fetch('/api/admin/users', {
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('loadUsers - Error response:', errorText);
        throw new Error(`Failed to load users: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('loadUsers - Response data:', data);
      const usersData = data.data.users || [];
      setUsers(usersData);
      setFilteredUsers(usersData);
      setMessage('用户列表加载成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('加载用户列表失败:', error);
      setMessage(`加载用户列表失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCreditUsers = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem('sessionId');

      const response = await fetch('/api/admin/users', {
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('loadCreditUsers - Error response:', errorText);
        throw new Error(`Failed to load credit users: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('loadCreditUsers - Response data:', data);
      const usersData = data.data.users || [];
      setCreditUsers(usersData);
      setFilteredCreditUsers(usersData);
      setMessage('积分用户列表加载成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('加载积分用户列表失败:', error);
      setMessage(`加载积分用户列表失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const loadInviteData = async () => {
    try {
      setInviteLoading(true);
      if (inviteTab === 'summary') {
        await loadInviteSummary();
      } else if (inviteTab === 'registrations') {
        await loadInviteRegistrations(1); // 重置到第一页
        setRegistrationsPage(1);
      } else {
        await loadInviteRecharges(1); // 重置到第一页
        setRechargesPage(1);
      }
    } catch (error) {
      console.error('加载邀请数据失败:', error);
      setMessage(`加载邀请数据失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setInviteLoading(false);
    }
  };

  const loadInviteSummary = async () => {
    const sessionId = localStorage.getItem('sessionId');
    const queryParams = new URLSearchParams();

    if (inviteFilters.startDate) queryParams.append('startDate', inviteFilters.startDate);
    if (inviteFilters.endDate) queryParams.append('endDate', inviteFilters.endDate);
    if (inviteFilters.inviterEmail) queryParams.append('inviterEmail', inviteFilters.inviterEmail);

    const response = await fetch(`/api/admin/invites/summary?${queryParams.toString()}`, {
      headers: {
        'X-Session-Id': sessionId || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('获取邀请汇总数据失败');
    }

    const data = await response.json();
    setInviteSummary(data.data.summary || []);
  };

  const loadInviteRegistrations = async (page: number = 1) => {
    const sessionId = localStorage.getItem('sessionId');
    const queryParams = new URLSearchParams();

    // 添加分页参数
    queryParams.append('page', page.toString());
    queryParams.append('limit', registrationsPageSize.toString());

    if (inviteFilters.startDate) queryParams.append('startDate', inviteFilters.startDate);
    if (inviteFilters.endDate) queryParams.append('endDate', inviteFilters.endDate);
    if (inviteFilters.inviterEmail) queryParams.append('inviterEmail', inviteFilters.inviterEmail);
    if (inviteFilters.inviteeEmail) queryParams.append('inviteeEmail', inviteFilters.inviteeEmail);

    const response = await fetch(`/api/admin/invites/registrations?${queryParams.toString()}`, {
      headers: {
        'X-Session-Id': sessionId || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('获取邀请注册记录失败');
    }

    const data = await response.json();
    setInviteRegistrations(data.data.registrations || []);
    setRegistrationsPage(data.data.page || page);
    setRegistrationsTotalPages(data.data.totalPages || 1);
    setRegistrationsTotal(data.data.total || 0);
  };

  const loadInviteRecharges = async (page: number = 1) => {
    const sessionId = localStorage.getItem('sessionId');
    const queryParams = new URLSearchParams();

    // 添加分页参数
    queryParams.append('page', page.toString());
    queryParams.append('limit', rechargesPageSize.toString());

    if (inviteFilters.startDate) queryParams.append('startDate', inviteFilters.startDate);
    if (inviteFilters.endDate) queryParams.append('endDate', inviteFilters.endDate);
    if (inviteFilters.inviterEmail) queryParams.append('inviterEmail', inviteFilters.inviterEmail);
    if (inviteFilters.inviteeEmail) queryParams.append('inviteeEmail', inviteFilters.inviteeEmail);

    const response = await fetch(`/api/admin/invites/recharges?${queryParams.toString()}`, {
      headers: {
        'X-Session-Id': sessionId || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('获取邀请充值记录失败');
    }

    const data = await response.json();
    setInviteRecharges(data.data.recharges || []);
    setRechargesPage(data.data.page || page);
    setRechargesTotalPages(data.data.totalPages || 1);
    setRechargesTotal(data.data.total || 0);
  };

  // 处理注册明细页面大小变化
  const handleRegistrationsPageSizeChange = async (newSize: number) => {
    setRegistrationsPageSize(newSize);
    setRegistrationsPage(1);
    try {
      setInviteLoading(true);
      await loadInviteRegistrations(1);
    } catch (error) {
      console.error('加载邀请注册记录失败:', error);
      setMessage('加载邀请注册记录失败');
    } finally {
      setInviteLoading(false);
    }
  };

  // 处理充值明细页面大小变化
  const handleRechargesPageSizeChange = async (newSize: number) => {
    setRechargesPageSize(newSize);
    setRechargesPage(1);
    try {
      setInviteLoading(true);
      await loadInviteRecharges(1);
    } catch (error) {
      console.error('加载邀请充值记录失败:', error);
      setMessage('加载邀请充值记录失败');
    } finally {
      setInviteLoading(false);
    }
  };

  // 加载邀请配置
  const loadInviteConfigs = async () => {
    try {
      setInviteConfigsLoading(true);
      console.log('🔍 加载邀请配置...');
      const result = await adminApi.getInviteConfigs();
      console.log('📊 邀请配置API返回结果:', result);

      if (result.success) {
        setInviteConfigs(result.data.configs || []);
        console.log('✅ 邀请配置加载成功:', result.data.configs?.length);
      }
    } catch (error) {
      console.error('❌ 加载邀请配置失败:', error);
      setMessage('加载邀请配置失败');
    } finally {
      setInviteConfigsLoading(false);
    }
  };

  // 加载流量手列表
  const loadTrafficAgents = async () => {
    try {
      setTrafficAgentsLoading(true);
      console.log('🔍 加载流量手列表...');
      const result = await adminApi.getTrafficAgents();
      console.log('👥 流量手列表API返回结果:', result);

      if (result.success) {
        setTrafficAgents(result.data.trafficAgents || []);
        console.log('✅ 流量手列表加载成功:', result.data.trafficAgents?.length);
      }
    } catch (error) {
      console.error('❌ 加载流量手列表失败:', error);
      setMessage('加载流量手列表失败');
    } finally {
      setTrafficAgentsLoading(false);
    }
  };

  // 设置/取消用户流量手身份
  const handleSetTrafficAgent = async (userId: number, isTrafficAgent: boolean) => {
    try {
      setSettingTrafficAgent(userId);
      console.log('🎯 设置流量手身份:', { userId, isTrafficAgent });
      
      const result = await adminApi.setTrafficAgent(userId, isTrafficAgent);
      console.log('✅ 流量手身份设置结果:', result);

      if (result.success) {
        setMessage(`${isTrafficAgent ? '设置' : '取消'}流量手身份成功`);
        // 重新加载流量手列表
        await loadTrafficAgents();
        // 如果在用户管理页面，也重新加载用户列表
        if (currentTab === 'users') {
          await loadUsers();
        }
      } else {
        setMessage(result.message || '操作失败');
      }
    } catch (error) {
      console.error('❌ 设置流量手身份失败:', error);
      setMessage('设置流量手身份失败');
    } finally {
      setSettingTrafficAgent(null);
    }
  };

  // 更新邀请配置
  const handleUpdateInviteConfigs = async (newConfigs: InviteConfig[]) => {
    try {
      setConfigSaving(true);
      console.log('🔧 更新邀请配置:', newConfigs);

      const configsToUpdate = newConfigs.map(config => ({
        configKey: config.configKey,
        configValue: config.configValue
      }));

      const result = await adminApi.updateInviteConfigs(configsToUpdate);
      console.log('✅ 邀请配置更新结果:', result);

      if (result.success) {
        setMessage('邀请配置更新成功');
        // 重新加载配置
        await loadInviteConfigs();
      } else {
        setMessage(result.message || '配置更新失败');
      }
    } catch (error) {
      console.error('❌ 更新邀请配置失败:', error);
      setMessage('更新邀请配置失败');
    } finally {
      setConfigSaving(false);
    }
  };

  // 获取配置显示名称
  const getConfigDisplayName = (configKey: string): string => {
    const displayNames: Record<string, string> = {
      'REGISTER_REWARD': '注册奖励',
      'RECHARGE_COMMISSION_RATE': '充值积分佣金比例',
      'MONEY_COMMISSION_RATE': '充值现金佣金比例'
    };
    return displayNames[configKey] || configKey;
  };

  // 获取配置描述
  const getConfigDescription = (configKey: string): string => {
    const descriptions: Record<string, string> = {
      'REGISTER_REWARD': '新用户注册时获得的积分奖励',
      'RECHARGE_COMMISSION_RATE': '邀请人获得的被邀请人充值积分佣金比例（%）',
      'MONEY_COMMISSION_RATE': '流量手获得的被邀请人充值现金佣金比例（%）'
    };
    return descriptions[configKey] || '无描述';
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'USER' | 'ADMIN') => {
    try {
      const sessionId = localStorage.getItem('sessionId');

      const response = await fetch('/api/admin/users/role', {
        method: 'PUT',
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          role: newRole
        })
      });

      if (!response.ok) {
        throw new Error('更新用户角色失败');
      }

      const data = await response.json();
      if (data.success) {
        setMessage(`用户角色更新成功: ${newRole}`);
        await loadUsers(); // 重新加载用户列表
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error(data.message || '更新失败');
      }
    } catch (error) {
      console.error('更新用户角色失败:', error);
      setMessage(`更新失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleUpdateUserCredits = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      const sessionId = localStorage.getItem('sessionId');

      const response = await fetch('/api/admin/users/credits', {
        method: 'PUT',
        headers: {
          'X-Session-Id': sessionId || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          operation: creditOperation,
          amount: creditAmount,
          description: creditDescription || `管理员${creditOperation === 'add' ? '增加' : '设置'}积分`
        })
      });

      console.log('📤 发送积分更新请求:', {
        userId: selectedUser.id,
        operation: creditOperation,
        amount: creditAmount,
        description: creditDescription || `管理员${creditOperation === 'add' ? '增加' : '设置'}积分`
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 响应状态不正常:', response.status, errorText);
        throw new Error(`更新用户积分失败: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 积分更新响应:', data);

      if (data.success) {
        setMessage(`用户积分更新成功`);
        setShowCreditForm(false);
        setSelectedUser(null);
        setCreditAmount(0);
        setCreditDescription('');
        await loadCreditUsers(); // 重新加载用户列表
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error(data.message || '更新失败');
      }
    } catch (error) {
      console.error('更新用户积分失败:', error);
      setMessage(`更新失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditUserCredits = (userItem: User) => {
    setSelectedUser(userItem);
    setCreditAmount(0);
    setCreditOperation('add');
    setCreditDescription('');
    setShowCreditForm(true);
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);

      // 验证输入
      if (!editingConfig.modelName.trim()) {
        setMessage('模型名称不能为空');
        return;
      }

      if (editingConfig.cost <= 0) {
        setMessage('积分消耗必须大于0');
        return;
      }

      const response = await fetch('/api/admin/model-configs', {
        method: 'PUT',
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modelName: editingConfig.modelName,
          questionType: editingConfig.questionType,
          cost: editingConfig.cost,
          description: editingConfig.description,
          isActive: true
        })
      });

      if (!response.ok) {
        throw new Error('保存配置失败');
      }

      const data = await response.json();
      if (data.success) {
        setMessage('配置保存成功');
        setShowAddForm(false);
        setEditingConfig({
          modelName: '',
          questionType: 'multiple_choice',
          cost: 1,
          description: ''
        });
        await loadConfigs();
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error(data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      setMessage(`保存失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (modelName: string, questionType: string) => {
    if (!confirm('确定要删除这个配置吗？')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/model-configs', {
        method: 'DELETE',
        headers: {
          'X-Session-Id': localStorage.getItem('sessionId') || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modelName, questionType })
      });

      if (!response.ok) {
        throw new Error('Failed to delete config');
      }

      setMessage('配置删除成功！');
      await loadConfigs();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('删除配置失败:', error);
      setMessage('删除配置失败');
    }
  };

  const handleEditConfig = (config: ModelPointConfig) => {
    setEditingConfig({
      modelName: config.modelName,
      questionType: config.questionType,
      cost: config.cost,
      description: config.description || ''
    });
    setShowAddForm(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  if (!isAdmin) {
    const handleCheckSession = async () => {
      try {
        const sessionId = localStorage.getItem('sessionId');
        console.log('手动检查session，sessionId:', sessionId);

        const response = await fetch('/api/session_status', {
          headers: {
            'X-Session-Id': sessionId || '',
            'Content-Type': 'application/json'
          }
        });

        console.log('Session检查响应状态:', response.status);
        const data = await response.json();
        console.log('Session检查响应数据:', data);

        if (data.success && data.user) {
          alert(`Session有效！用户: ${data.user.username} (${data.user.email})`);
          // 手动设置用户信息并刷新页面
          window.location.reload();
        } else {
          alert(`Session无效: ${data.message || '未知错误'}`);
        }
      } catch (error) {
        console.error('检查session失败:', error);
        alert(`检查session失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">权限不足</h2>
          <p className="mb-4">只有管理员可以访问此页面</p>
          <div className="text-sm text-gray-400 mb-4">
            <p>当前用户: {user?.username || '未登录'}</p>
            <p>用户邮箱: {user?.email || '无'}</p>
            <p>SessionId: {localStorage.getItem('sessionId') ? '存在' : '不存在'}</p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleCheckSession}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
            >
              检查Session状态
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              返回主页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">管理员控制台</h1>
            <p className="text-gray-400">管理系统配置和用户权限</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => window.open('/', '_blank')}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              返回主页
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>

        {/* 标签页切换 */}
        <div className="mb-8">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setCurrentTab('configs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentTab === 'configs'
                    ? 'border-purple-500 text-purple-400 bg-gradient-to-r from-purple-600/20 to-indigo-600/20'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-purple-600/10 hover:to-indigo-600/10'
                }`}
              >
                积分配置管理
              </button>
              <button
                onClick={() => setCurrentTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentTab === 'users'
                    ? 'border-cyan-500 text-cyan-400 bg-gradient-to-r from-cyan-600/20 to-blue-600/20'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-cyan-600/10 hover:to-blue-600/10'
                }`}
              >
                用户角色管理
              </button>
              <button
                onClick={() => setCurrentTab('credits')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentTab === 'credits'
                    ? 'border-emerald-500 text-emerald-400 bg-gradient-to-r from-emerald-600/20 to-green-600/20'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-emerald-600/10 hover:to-green-600/10'
                }`}
              >
                用户积分管理
              </button>
              <button
                onClick={() => setCurrentTab('invites')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentTab === 'invites'
                    ? 'border-pink-500 text-pink-400 bg-gradient-to-r from-pink-600/20 to-rose-600/20'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-pink-600/10 hover:to-rose-600/10'
                }`}
              >
                用户邀请管理
              </button>
              <button
                onClick={() => setCurrentTab('packages')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentTab === 'packages'
                    ? 'border-yellow-500 text-yellow-400 bg-gradient-to-r from-yellow-600/20 to-orange-600/20'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-yellow-600/10 hover:to-orange-600/10'
                }`}
              >
                充值管理
              </button>
              <button
                onClick={() => setCurrentTab('usage-stats')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentTab === 'usage-stats'
                    ? 'border-teal-500 text-teal-400 bg-gradient-to-r from-teal-600/20 to-cyan-600/20'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-teal-600/10 hover:to-cyan-600/10'
                }`}
              >
                使用情况统计
              </button>
              <button
                onClick={() => setCurrentTab('announcements')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentTab === 'announcements'
                    ? 'border-purple-500 text-purple-400 bg-gradient-to-r from-purple-600/20 to-pink-600/20'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-purple-600/10 hover:to-pink-600/10'
                }`}
              >
                公告管理
              </button>
              <button
                onClick={() => setCurrentTab('llm-config')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  currentTab === 'llm-config'
                    ? 'border-blue-500 text-blue-400 bg-gradient-to-r from-blue-600/20 to-indigo-600/20'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-blue-600/10 hover:to-indigo-600/10'
                }`}
              >
                模型配置
              </button>
            </nav>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('成功') ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {message}
          </div>
        )}

        {/* 积分配置管理标签页 */}
        {currentTab === 'configs' && (
          <>
            {/* 添加/编辑表单 */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {showAddForm ? '添加/编辑配置' : '配置管理'}
            </h2>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (!showAddForm) {
                  setEditingConfig({
                    modelName: '',
                    questionType: 'multiple_choice',
                    cost: 1,
                    description: ''
                  });
                }
              }}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
            >
              {showAddForm ? '取消' : '添加配置'}
            </button>
          </div>

          {showAddForm && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">模型名称</label>
                <input
                  type="text"
                  value={editingConfig.modelName}
                  onChange={(e) => setEditingConfig({...editingConfig, modelName: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  placeholder="例如: gpt-4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">题目类型</label>
                <select
                  value={editingConfig.questionType}
                  onChange={(e) => setEditingConfig({...editingConfig, questionType: e.target.value as 'multiple_choice' | 'programming'})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                >
                  <option value="multiple_choice">选择题</option>
                  <option value="programming">编程题</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">积分消耗</label>
                <input
                  type="number"
                  min="1"
                  value={editingConfig.cost}
                  onChange={(e) => setEditingConfig({...editingConfig, cost: parseInt(e.target.value) || 1})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">描述 (可选)</label>
                <input
                  type="text"
                  value={editingConfig.description}
                  onChange={(e) => setEditingConfig({...editingConfig, description: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  placeholder="配置描述"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-4">
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-lg transition-colors"
                >
                  {saving ? '保存中...' : '保存配置'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 配置列表 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold">当前配置 ({configs.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    模型名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    题目类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    积分消耗
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    描述
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    更新时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {configs.map((config) => (
                  <tr key={`${config.modelName}-${config.questionType}`} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {config.modelName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        config.questionType === 'multiple_choice' 
                          ? 'bg-blue-600 text-blue-100' 
                          : 'bg-green-600 text-green-100'
                      }`}>
                        {config.questionType === 'multiple_choice' ? '选择题' : '编程题'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="bg-orange-600 text-orange-100 px-2 py-1 rounded-full text-xs">
                        {config.cost} 积分
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        config.isActive 
                          ? 'bg-green-600 text-green-100' 
                          : 'bg-red-600 text-red-100'
                      }`}>
                        {config.isActive ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                      {config.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(config.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditConfig(config)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteConfig(config.modelName, config.questionType)}
                          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {configs.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>暂无配置数据</p>
                <p className="text-sm mt-2">点击"添加配置"开始添加模型积分配置</p>
              </div>
            )}
          </div>
        </div>

        {/* 预设配置建议 */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">💡 常用配置建议</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-700 rounded p-3">
              <div className="font-medium mb-2">GPT-4 系列</div>
              <div className="text-gray-300">
                • 选择题: 2-3积分<br />
                • 编程题: 5-8积分
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="font-medium mb-2">GPT-3.5 系列</div>
              <div className="text-gray-300">
                • 选择题: 1-2积分<br />
                • 编程题: 3-5积分
              </div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="font-medium mb-2">Claude 系列</div>
              <div className="text-gray-300">
                • 选择题: 2-3积分<br />
                • 编程题: 4-6积分
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {/* 用户角色管理标签页 */}
        {currentTab === 'users' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold">用户角色管理 ({filteredUsers.length})</h3>
              <p className="text-gray-400 text-sm mt-1">管理用户的角色权限，只有管理员可以访问管理功能</p>

              {/* 搜索框 */}
              <div className="mt-4 flex">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="搜索用户邮箱..."
                    value={searchEmail}
                    onChange={handleSearchChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                  {searchEmail && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="ml-2 text-sm text-gray-400 flex items-center">
                  {searchEmail && `找到 ${filteredUsers.length} 个结果`}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      用户ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      用户名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      邮箱
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      当前角色
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      积分余额
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      注册时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredUsers.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {userItem.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {userItem.username}
                        {userItem.id === user?.id && (
                          <span className="ml-2 text-xs bg-blue-600 text-blue-100 px-2 py-1 rounded">
                            当前用户
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {userItem.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          userItem.role === 'ADMIN' 
                            ? 'bg-red-600 text-red-100' 
                            : 'bg-green-600 text-green-100'
                        }`}>
                          {userItem.role === 'ADMIN' ? '管理员' : '普通用户'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {userItem.points || 0} 积分
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(userItem.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          {userItem.id !== user?.id && (
                            <>
                              <button
                                onClick={() => handleUpdateUserRole(userItem.id, userItem.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                                className={`px-3 py-1 rounded text-xs transition-colors ${
                                  userItem.role === 'ADMIN'
                                    ? 'bg-orange-600 hover:bg-orange-700'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                              >
                                {userItem.role === 'ADMIN' ? '降为用户' : '提升为管理员'}
                              </button>
                              <button
                                onClick={() => handleSetTrafficAgent(userItem.id, !(userItem as any).isTrafficAgent)}
                                disabled={settingTrafficAgent === userItem.id}
                                className={`px-3 py-1 rounded text-xs transition-colors ${
                                  (userItem as any).isTrafficAgent
                                    ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-800'
                                    : 'bg-green-600 hover:bg-green-700 disabled:bg-green-800'
                                }`}
                              >
                                {settingTrafficAgent === userItem.id 
                                  ? '处理中...' 
                                  : ((userItem as any).isTrafficAgent ? '取消流量手' : '设为流量手')
                                }
                              </button>
                            </>
                          )}
                          {userItem.id === user?.id && (
                            <span className="text-xs text-gray-400 px-3 py-1">
                              无法修改自己的角色
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>暂无用户数据</p>
                  <p className="text-sm mt-2">用户数据加载中...</p>
                </div>
              )}

              {users.length > 0 && filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>没有找到匹配的用户</p>
                  <p className="text-sm mt-2">尝试其他搜索条件或<button onClick={handleClearSearch} className="text-blue-400 hover:underline">清除搜索</button></p>
                </div>
              )}
            </div>

            {/* 角色说明 */}
            <div className="p-6 border-t border-gray-700 bg-gray-900">
              <h4 className="font-medium mb-2">角色权限说明：</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <div>• <span className="text-red-400 font-medium">管理员</span>：可以访问管理控制台，管理积分配置和用户角色</div>
                <div>• <span className="text-green-400 font-medium">普通用户</span>：只能使用基本功能，无法访问管理功能</div>
                <div>• <span className="text-yellow-400">注意</span>：系统至少需要保留一个管理员账号</div>
              </div>
            </div>
          </div>
        )}

        {/* 用户积分管理标签页 */}
        {currentTab === 'credits' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold">用户积分管理 ({filteredCreditUsers.length})</h3>
              <p className="text-gray-400 text-sm mt-1">查看和修改用户的积分余额</p>

              {/* 搜索框 */}
              <div className="mt-4 flex">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="搜索用户邮箱..."
                    value={creditSearchEmail}
                    onChange={handleCreditSearchChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                  {creditSearchEmail && (
                    <button
                      onClick={handleClearCreditSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="ml-2 text-sm text-gray-400 flex items-center">
                  {creditSearchEmail && `找到 ${filteredCreditUsers.length} 个结果`}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      用户ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      用户名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      邮箱
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      当前积分
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      用户角色
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      注册时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredCreditUsers.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {userItem.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {userItem.username}
                        {userItem.id === user?.id && (
                          <span className="ml-2 text-xs bg-blue-600 text-blue-100 px-2 py-1 rounded">
                            当前用户
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {userItem.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="bg-green-600 text-green-100 px-3 py-1 rounded-full font-medium">
                          {userItem.points || 0} 积分
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          userItem.role === 'ADMIN' 
                            ? 'bg-red-600 text-red-100' 
                            : 'bg-blue-600 text-blue-100'
                        }`}>
                          {userItem.role === 'ADMIN' ? '管理员' : '普通用户'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(userItem.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleEditUserCredits(userItem)}
                          className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs transition-colors"
                        >
                          修改积分
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {creditUsers.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>暂无用户数据</p>
                  <p className="text-sm mt-2">用户数据加载中...</p>
                </div>
              )}

              {creditUsers.length > 0 && filteredCreditUsers.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>没有找到匹配的用户</p>
                  <p className="text-sm mt-2">尝试其他搜索条件或<button onClick={handleClearCreditSearch} className="text-blue-400 hover:underline">清除搜索</button></p>
                </div>
              )}
            </div>

            {/* 积分修改说明 */}
            <div className="p-6 border-t border-gray-700 bg-gray-900">
              <h4 className="font-medium mb-2">积分操作说明：</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <div>• <span className="text-green-400 font-medium">增加积分</span>：在用户当前积分基础上增加指定数量</div>
                <div>• <span className="text-blue-400 font-medium">设置积分</span>：直接将用户积分设置为指定数值</div>
                <div>• <span className="text-yellow-400">注意</span>：所有操作都会记录在系统日志中</div>
              </div>
            </div>
          </div>
        )}

        {/* 积分修改弹窗 */}
        {showCreditForm && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">修改用户积分</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">用户信息</label>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-sm">
                      <div>用户名: {selectedUser.username}</div>
                      <div>邮箱: {selectedUser.email}</div>
                      <div>当前积分: <span className="font-medium text-green-400">{selectedUser.points || 0}</span></div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">操作类型</label>
                  <select
                    value={creditOperation}
                    onChange={(e) => setCreditOperation(e.target.value as 'add' | 'set')}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  >
                    <option value="add">增加积分</option>
                    <option value="set">设置积分</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {creditOperation === 'add' ? '增加数量' : '设置数值'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                    placeholder="请输入积分数量"
                  />
                  {creditOperation === 'add' && creditAmount > 0 && (
                    <p className="text-sm text-gray-400 mt-1">
                      操作后积分: {(selectedUser.points || 0) + creditAmount}
                    </p>
                  )}
                  {creditOperation === 'set' && (
                    <p className="text-sm text-gray-400 mt-1">
                      操作后积分: {creditAmount}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">操作说明 (可选)</label>
                  <textarea
                    value={creditDescription}
                    onChange={(e) => setCreditDescription(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                    rows={3}
                    placeholder="请输入操作说明..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateUserCredits}
                  disabled={saving || creditAmount < 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
                >
                  {saving ? '处理中...' : '确认修改'}
                </button>
                <button
                  onClick={() => {
                    setShowCreditForm(false);
                    setSelectedUser(null);
                    setCreditAmount(0);
                    setCreditDescription('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 用户邀请管理标签页 */}
        {currentTab === 'invites' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold">用户邀请管理</h3>
                             <p className="text-gray-400 text-sm mt-1">
                 管理所有用户的邀请记录，包括注册和充值详情
                 {inviteTab === 'summary' && <span className="block mt-1 text-xs">💡 汇总统计基于时间范围和邀请人筛选，显示每个邀请人的整体表现</span>}
               </p>

                             {/* 筛选条件 */}
               <div className={`mt-4 grid grid-cols-1 md:grid-cols-2 ${inviteTab === 'summary' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
                 <div>
                   <label className="block text-sm font-medium mb-2">开始日期</label>
                   <input
                     type="date"
                     value={inviteFilters.startDate}
                     onChange={(e) => setInviteFilters({...inviteFilters, startDate: e.target.value})}
                     className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-2">结束日期</label>
                   <input
                     type="date"
                     value={inviteFilters.endDate}
                     onChange={(e) => setInviteFilters({...inviteFilters, endDate: e.target.value})}
                     className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-2">邀请人邮箱</label>
                   <input
                     type="email"
                     value={inviteFilters.inviterEmail}
                     onChange={(e) => setInviteFilters({...inviteFilters, inviterEmail: e.target.value})}
                     placeholder="输入邀请人邮箱"
                     className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                   />
                 </div>
                 {inviteTab !== 'summary' && (
                   <div>
                     <label className="block text-sm font-medium mb-2">被邀请人邮箱</label>
                     <input
                       type="email"
                       value={inviteFilters.inviteeEmail}
                       onChange={(e) => setInviteFilters({...inviteFilters, inviteeEmail: e.target.value})}
                       placeholder="输入被邀请人邮箱"
                       className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                     />
                   </div>
                 )}
               </div>

              {/* 筛选按钮 */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={loadInviteData}
                  disabled={inviteLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
                >
                  {inviteLoading ? '筛选中...' : '确认筛选'}
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    const oneMonthAgo = new Date();
                    oneMonthAgo.setMonth(now.getMonth() - 1);

                    setInviteFilters({
                      startDate: oneMonthAgo.toISOString().split('T')[0],
                      endDate: now.toISOString().split('T')[0],
                      inviterEmail: '',
                      inviteeEmail: ''
                    });
                    setTimeout(() => loadInviteData(), 100);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  重置筛选
                </button>
              </div>
            </div>

            {/* 子标签页 */}
            <div className="px-6 py-4 border-b border-gray-700">
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setInviteTab('summary');
                    setTimeout(() => loadInviteData(), 100);
                  }}
                  className={`py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                    inviteTab === 'summary'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  汇总统计
                </button>
                <button
                  onClick={() => {
                    setInviteTab('registrations');
                    setTimeout(() => loadInviteData(), 100);
                  }}
                  className={`py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                    inviteTab === 'registrations'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  注册记录
                </button>
                <button
                  onClick={() => {
                    setInviteTab('recharges');
                    setTimeout(() => loadInviteData(), 100);
                  }}
                  className={`py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                    inviteTab === 'recharges'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  充值记录
                </button>
                <button
                  onClick={() => {
                    setInviteTab('configs');
                    setTimeout(() => loadInviteConfigs(), 100);
                  }}
                  className={`py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                    inviteTab === 'configs'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  配置管理
                </button>
                <button
                  onClick={() => {
                    setInviteTab('traffic-agents');
                    setTimeout(() => loadTrafficAgents(), 100);
                  }}
                  className={`py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                    inviteTab === 'traffic-agents'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  流量手管理
                </button>
              </div>
            </div>

            {/* 汇总统计 */}
            {inviteTab === 'summary' && (
              <div className="overflow-x-auto">
                {inviteLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          邀请人ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          邀请人邮箱
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          邀请人用户名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          邀请注册人数
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          充值用户数
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          充值总金额
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          充值次数
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {inviteSummary.map((summary) => (
                        <tr key={summary.inviterId} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {summary.inviterId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {summary.inviterEmail}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {summary.inviterUsername}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            <span className="text-blue-400 font-medium">{summary.totalInvitedUsers}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            <span className="text-green-400 font-medium">{summary.totalRechargeUsers}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            <span className="text-green-400 font-medium">
                              ¥{summary.totalRechargeAmount.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            <span className="text-yellow-400 font-medium">{summary.totalRechargeCount}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {!inviteLoading && inviteSummary.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p>暂无汇总数据</p>
                    <p className="text-sm mt-2">尝试调整筛选条件</p>
                  </div>
                )}

                {/* 汇总统计说明 */}
                {!inviteLoading && inviteSummary.length > 0 && (
                  <div className="p-6 border-t border-gray-700 bg-gray-900">
                    <h4 className="font-medium mb-2">统计说明：</h4>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div>• <span className="text-blue-400 font-medium">邀请注册人数</span>：该用户成功邀请注册的总人数</div>
                      <div>• <span className="text-green-400 font-medium">充值用户数</span>：被邀请用户中进行过充值的人数</div>
                      <div>• <span className="text-green-400 font-medium">充值总金额</span>：被邀请用户的累计充值金额</div>
                      <div>• <span className="text-yellow-400 font-medium">充值次数</span>：被邀请用户的总充值次数</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 注册记录 */}
            {inviteTab === 'registrations' && (
              <div>
                {inviteLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inviteRegistrations.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                记录ID
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                邀请人邮箱
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                邀请人用户名
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                被邀请人邮箱
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                被邀请人用户名
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                注册时间
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {inviteRegistrations.map((registration) => (
                              <tr key={registration.id} className="hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {registration.id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {registration.inviterEmail}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {registration.inviterUsername}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {registration.inviteeEmail}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {registration.inviteeUsername}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {new Date(registration.createdAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <p>暂无注册记录</p>
                        <p className="text-sm mt-2">尝试调整筛选条件</p>
                      </div>
                    )}

                    {/* 注册记录分页 - 始终显示 */}
                    <Pagination
                      currentPage={registrationsPage}
                      totalPages={registrationsTotalPages}
                      pageSize={registrationsPageSize}
                      totalItems={registrationsTotal}
                      onPageChange={async (page) => {
                        try {
                          setInviteLoading(true);
                          await loadInviteRegistrations(page);
                        } catch (error) {
                          console.error('加载邀请注册记录失败:', error);
                          setMessage('加载邀请注册记录失败');
                        } finally {
                          setInviteLoading(false);
                        }
                      }}
                      onPageSizeChange={handleRegistrationsPageSizeChange}
                      loading={inviteLoading}
                      className="mt-4"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 充值记录 */}
            {inviteTab === 'recharges' && (
              <div>
                {inviteLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inviteRecharges.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                记录ID
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                邀请人邮箱
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                邀请人用户名
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                被邀请人邮箱
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                被邀请人用户名
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                充值金额
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                充值时间
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {inviteRecharges.map((recharge) => (
                              <tr key={recharge.id} className="hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {recharge.id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {recharge.inviterEmail}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {recharge.inviterUsername}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {recharge.inviteeEmail}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {recharge.inviteeUsername}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  <span className="text-green-400 font-medium">
                                    ¥{recharge.amount.toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {new Date(recharge.createdAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <p>暂无充值记录</p>
                        <p className="text-sm mt-2">尝试调整筛选条件</p>
                      </div>
                    )}

                    {/* 充值记录分页 - 始终显示 */}
                    <Pagination
                      currentPage={rechargesPage}
                      totalPages={rechargesTotalPages}
                      pageSize={rechargesPageSize}
                      totalItems={rechargesTotal}
                      onPageChange={async (page) => {
                        try {
                          setInviteLoading(true);
                          await loadInviteRecharges(page);
                        } catch (error) {
                          console.error('加载邀请充值记录失败:', error);
                          setMessage('加载邀请充值记录失败');
                        } finally {
                          setInviteLoading(false);
                        }
                      }}
                      onPageSizeChange={handleRechargesPageSizeChange}
                      loading={inviteLoading}
                      className="mt-4"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 配置管理 */}
            {inviteTab === 'configs' && (
              <div className="p-6">
                {inviteConfigsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gray-700 rounded-lg p-6">
                      <h4 className="text-lg font-semibold mb-4">邀请系统配置</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {inviteConfigs.map((config) => (
                          <div key={config.configKey} className="bg-gray-800 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-sm font-medium text-gray-300">
                                {getConfigDisplayName(config.configKey)}
                              </label>
                            </div>
                            <input
                              type="number"
                              value={config.configValue}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value) || 0;
                                setInviteConfigs(prevConfigs => 
                                  prevConfigs.map(c => 
                                    c.configKey === config.configKey 
                                      ? { ...c, configValue: newValue }
                                      : c
                                  )
                                );
                              }}
                              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                              step="0.01"
                              min="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {getConfigDescription(config.configKey)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex justify-end">
                        <button
                          onClick={() => handleUpdateInviteConfigs(inviteConfigs)}
                          disabled={configSaving}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          {configSaving ? '保存中...' : '保存配置'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 流量手管理 */}
            {inviteTab === 'traffic-agents' && (
              <div className="p-6">
                {trafficAgentsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gray-700 rounded-lg p-6">
                      <h4 className="text-lg font-semibold mb-4">流量手管理</h4>
                      {trafficAgents.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-800">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  用户信息
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  注册时间
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  邀请统计
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  佣金统计
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  操作
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                              {trafficAgents.map((agent) => (
                                <tr key={agent.id} className="hover:bg-gray-700">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                      <div className="text-sm font-medium text-white">
                                        {agent.username}
                                      </div>
                                      <div className="text-sm text-gray-400">
                                        {agent.email}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                    {new Date(agent.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-300">
                                      <div>邀请人数: {agent.inviteCount || 0}</div>
                                      <div>累计充值: ¥{agent.totalRechargeAmount || 0}</div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-300">
                                      <div>累计佣金: ¥{agent.totalCommission || 0}</div>
                                      <div>本月佣金: ¥{agent.monthlyCommission || 0}</div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <button
                                      onClick={() => handleSetTrafficAgent(agent.id, false)}
                                      disabled={settingTrafficAgent === agent.id}
                                      className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 px-3 py-1 rounded text-white transition-colors"
                                    >
                                      {settingTrafficAgent === agent.id ? '处理中...' : '取消身份'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          <p>暂无流量手用户</p>
                          <p className="text-sm mt-2">可以在用户管理页面设置流量手身份</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 充值管理标签页 */}
        {currentTab === 'packages' && (
          <>
            {/* 添加/编辑表单 */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {showPackageForm ? (editingPackageId ? '编辑套餐' : '添加套餐') : '充值套餐管理'}
                </h2>
                <button
                  onClick={() => {
                    setShowPackageForm(!showPackageForm);
                    if (!showPackageForm) {
                      setEditingPackageId(null);
                      setEditingPackage({
                        name: '',
                        description: '',
                        amount: 0,
                        points: 0,
                        bonusPoints: 0
                      });
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
                >
                  {showPackageForm ? '取消' : '添加套餐'}
                </button>
              </div>

              {showPackageForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">套餐名称</label>
                    <input
                      type="text"
                      value={editingPackage.name}
                      onChange={(e) => setEditingPackage({...editingPackage, name: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="例如: 基础套餐"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">套餐价格 (元)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingPackage.amount}
                      onChange={(e) => setEditingPackage({...editingPackage, amount: parseFloat(e.target.value) || 0})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="例如: 9.9"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">基础积分</label>
                    <input
                      type="number"
                      min="1"
                      value={editingPackage.points}
                      onChange={(e) => setEditingPackage({...editingPackage, points: parseInt(e.target.value) || 0})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="例如: 100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">奖励积分</label>
                    <input
                      type="number"
                      min="0"
                      value={editingPackage.bonusPoints}
                      onChange={(e) => setEditingPackage({...editingPackage, bonusPoints: parseInt(e.target.value) || 0})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="例如: 20"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">套餐描述</label>
                    <input
                      type="text"
                      value={editingPackage.description}
                      onChange={(e) => setEditingPackage({...editingPackage, description: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="例如: 适合新手用户，满足日常AI答题需求"
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <div className="bg-gray-700 rounded-lg p-3 text-sm text-gray-300 mb-4">
                      <strong>总积分预览: </strong>
                      {editingPackage.points + editingPackage.bonusPoints} 积分
                      (基础: {editingPackage.points} + 奖励: {editingPackage.bonusPoints})
                    </div>
                    <button
                      onClick={handleSavePackage}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-lg transition-colors"
                    >
                      {saving ? '保存中...' : (editingPackageId ? '更新套餐' : '创建套餐')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 套餐列表 */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold">当前套餐 ({packages.length})</h3>
                <p className="text-gray-400 text-sm mt-1">管理所有充值套餐，用户在充值页面会看到这些套餐选项</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        套餐名称
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        价格
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        基础积分
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        奖励积分
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        总积分
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        描述
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        创建时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {pkg.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {pkg.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="bg-green-600 text-green-100 px-2 py-1 rounded-full text-xs">
                            ¥{pkg.amount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="bg-blue-600 text-blue-100 px-2 py-1 rounded-full text-xs">
                            {pkg.points} 积分
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="bg-purple-600 text-purple-100 px-2 py-1 rounded-full text-xs">
                            {pkg.bonusPoints} 积分
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="bg-orange-600 text-orange-100 px-2 py-1 rounded-full text-xs font-medium">
                            {pkg.points + pkg.bonusPoints} 积分
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            pkg.isActive 
                              ? 'bg-green-600 text-green-100' 
                              : 'bg-red-600 text-red-100'
                          }`}>
                            {pkg.isActive ? '启用' : '禁用'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                          {pkg.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(pkg.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditPackage(pkg)}
                              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs transition-colors"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeletePackage(pkg.id)}
                              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {packages.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p>暂无充值套餐</p>
                    <p className="text-sm mt-2">点击"添加套餐"开始创建充值套餐</p>
                  </div>
                )}
              </div>
            </div>

            {/* 套餐设置说明 */}
            <div className="mt-8 bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">💡 套餐设置说明</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="font-medium mb-2">字段说明:</div>
                  <div className="text-gray-300">
                    • <span className="font-medium text-blue-400">套餐名称</span>: 显示给用户的套餐标题<br />
                    • <span className="font-medium text-green-400">套餐价格</span>: 用户需要支付的金额(元)<br />
                    • <span className="font-medium text-blue-400">基础积分</span>: 支付后获得的基本积分<br />
                    • <span className="font-medium text-purple-400">奖励积分</span>: 额外赠送的积分<br />
                    • <span className="font-medium text-gray-400">套餐描述</span>: 套餐的详细说明
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium mb-2">注意事项:</div>
                  <div className="text-gray-300">
                    • 总积分 = 基础积分 + 奖励积分<br />
                    • 套餐价格支持小数(如9.9元)<br />
                    • 已有订单的套餐无法删除<br />
                    • 用户在充值页面可以看到所有启用的套餐<br />
                    • 建议合理设置奖励积分来吸引用户
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 使用情况统计标签页 */}
        {currentTab === 'usage-stats' && (
          <>
            {/* 汇总计数卡 */}
            <UsageSummaryCards className="mb-8" />
            
            {/* 筛选条件 */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">筛选条件</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">开始日期</label>
                  <input
                    type="date"
                    value={usageFilters.startDate}
                    onChange={(e) => setUsageFilters({...usageFilters, startDate: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">结束日期</label>
                  <input
                    type="date"
                    value={usageFilters.endDate}
                    onChange={(e) => setUsageFilters({...usageFilters, endDate: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">用户邮箱</label>
                  <input
                    type="email"
                    value={usageFilters.userEmail}
                    onChange={(e) => setUsageFilters({...usageFilters, userEmail: e.target.value})}
                    placeholder="输入用户邮箱搜索"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">操作类型</label>
                  <select
                    value={usageFilters.transactionType}
                    onChange={(e) => setUsageFilters({...usageFilters, transactionType: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  >
                    <option value="">全部类型</option>
                    <option value="consume">消费</option>
                    <option value="recharge">充值</option>
                    <option value="reward">奖励</option>
                    <option value="refund">退款</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-center mt-4">
                <button
                  onClick={loadUsageData}
                  disabled={usageLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-lg transition-colors"
                >
                  {usageLoading ? '查询中...' : '查询'}
                </button>
              </div>
            </div>

            {/* 明细和汇总标签页 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setUsageTab('details')}
                  className={`py-2 px-4 border-b-2 font-medium transition-all duration-200 ${
                    usageTab === 'details'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  明细
                </button>
                <button
                  onClick={() => setUsageTab('summary')}
                  className={`py-2 px-4 border-b-2 font-medium transition-all duration-200 ${
                    usageTab === 'summary'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  汇总
                </button>
              </div>

              {/* 明细标签页内容 */}
              {usageTab === 'details' && (
                <div>
                  {usageLoading ? (
                    <div className="text-center py-12">
                      <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-4 text-gray-400">加载中...</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full table-auto min-w-[1200px]">
                          <thead>
                            <tr className="bg-gray-700">
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider min-w-[100px]">
                                用户名
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider min-w-[180px]">
                                邮箱
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider min-w-[80px]">
                                操作类型
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider min-w-[120px]">
                                使用模型
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider min-w-[80px]">
                                积分变化
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider min-w-[90px]">
                                操作后余额
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider min-w-[80px]">
                                花费时间
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider min-w-[130px]">
                                操作时间
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider min-w-[130px]">
                                操作结束时间
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider min-w-[200px]">
                                描述
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {usageTransactions.map((transaction) => (
                              <tr key={transaction.id} className="hover:bg-gray-700">
                                <td className="px-4 py-4 text-sm font-medium">
                                  <div className="break-words">{transaction.username}</div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-300">
                                  <div className="break-all">{transaction.email}</div>
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                    transaction.operationType === '充值' 
                                      ? 'bg-green-600 text-green-100'
                                      : transaction.operationType === '编程题'
                                      ? 'bg-purple-600 text-purple-100'
                                      : transaction.operationType === '选择题'
                                      ? 'bg-orange-600 text-orange-100'
                                      : transaction.operationType === '奖励'
                                      ? 'bg-blue-600 text-blue-100'
                                      : transaction.operationType === '退款'
                                      ? 'bg-yellow-600 text-yellow-100'
                                      : 'bg-red-600 text-red-100'
                                  }`}>
                                    {transaction.operationType}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-300">
                                  <div className="break-words">{transaction.model_name || '-'}</div>
                                </td>
                                <td className="px-4 py-4 text-sm text-center">
                                  <span className={`font-medium ${
                                    transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-300 text-center">
                                  {transaction.balance_after}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-300 text-center">
                                  {transaction.end_time && (transaction.operationType === '消费' || transaction.operationType === '编程题' || transaction.operationType === '选择题')
                                    ? (() => {
                                        const startTime = new Date(transaction.created_at).getTime();
                                        const endTime = new Date(transaction.end_time);
                                        endTime.setHours(endTime.getHours() - 8);
                                        const durationSeconds = Math.round((endTime.getTime() - startTime) / 1000);
                                        return `${durationSeconds}秒`;
                                      })()
                                    : '-'
                                  }
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-300">
                                  <div className="whitespace-nowrap">{new Date(transaction.created_at).toLocaleString()}</div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-300">
                                  <div className="whitespace-nowrap">
                                    {transaction.end_time && (transaction.operationType === '消费' || transaction.operationType === '编程题' || transaction.operationType === '选择题')
                                      ? (() => {
                                          const endTime = new Date(transaction.end_time);
                                          endTime.setHours(endTime.getHours() - 8);
                                          return endTime.toLocaleString();
                                        })()
                                      : '-'
                                    }
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-300">
                                  <div className="break-words">{transaction.description || '-'}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {usageTransactions.length === 0 && (
                          <div className="text-center py-12 text-gray-400">
                            <p>暂无交易记录</p>
                            <p className="text-sm mt-2">请调整筛选条件后重新查询</p>
                          </div>
                        )}
                      </div>

                      {usageTransactions.length > 0 && (
                        <div className="mt-6">
                          <Pagination
                            currentPage={usagePage}
                            totalPages={usageTotalPages}
                            pageSize={usagePageSize}
                            totalItems={usageTotal}
                            onPageChange={async (page) => {
                              try {
                                setUsageLoading(true);
                                await loadUsageTransactions(page);
                              } catch (error) {
                                console.error('加载交易明细失败:', error);
                                setMessage('加载交易明细失败');
                              } finally {
                                setUsageLoading(false);
                              }
                            }}
                            onPageSizeChange={handleUsagePageSizeChange}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 汇总标签页内容 */}
              {usageTab === 'summary' && (
                <div>
                  {usageLoading ? (
                    <div className="text-center py-12">
                      <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-4 text-gray-400">加载中...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto">
                        <thead>
                          <tr className="bg-gray-700">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              用户名
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              邮箱
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              总消费积分
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              总充值积分
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              总奖励积分
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              编程题次数
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              选择题次数
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              充值次数
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {usageSummary.map((summary) => (
                            <tr key={summary.userId} className="hover:bg-gray-700">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                {summary.username}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                                {summary.email}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <span className="text-red-400 font-semibold">
                                  {summary.totalConsumed}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <span className="text-green-400 font-semibold">
                                  {summary.totalRecharged}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <span className="text-blue-400 font-semibold">
                                  {summary.totalRewarded}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                <span className="bg-purple-600 text-purple-100 px-2 py-1 rounded-full text-xs font-medium">
                                  {summary.programmingCount}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                <span className="bg-orange-600 text-orange-100 px-2 py-1 rounded-full text-xs font-medium">
                                  {summary.multipleChoiceCount}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                <span className="bg-green-600 text-green-100 px-2 py-1 rounded-full text-xs font-medium">
                                  {summary.rechargeCount}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {usageSummary.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                          <p>暂无汇总数据</p>
                          <p className="text-sm mt-2">请调整筛选条件后重新查询</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* 公告管理标签页 */}
        {currentTab === 'announcements' && (
          <>
            {/* 添加/编辑表单 */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {showAnnouncementForm ? (editingAnnouncementId ? '编辑公告' : '添加公告') : '公告管理'}
                </h2>
                <button
                  onClick={() => {
                    setShowAnnouncementForm(!showAnnouncementForm);
                    if (!showAnnouncementForm) {
                      setEditingAnnouncementId(null);
                      setEditingAnnouncement({
                        title: '',
                        content: '',
                        isActive: true,
                        priority: 0,
                        showStyle: 'info',
                        startTime: '',
                        endTime: ''
                      });
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
                >
                  {showAnnouncementForm ? '取消' : '添加公告'}
                </button>
              </div>

              {showAnnouncementForm && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 左侧：HTML编辑器 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">HTML 编辑器</h3>

                    <div>
                      <label className="block text-sm font-medium mb-2">公告标题</label>
                      <input
                        type="text"
                        value={editingAnnouncement.title}
                        onChange={(e) => setEditingAnnouncement({...editingAnnouncement, title: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                        placeholder="输入公告标题（内部管理用）"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">HTML 内容</label>
                      <textarea
                        value={editingAnnouncement.content}
                        onChange={(e) => setEditingAnnouncement({...editingAnnouncement, content: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 font-mono text-sm"
                        rows={12}
                        placeholder="输入HTML内容..."
                      />
                      <div className="flex space-x-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setEditingAnnouncement({
                            ...editingAnnouncement,
                            content: `<div style="color: #1e40af; font-weight: bold;">🔥 最后一天优惠，7月26号以前开通会员特价 <span style="color: #dc2626; font-size: 18px;">89元</span> + 赠送全站笔试面试资料包，一次开通，永久有效，7月26号过后涨价预计29元+取消赠送资料包， <a href="#" style="color: #2563eb; text-decoration: underline;">点击前往</a></div>`
                          })}
                          className="text-xs bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded transition-colors"
                        >
                          使用模板1
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAnnouncement({
                            ...editingAnnouncement,
                            content: `<div style="display: flex; align-items: center; justify-content: center; color: #059669; font-weight: 500;"><span style="margin-right: 8px;">✅</span>系统维护完成，所有功能已恢复正常！</div>`
                          })}
                          className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded transition-colors"
                        >
                          使用模板2
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAnnouncement({
                            ...editingAnnouncement,
                            content: `<div style="color: #b91c1c; font-weight: 600;">⚠️ 紧急通知：系统将于今晚22:00-24:00进行维护升级，期间服务暂时不可用，请合理安排使用时间。</div>`
                          })}
                          className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-colors"
                        >
                          使用模板3
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">优先级</label>
                        <input
                          type="number"
                          value={editingAnnouncement.priority}
                          onChange={(e) => setEditingAnnouncement({...editingAnnouncement, priority: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                          placeholder="数字越大优先级越高"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">显示样式</label>
                        <select
                          value={editingAnnouncement.showStyle}
                          onChange={(e) => setEditingAnnouncement({...editingAnnouncement, showStyle: e.target.value})}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                        >
                          <option value="info">信息（蓝色）</option>
                          <option value="warning">警告（黄色）</option>
                          <option value="success">成功（绿色）</option>
                          <option value="error">错误（红色）</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">开始时间（可选）</label>
                        <input
                          type="datetime-local"
                          value={editingAnnouncement.startTime}
                          onChange={(e) => setEditingAnnouncement({...editingAnnouncement, startTime: e.target.value})}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">结束时间（可选）</label>
                        <input
                          type="datetime-local"
                          value={editingAnnouncement.endTime}
                          onChange={(e) => setEditingAnnouncement({...editingAnnouncement, endTime: e.target.value})}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={editingAnnouncement.isActive}
                        onChange={(e) => setEditingAnnouncement({...editingAnnouncement, isActive: e.target.checked})}
                        className="mr-2"
                      />
                      <label htmlFor="isActive" className="text-sm">启用公告</label>
                    </div>

                    <div className="flex space-x-4">
                      <button
                        onClick={handleSaveAnnouncement}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-lg transition-colors"
                      >
                        {saving ? '保存中...' : (editingAnnouncementId ? '更新公告' : '创建公告')}
                      </button>
                    </div>
                  </div>

                  {/* 右侧：实时预览 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">实时预览</h3>

                    <div className="bg-gray-900 rounded-lg p-4 min-h-[400px]">
                      <div className="text-sm text-gray-400 mb-4">
                        预览效果（实际效果可能因页面样式有所差异）：
                      </div>

                      {editingAnnouncement.content ? (
                        <div
                          className={`p-4 rounded-lg border ${
                            editingAnnouncement.showStyle === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                            editingAnnouncement.showStyle === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                            editingAnnouncement.showStyle === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                            'bg-red-50 border-red-200 text-red-800'
                          }`}
                          dangerouslySetInnerHTML={{ __html: editingAnnouncement.content }}
                        />
                      ) : (
                        <div className="text-gray-500 text-center py-12">
                          请在左侧输入HTML内容查看预览
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-gray-400 space-y-2">
                      <div><strong>HTML模板示例：</strong></div>
                      <div className="bg-gray-900 p-3 rounded font-mono text-xs">
{`<div style="color: #1e40af; font-weight: bold;">
  🔥 重要通知：<span style="color: #dc2626;">限时优惠</span>
  + 赠送资料包，
  <a href="#" style="color: #2563eb; text-decoration: underline;">
    点击前往
  </a>
</div>`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 公告列表 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">公告列表</h3>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-400">加载中...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="bg-gray-700">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          标题
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          状态
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          优先级
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          样式
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          创建时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {announcements.map((announcement) => (
                        <tr key={announcement.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {announcement.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              announcement.isActive 
                                ? 'bg-green-600 text-green-100' 
                                : 'bg-red-600 text-red-100'
                            }`}>
                              {announcement.isActive ? '启用' : '禁用'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {announcement.priority}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              announcement.showStyle === 'info' ? 'bg-blue-600 text-blue-100' :
                              announcement.showStyle === 'warning' ? 'bg-yellow-600 text-yellow-100' :
                              announcement.showStyle === 'success' ? 'bg-green-600 text-green-100' :
                              'bg-red-600 text-red-100'
                            }`}>
                              {announcement.showStyle === 'info' ? '信息' :
                               announcement.showStyle === 'warning' ? '警告' :
                               announcement.showStyle === 'success' ? '成功' : '错误'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {new Date(announcement.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditAnnouncement(announcement)}
                                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs transition-colors"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDeleteAnnouncement(announcement.id)}
                                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs transition-colors"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {announcements.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <p>暂无公告</p>
                      <p className="text-sm mt-2">点击"添加公告"开始创建公告</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 使用说明 */}
            <div className="mt-8 bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">💡 使用说明</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="font-medium mb-2">功能说明:</div>
                  <div className="text-gray-300">
                    • <span className="font-medium text-blue-400">左侧编辑器</span>: 支持原生HTML代码编辑<br />
                    • <span className="font-medium text-green-400">右侧预览</span>: 实时预览公告显示效果<br />
                    • <span className="font-medium text-purple-400">优先级</span>: 数字越大显示优先级越高<br />
                    • <span className="font-medium text-yellow-400">时间控制</span>: 可设置公告显示的时间范围<br />
                    • <span className="font-medium text-red-400">样式选择</span>: 支持多种颜色主题
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium mb-2">注意事项:</div>
                  <div className="text-gray-300">
                    • 支持HTML标签和内联样式<br />
                    • 公告将显示在网站首页顶部<br />
                    • 只有启用状态的公告才会显示<br />
                    • 优先级高的公告会优先显示<br />
                    • 可设置公告的生效和失效时间
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* LLM配置管理标签页 */}
        {currentTab === 'llm-config' && (
          <>
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">模型配置管理</h2>
                <button
                  onClick={() => loadLLMConfig()}
                  disabled={llmConfigLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {llmConfigLoading ? '刷新中...' : '刷新配置'}
                </button>
              </div>

              {/* 配置表单 */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API基础URL
                  </label>
                  <input
                    type="url"
                    value={llmConfigForm.base_url}
                    onChange={(e) => setLlmConfigForm({ ...llmConfigForm, base_url: e.target.value })}
                    placeholder="https://example.com/v1"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    请输入完整的API基础URL，例如: https://api.openai.com/v1
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API密钥
                  </label>
                  <input
                    type="password"
                    value={llmConfigForm.api_key}
                    onChange={(e) => setLlmConfigForm({ ...llmConfigForm, api_key: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    API密钥将被安全存储，仅用于模型调用
                  </p>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={updateLLMConfig}
                    disabled={saving || !llmConfigForm.base_url || !llmConfigForm.api_key}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? '保存中...' : '保存配置'}
                  </button>
                  <button
                    onClick={() => {
                      setLlmConfigForm({
                        base_url: llmConfig?.base_url?.value || '',
                        api_key: llmConfig?.api_key?.value || ''
                      });
                    }}
                    disabled={llmConfigLoading}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    重置
                  </button>
                </div>
              </div>
            </div>

            {/* 当前配置显示 */}
            {llmConfig && (
              <div className="bg-gray-800 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">当前数据库配置</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-300 mb-2">API基础URL</div>
                    <div className="px-3 py-2 bg-gray-700 rounded-lg text-green-400 font-mono text-sm">
                      {llmConfig.base_url?.value || '未配置'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      最后更新: {llmConfig.base_url?.updatedAt ? new Date(llmConfig.base_url.updatedAt).toLocaleString('zh-CN') : '未知'}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-300 mb-2">API密钥</div>
                    <div className="px-3 py-2 bg-gray-700 rounded-lg text-yellow-400 font-mono text-sm">
                      {llmConfig.api_key?.value ? '••••••••••••••••' + llmConfig.api_key.value.slice(-8) : '未配置'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      最后更新: {llmConfig.api_key?.updatedAt ? new Date(llmConfig.api_key.updatedAt).toLocaleString('zh-CN') : '未知'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 使用说明 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">💡 使用说明</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="font-medium mb-2">功能说明:</div>
                  <div className="text-gray-300">
                    • <span className="font-medium text-blue-400">动态配置</span>: 支持在线修改API配置，无需重启服务<br />
                    • <span className="font-medium text-green-400">安全存储</span>: API密钥在数据库中安全存储<br />
                    • <span className="font-medium text-purple-400">实时生效</span>: 配置更新后立即生效<br />
                    • <span className="font-medium text-yellow-400">多厂商支持</span>: 支持OpenAI兼容的各种API厂商
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium mb-2">注意事项:</div>
                  <div className="text-gray-300">
                    • URL必须以http://或https://开头<br />
                    • API密钥请妥善保管，避免泄露<br />
                    • 修改配置前请确认API可正常访问<br />
                    • 建议使用具有适当权限的API密钥<br />
                    • 配置保存后客户端会自动使用新配置
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 