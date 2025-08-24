import axios from 'axios';
import { SessionProtection } from '../utils/sessionProtection';
// Import removed - will be added back when needed

// 使用Vite代理，开发环境使用相对路径
const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'http://localhost:3001/api' // 生产环境连接后端
  : '/api'; // 开发环境使用Vite代理

// Removed unused interfaces

// 扩展配置类型定义
export interface ExtendedDisplayConfig {
  opacity?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  autoHide?: boolean;
  hideDelay?: number;
  showCopyButton?: boolean;
}

export interface Config {
  display?: ExtendedDisplayConfig;
  aiModel?: string;
  programmingModel?: string; // 编程题专用模型
  multipleChoiceModel?: string; // 选择题专用模型
  shortcuts?: {
    takeScreenshot?: string;
    openQueue?: string;
    openSettings?: string;
    [key: string]: string | undefined;
  };
}

// Removed unused local config and mock models - these are now handled by the backend

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 🆕 确保Cookie被发送
});

// 全局变量控制token获取状态，避免并发获取
let isTokenFetching = false;
let tokenFetchPromise: Promise<string | null> | null = null;

// Token获取函数
const fetchTokenFromSession = async (sessionId: string, baseURL: string): Promise<string | null> => {
  if (isTokenFetching && tokenFetchPromise) {
    console.log('🔄 token获取中，等待完成...');
    return await tokenFetchPromise;
  }

  isTokenFetching = true;
  tokenFetchPromise = (async () => {
    try {
      console.log('🔄 检测到sessionId但无token，尝试获取token...');
      const sessionResponse = await fetch(`${baseURL}/session_status`, {
        headers: {
          'X-Session-Id': sessionId
        },
        credentials: 'include'
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.success && sessionData.token) {
          localStorage.setItem('token', sessionData.token);
          console.log('✅ 从会话状态获取到token:', sessionData.token.substring(0, 10) + '...');
          return sessionData.token;
        }
      }
      return null;
    } catch (error: any) {
      console.log('⚠️ 获取token失败，继续使用sessionId:', error?.message || '未知错误');
      return null;
    } finally {
      isTokenFetching = false;
      tokenFetchPromise = null;
    }
  })();

  return await tokenFetchPromise;
};

