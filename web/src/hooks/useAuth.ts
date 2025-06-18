import { useState, useEffect } from 'react';
import { authApi } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
}

interface LoginParams {
  username: string;
  password: string;
}

interface RegisterParams {
  email: string;
  password: string;
  username?: string;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  user?: User;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 检查是否已登录
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
          console.log('自动登录成功:', userData);
        } catch (error) {
          console.error('获取用户信息失败:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (params: LoginParams): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('开始登录流程:', params.username);
      
      // 基本验证
      if (!params.username.trim()) {
        throw new Error('请输入用户名');
      }
      if (!params.password.trim()) {
        throw new Error('请输入密码');
      }
      if (params.password.length < 2) {
        throw new Error('密码长度至少2位');
      }
      
      const response = await authApi.login(params);
      console.log('登录API响应:', response);
      
      if (response.success && response.accessToken && response.user) {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        setUser(response.user);
        console.log('登录成功，用户信息:', response.user);
        
        // 创建共享会话供Electron客户端使用
        try {
          await authApi.createSharedSession();
          console.log('✅ 共享会话已创建，Electron客户端可以同步登录状态');
        } catch (error) {
          console.warn('⚠️ 创建共享会话失败，但不影响Web端登录:', error);
        }
        
        return { success: true, user: response.user };
      } else {
        const errorMsg = response.error || '登录失败，请检查用户名和密码';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      let errorMessage = '登录失败';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 401) {
        errorMessage = '用户名或密码错误';
      } else if (error.response?.status === 500) {
        errorMessage = '服务器错误，请稍后重试';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = '网络错误，请检查后端服务是否启动';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (params: RegisterParams): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('开始注册流程:', params.email);
      
      // 基本验证
      if (!params.email.trim()) {
        throw new Error('请输入邮箱');
      }
      if (!params.password.trim()) {
        throw new Error('请输入密码');
      }
      if (params.password.length < 2) {
        throw new Error('密码长度至少2位');
      }
      
      // 邮箱格式验证（简单版本）
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(params.email)) {
        throw new Error('请输入有效的邮箱地址');
      }
      
      const registerData = {
        email: params.email,
        password: params.password,
        username: params.username || params.email.split('@')[0]
      };
      
      const response = await authApi.register(registerData);
      console.log('注册API响应:', response);
      
      if (response.success && response.accessToken && response.user) {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        setUser(response.user);
        console.log('注册成功，用户信息:', response.user);
        return { success: true, user: response.user };
      } else {
        const errorMsg = response.error || '注册失败';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('注册错误:', error);
      let errorMessage = '注册失败';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 409) {
        errorMessage = '用户已存在，请使用其他邮箱或直接登录';
      } else if (error.response?.status === 500) {
        errorMessage = '服务器错误，请稍后重试';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = '网络错误，请检查后端服务是否启动';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    console.log('用户登出');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setError(null);
  };

  const clearError = (): void => {
    setError(null);
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    clearError,
  };
} 