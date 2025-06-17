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

const BASE_URL = 'http://localhost:3001/api';

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterCredentials {
  username: string;
  password: string;
  email: string;
}

interface UserResponse {
  id: string;
  username: string;
  email: string;
  token: string;
}

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
  shortcuts?: {
    takeScreenshot?: string;
    openQueue?: string;
    openSettings?: string;
    [key: string]: string | undefined;
  };
}

// 添加一个本地模拟的配置，用于开发和演示
let localConfig: Config = {
  display: {
    opacity: 0.9,
    position: 'bottom-right',
    autoHide: true,
    hideDelay: 5,
    showCopyButton: true
  },
  aiModel: 'gpt-4o',
  shortcuts: {
    takeScreenshot: 'Alt+S',
    openQueue: 'Alt+Q',
    openSettings: 'Alt+,'
  }
};

// 模拟AI模型列表
const mockAIModels: AIModel[] = [
  { id: '1', name: 'gpt-4o', displayName: 'GPT-4o', provider: 'openai', description: '最新的GPT-4o模型', isActive: true },
  { id: '2', name: 'claude-3-opus', displayName: 'Claude 3 Opus', provider: 'anthropic', description: 'Anthropic的高级模型', isActive: true },
  { id: '3', name: 'claude-3-sonnet', displayName: 'Claude 3 Sonnet', provider: 'anthropic', description: '平衡能力和速度', isActive: true },
  { id: '4', name: 'gemini-pro', displayName: 'Gemini Pro', provider: 'google', description: 'Google的高级AI模型', isActive: true },
];

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { token } = response.data;
          localStorage.setItem('token', token);
          
          // 更新请求的token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (error) {
          console.error('刷新token失败');
          // 登出用户
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(error);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// 认证相关API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<UserResponse> => {
    try {
      console.log('登录请求：', credentials);
      
      // 判断是否为预设账号
      if (credentials.username === '123456' && credentials.password === '123456') {
        console.log('使用预设账号登录');
        return {
          id: 'demo-user',
          username: 'Demo用户',
          email: 'demo@example.com',
          token: 'demo-token-12345'
        };
      }
      
      const response = await api.post<UserResponse>('/auth/login', credentials);
      console.log('登录响应：', response.data);
      return response.data;
    } catch (error) {
      console.error('登录失败：', error);
      throw error;
    }
  },
  
  register: async (credentials: RegisterCredentials): Promise<UserResponse> => {
    try {
      const response = await api.post<UserResponse>('/auth/register', credentials);
      return response.data;
    } catch (error) {
      console.error('注册失败：', error);
      throw error;
    }
  },
  
  getUser: async (): Promise<UserResponse> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到token');
      }
      
      const response = await api.get<UserResponse>('/auth/user');
      return response.data;
    } catch (error) {
      console.error('获取用户信息失败：', error);
      throw error;
    }
  }
};

// 配置相关API
export const configApi = {
  getConfig: async (): Promise<Config> => {
    try {
      // 在实际应用中，这里应该从服务器获取配置
      // const response = await axios.get(`${BASE_URL}/config`);
      // return response.data;
      
      // 使用本地模拟配置
      return localConfig;
    } catch (error) {
      console.error('获取配置失败：', error);
      throw error;
    }
  },
  
  updateConfig: async (config: Partial<Config>): Promise<Config> => {
    try {
      // 在实际应用中，这里应该向服务器发送更新请求
      // const response = await axios.put(`${BASE_URL}/config`, config);
      // return response.data;
      
      // 使用本地模拟配置更新
      localConfig = {
        ...localConfig,
        ...config,
        display: {
          ...localConfig.display,
          ...config.display
        },
        shortcuts: {
          ...localConfig.shortcuts,
          ...config.shortcuts
        }
      };
      
      return localConfig;
    } catch (error) {
      console.error('更新配置失败：', error);
      throw error;
    }
  },
  
  getAIModels: async (): Promise<AIModel[]> => {
    try {
      // 在实际应用中，这里应该从服务器获取AI模型列表
      // const response = await axios.get(`${BASE_URL}/models`);
      // return response.data;
      
      // 使用本地模拟数据
      return mockAIModels;
    } catch (error) {
      console.error('获取AI模型失败：', error);
      throw error;
    }
  },

  getLanguages: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/config/languages');
    return response.data;
  }
};

// 系统API
export const systemApi = {
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get<{ status: string; timestamp: string }>('/health');
    return response.data;
  },
};

export default api; 