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

// 请求拦截器 - 添加JWT token和session ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    const sessionId = localStorage.getItem('sessionId');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (sessionId) {
      config.headers['X-Session-Id'] = sessionId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理token过期
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token过期，尝试刷新
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          
          // 重试原请求
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return api.request(error.config);
        } catch (refreshError) {
          // 刷新失败，清除token并跳转到登录页
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('sessionId');
          window.location.href = '/';
        }
      } else {
        // 没有刷新token，清除token并跳转到登录页
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('sessionId');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authApi = {
  // 🆕 增强认证API
  sendVerificationCode: async (email: string, username?: string) => {
    const response = await api.post('/mail_verify', { email, username });
    return response.data;
  },

  verifyCode: async (token: string, verify_code: string) => {
    const response = await api.post('/verify_code', { token, verify_code });
    return response.data;
  },

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

  enhancedLogin: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/login', credentials);
    return response.data;
  },

  enhancedLogout: async () => {
    const response = await api.post('/logout');
    return response.data;
  },

  getSessionStatus: async () => {
    const response = await api.get('/session_status');
    return response.data;
  },

  // 📱 传统认证API（保持兼容性）
  login: async (credentials: { username: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: { email: string; password: string; username: string }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  createSharedSession: async () => {
    const response = await api.post('/auth/create-shared-session');
    return response.data;
  },

  // 🆕 增强认证共享会话创建
  createEnhancedSharedSession: async () => {
    const response = await api.post('/create-shared-session');
    return response.data;
  },
};

// 配置相关API
export const configApi = {
  getConfig: async () => {
    const response = await api.get('/config');
    return response.data;
  },

  updateConfig: async (config: any) => {
    const response = await api.put('/config', config);
    return response.data;
  },

  resetConfig: async () => {
    const response = await api.post('/config/reset');
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