// 请求拦截器 - 添加认证信息
api.interceptors.request.use(
  async (config) => {
    // 使用SessionProtection获取sessionId，包含自动恢复功能
    const sessionId = SessionProtection.getSessionId();
    let token = localStorage.getItem('token');

    // 如果有sessionId但没有token，尝试通过会话状态获取token（避免并发获取）
    if (sessionId && !token && !isTokenFetching) {
      token = await fetchTokenFromSession(sessionId, config.baseURL || BASE_URL);
    }

    // 添加调试信息
    console.log(`🔍 请求拦截器检查: ${config.method?.toUpperCase()} ${config.url}`, {
      hasSessionId: !!sessionId,
      sessionIdPrefix: sessionId ? sessionId.substring(0, 10) + '...' : '无',
      hasToken: !!token,
      sessionInfo: SessionProtection.getSessionInfo()
    });

    if (sessionId) {
      config.headers['X-Session-Id'] = sessionId;
    }

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理会话过期
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const currentSessionId = localStorage.getItem('sessionId');
      console.log('🚫 请求返回401未授权状态', {
        url: error.config?.url,
        method: error.config?.method,
        hasSessionId: !!currentSessionId,
        sessionIdPrefix: currentSessionId ? currentSessionId.substring(0, 10) + '...' : '无'
      });

      // 检查是否需要跳转到登录页面
      const currentPath = window.location.pathname;

      // 排除某些不需要强制跳转的特殊路径
      const isLoginPage = currentPath === '/login';
      const isPublicPath = ['/login', '/forgot-password'].includes(currentPath);
      // 充值页面也阻止自动跳转，让页面自己的逻辑处理
      const isRechargePage = currentPath === '/recharge';

      // 检查是否是真的会话过期（而不是其他401错误）
      const isSessionExpired = error.response?.data?.message?.includes('会话') ||
                              error.response?.data?.message?.includes('过期') ||
                              error.response?.data?.message?.includes('未登录');

      console.log('🔍 401错误分析:', {
        isSessionExpired,
        errorMessage: error.response?.data?.message,
        currentPath,
        isPublicPath,
        isRechargePage
      });

             // 仅当确实是会话过期且不是公开页面时才清除localStorage和跳转
       if (isSessionExpired && !isPublicPath && !isRechargePage) {
         console.log('💥 确认会话过期，清除认证信息');

         // 使用SessionProtection清除认证信息
         SessionProtection.clearSessionId();
         localStorage.removeItem('token');

         // 保存当前URL，以便登录后可以跳回
         sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);

         // 只有非登录页面才跳转
         if (!isLoginPage) {
           console.log('🔄 认证失效，跳转到登录页面...');
           window.location.href = '/login';
         }
       } else {
        console.log('⚠️ 401错误但不清除会话信息', {
          reason: isSessionExpired ? '在例外页面' : '不是会话过期错误',
          path: currentPath,
          isPublicPath,
          isRechargePage,
          isSessionExpired
        });
      }
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authApi = {
  // 发送邮箱验证码
  sendVerificationCode: async (email: string, username?: string) => {
    const response = await api.post('/mail_verify', { email, username });
    return response.data;
  },

  // 验证邮箱验证码
  verifyCode: async (token: string, verify_code: string) => {
    const response = await api.post('/verify_code', { token, verify_code });
    return response.data;
  },

  // 用户注册
  enhancedRegister: async (userData: {
    token: string;
    verify_code: string;
    email: string;
    password: string;
    username: string;
    inviterId?: string; // 邀请人ID（可选）
  }) => {
    const response = await api.post('/user_register', userData);
    return response.data;
  },

  // 用户登录
  enhancedLogin: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/login', { email: credentials.email, password: credentials.password });
    return response.data;
  },

  // 用户登出
  enhancedLogout: async () => {
    const response = await api.post('/logout');
    return response.data;
  },

  // 获取会话状态
  getSessionStatus: async () => {
    // 修正请求路径，尝试使用正确的API端点
    console.log('🔍 请求会话状态...');
    try {
      // 先尝试访问主会话状态端点
      const response = await api.get('/session_status');
      console.log('✅ 会话状态响应:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ 主会话状态请求失败，尝试备用端点:', error);
      // 如果第一个端点失败，尝试增强认证的会话状态端点
      try {
        const response = await api.get('/auth-enhanced/session-status');
        console.log('✅ 增强认证会话状态响应:', response.data);
        return response.data;
      } catch (secondError) {
        console.error('❌ 所有会话状态请求失败:', secondError);
        throw secondError;
      }
    }
  },

  // 创建共享会话
  createSharedSession: async () => {
    const response = await api.post('/create-shared-session');
    return response.data;
  },

  // 密码重置 - 发送重置码
  sendResetCode: async (email: string) => {
    const response = await api.post('/send_reset_code', { email });
    return response.data;
  },

  // 密码重置 - 验证重置码
  verifyResetCode: async (token: string, verify_code: string) => {
    const response = await api.post('/verify_reset_code', { token, verify_code });
    return response.data;
  },

  // 密码重置 - 重置密码
  resetPassword: async (resetToken: string, newPassword: string) => {
    const response = await api.post('/reset_password', {
      token: resetToken,
      password: newPassword
    });
    return response.data;
  },
};

// 配置相关API
export const configApi = {
  getConfig: async () => {
    const response = await api.get('/config');
    return response.data;
  },

  updateConfig: async (config: Config) => {
    const response = await api.put('/config', config);
    return response.data;
  },

  getAIModels: async () => {
    const response = await api.get('/config/models');
    return response.data;
  },

  getLanguages: async () => {
    const response = await api.get('/config/languages');
    return response.data;
  },
};

