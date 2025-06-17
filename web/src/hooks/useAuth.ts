import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import type { User, LoginRequest, RegisterRequest } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // 检查用户认证状态
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      const user = await authApi.getCurrentUser();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  // 登录
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await authApi.login(credentials);
      
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      return { success: true };
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        error: error.response?.data?.error || error.message || '登录失败',
      };
    }
  }, []);

  // 注册
  const register = useCallback(async (userData: RegisterRequest) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await authApi.register(userData);
      
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      return { success: true };
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        error: error.response?.data?.error || error.message || '注册失败',
      };
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // 即使API调用失败，也要清除本地状态
      console.error('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    login,
    register,
    logout,
    checkAuth,
  };
} 