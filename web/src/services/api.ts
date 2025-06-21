import axios from 'axios';
// Import removed - will be added back when needed

const BASE_URL = 'http://localhost:3001/api';

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

// 请求拦截器 - 添加session ID
api.interceptors.request.use(
  (config) => {
    const sessionId = localStorage.getItem('sessionId');
    
    if (sessionId) {
      config.headers['X-Session-Id'] = sessionId;
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
      // 会话过期，清除sessionId并跳转到登录页
      localStorage.removeItem('sessionId');
      window.location.href = '/';
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
  }) => {
    const response = await api.post('/user_register', userData);
    return response.data;
  },

  // 用户登录
  enhancedLogin: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/login', credentials);
    return response.data;
  },

  // 用户登出
  enhancedLogout: async () => {
    const response = await api.post('/logout');
    return response.data;
  },

  // 获取会话状态
  getSessionStatus: async () => {
    const response = await api.get('/session_status');
    return response.data;
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

export default api; 