// 系统API
export const systemApi = {
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

// 支付相关API
export const paymentApi = {
  // 获取支付套餐列表
  getPackages: async () => {
    const response = await api.get('/payment/packages');
    return response.data;
  },

  // 根据ID获取支付套餐详情
  getPackageById: async (id: number) => {
    const response = await api.get(`/payment/packages/${id}`);
    return response.data;
  },

  // 创建充值订单
  createOrder: async (data: { packageId: number; paymentMethod?: string }) => {
    const response = await api.post('/recharge/create-order', {
      packageId: data.packageId
    });
    return response.data;
  },

  // 查询订单状态
  getOrderStatus: async (orderNo: string) => {
    const response = await api.get(`/recharge/order-status/${orderNo}`);
    return response.data;
  },

  // 取消订单
  cancelOrder: async (orderNo: string) => {
    const response = await api.post(`/payment/orders/${orderNo}/cancel`);
    return response.data;
  },

  // 获取用户订单列表
  getUserOrders: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    method?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get('/recharge/history', { params });
    return response.data;
  },
};

// 积分交易记录API
export const pointsApi = {
  // 获取用户积分余额
  getBalance: async () => {
    const response = await api.get('/points/balance');
    return response.data;
  },

  // 获取用户积分交易记录
  getTransactions: async (params?: {
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/points/transactions', { params });
    return response.data;
  }
};

// 🆕 客户端积分API (server-simple.js)
export const clientCreditsApi = {
  // 获取用户积分余额
  getBalance: async () => {
    const response = await api.get('/client/credits');
    return response.data;
  },

  // 获取用户积分交易记录
  getTransactions: async (params?: {
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/client/credits/transactions', { params });
    return response.data;
  },

  // 获取积分统计
  getStats: async () => {
    const response = await api.get('/client/credits/stats');
    return response.data;
  },

  // 充值积分
  recharge: async (data: {
    amount: number;
    description?: string;
  }) => {
    const response = await api.post('/client/credits/recharge', data);
    return response.data;
  }
};

// 邀请相关API
export const inviteApi = {
  // 生成邀请链接
  generateInviteUrl: async () => {
    const response = await api.post('/invite/generate');
    return response.data;
  },

  // 验证邀请标识
  validateInviteIdentifier: async (identifier: string) => {
    const response = await api.get(`/invite/validate/${identifier}`);
    return response.data;
  },

  // 获取邀请注册记录
  getInviteRegistrations: async (params: {
    page?: number;
    limit?: number;
    userId?: string;
    startDate?: string;
    endDate?: string;
    email?: string;
  } = {}) => {
    const response = await api.get('/invite/registrations', {
      params
    });
    return response.data;
  },

  // 获取邀请用户充值记录
  getInviteRecharges: async (params: {
    page?: number;
    limit?: number;
    userId?: string;
    startDate?: string;
    endDate?: string;
    email?: string;
  } = {}) => {
    const response = await api.get('/invite/recharges', {
      params
    });
    return response.data;
  },

  // 获取邀请统计数据
  getInviteStats: async (params: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const response = await api.get('/invite/stats', {
      params
    });
    return response.data;
  },

  // 获取用户邀请数据汇总（区分角色）
  getInviteSummary: async () => {
    const response = await api.get('/invite/summary');
    return response.data;
  },

  // 获取流量手佣金记录
  getCommissionRecords: async (params: {
    page?: number;
    limit?: number;
  } = {}) => {
    const response = await api.get('/invite/commissions', {
      params
    });
    return response.data;
  }
};

// 管理员API
export const adminApi = {
  // 获取流量手列表
  getTrafficAgents: async () => {
    const response = await api.get('/admin/users/traffic-agents');
    return response.data;
  },

  // 设置/取消用户流量手身份
  setTrafficAgent: async (userId: number, isTrafficAgent: boolean) => {
    const response = await api.put(`/admin/users/${userId}/traffic-agent`, {
      isTrafficAgent
    });
    return response.data;
  },

  // 获取邀请配置
  getInviteConfigs: async () => {
    const response = await api.get('/admin/invite/configs');
    return response.data;
  },

  // 更新邀请配置
  updateInviteConfigs: async (configs: Array<{configKey: string; configValue: number}>) => {
    const response = await api.put('/admin/invite/configs', {
      configs
    });
    return response.data;
  }
};

export default api; 