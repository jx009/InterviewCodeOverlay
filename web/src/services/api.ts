import axios from 'axios';
import type { 
  User, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  UserConfig, 
  AIModel, 
  ApiResponse 
} from '../types';

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
          const response = await axios.post('http://localhost:3001/api/auth/refresh', {
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
          window.location.href = '/login';
        }
      } else {
        // 没有刷新token，清除token并跳转到登录页
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await api.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },
};

// 配置相关API
export const configApi = {
  getConfig: async (): Promise<UserConfig> => {
    const response = await api.get<UserConfig>('/config');
    return response.data;
  },

  updateConfig: async (config: Partial<UserConfig>): Promise<UserConfig> => {
    const response = await api.put<UserConfig>('/config', config);
    return response.data;
  },

  resetConfig: async (): Promise<UserConfig> => {
    const response = await api.post<UserConfig>('/config/reset');
    return response.data;
  },

  getAIModels: async (): Promise<AIModel[]> => {
    const response = await api.get<AIModel[]>('/config/models');
    return response.data;
  },

  getLanguages: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/config/languages');
    return response.data;
  },
};

// 系统API
export const systemApi = {
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get<{ status: string; timestamp: string }>('/health');
    return response.data;
  },
};

export default api; 