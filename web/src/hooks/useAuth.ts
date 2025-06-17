import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import type { User, LoginRequest, RegisterRequest } from '../types';

// 预设账号信息
const DEMO_ACCOUNT = {
  username: '123456',
  password: '123456'
};

// 模拟用户数据
const DEMO_USER: User = {
  id: 'demo-user-id',
  username: '123456',
  email: 'demo@example.com',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

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
      console.log('检查认证状态...');
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('未找到token, 未认证状态');
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      console.log('找到token, 尝试获取用户信息');
      
      // 判断是否为Demo用户
      if (token.startsWith('demo-token-')) {
        console.log('检测到Demo用户，直接设置认证状态');
        setState({ 
          user: DEMO_USER, 
          isLoading: false, 
          isAuthenticated: true 
        });
        return;
      }

      try {
        const user = await authApi.getCurrentUser();
        console.log('成功获取用户信息:', user);
        setState({ user, isLoading: false, isAuthenticated: true });
      } catch (err) {
        console.log('获取用户信息失败，清除token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      console.error('认证状态检查失败:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  // 登录
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      console.log('尝试登录...', credentials.username);
      setState(prev => ({ ...prev, isLoading: true }));
      
      // 检查是否使用了预设账号
      if (credentials.username === DEMO_ACCOUNT.username && 
          credentials.password === DEMO_ACCOUNT.password) {
        console.log('使用预设账号登录');
        // 使用预设账号，直接模拟登录成功
        const fakeToken = 'demo-token-' + Date.now();
        localStorage.setItem('accessToken', fakeToken);
        localStorage.setItem('refreshToken', 'demo-refresh-token');
        
        setState({
          user: DEMO_USER,
          isLoading: false,
          isAuthenticated: true,
        });
        
        console.log('预设账号登录成功');
        return { success: true };
      }
      
      // 正常登录流程
      console.log('尝试API登录');
      const response = await authApi.login(credentials);
      console.log('API登录成功:', response);
      
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('登录失败:', error);
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
      console.log('尝试注册...', userData.email);
      setState(prev => ({ ...prev, isLoading: true }));
      
      // 添加预设账号的特殊处理
      if (userData.username === DEMO_ACCOUNT.username || userData.email === DEMO_USER.email) {
        console.log('使用预设账号注册');
        // 使用预设账号直接模拟注册成功并登录
        const fakeToken = 'demo-token-' + Date.now();
        localStorage.setItem('accessToken', fakeToken);
        localStorage.setItem('refreshToken', 'demo-refresh-token');
        
        setState({
          user: DEMO_USER,
          isLoading: false,
          isAuthenticated: true,
        });
        
        console.log('预设账号注册成功');
        return { success: true };
      }
      
      console.log('尝试API注册');
      const response = await authApi.register(userData);
      console.log('API注册成功:', response);
      
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('注册失败:', error);
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
      console.log('尝试登出...');
      // 检查是否是演示账号
      if (state.user?.id === DEMO_USER.id) {
        console.log('演示账号登出，不调用API');
        // 演示账号不需要调用登出API
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      
      console.log('调用API登出');
      await authApi.logout();
      console.log('API登出成功');
    } catch (error) {
      // 即使API调用失败，也要清除本地状态
      console.error('登出失败:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setState({ user: null, isLoading: false, isAuthenticated: false });
      console.log('已清除登录状态');
    }
  }, [state.user?.id]);

  // 初始化时检查认证状态
  useEffect(() => {
    console.log('初始化认证检查');
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