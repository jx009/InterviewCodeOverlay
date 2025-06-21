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

// 🆕 增强注册参数
interface EnhancedRegisterParams {
  token: string;
  verify_code: string;
  email: string;
  password: string;
  username: string;
}

// 🆕 增强登录参数
interface EnhancedLoginParams {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  user?: User;
  token?: string; // 🆕 用于密码重置流程
  resetToken?: string; // 🆕 用于密码重置流程
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 检查是否已登录
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const sessionId = localStorage.getItem('sessionId');
      
      // 🆕 优先检查增强认证的会话状态
      if (sessionId) {
        try {
          const response = await authApi.getSessionStatus();
          if (response.success && response.user) {
            setUser(response.user);
            console.log('增强认证自动登录成功:', response.user);
            setLoading(false);
            return;
          } else {
            console.log('增强认证会话无效，清理sessionId');
            localStorage.removeItem('sessionId');
          }
        } catch (error) {
          console.error('检查增强认证会话状态失败:', error);
          localStorage.removeItem('sessionId');
        }
      }
      
      // 📱 检查传统认证
      if (token) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
          console.log('传统认证自动登录成功:', userData);
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

  // 🆕 增强登录流程
  const enhancedLogin = async (params: EnhancedLoginParams): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('开始增强登录流程:', params.email);
      
      // 基本验证
      if (!params.email.trim()) {
        throw new Error('请输入邮箱');
      }
      if (!params.password.trim()) {
        throw new Error('请输入密码');
      }
      
      // 邮箱格式验证
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(params.email)) {
        throw new Error('请输入有效的邮箱地址');
      }
      
      const response = await authApi.enhancedLogin(params);
      console.log('增强登录API响应:', response);
      
      // 🆕 增强登录使用sessionId而不是accessToken
      if (response.success && response.user) {
        // 保存session_id用于认证
        if (response.sessionId) {
          localStorage.setItem('sessionId', response.sessionId);
        }
        setUser(response.user);
        console.log('增强登录成功，用户信息:', response.user);
        
        // 🆕 创建增强认证共享会话供Electron客户端使用
        try {
          await authApi.createEnhancedSharedSession();
          console.log('✅ 增强认证共享会话已创建，Electron客户端可以同步登录状态');
        } catch (error) {
          console.warn('⚠️ 创建增强认证共享会话失败，但不影响Web端登录:', error);
        }
        
        return { success: true, user: response.user };
      } else {
        const errorMsg = response.message || response.error || '登录失败，请检查邮箱和密码';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('增强登录错误:', error);
      let errorMessage = '登录失败';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 401) {
        errorMessage = '邮箱或密码错误';
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

  // 🆕 增强注册流程
  const enhancedRegister = async (params: EnhancedRegisterParams): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('开始增强注册流程:', params.email);
      
      // 基本验证
      if (!params.token.trim()) {
        throw new Error('验证令牌无效');
      }
      if (!params.verify_code.trim()) {
        throw new Error('请输入验证码');
      }
      if (!params.email.trim()) {
        throw new Error('请输入邮箱');
      }
      if (!params.password.trim()) {
        throw new Error('请输入密码');
      }
      if (params.password.length < 6) {
        throw new Error('密码长度至少6位');
      }
      
      const response = await authApi.enhancedRegister(params);
      console.log('增强注册API响应:', response);
      
      // 🆕 注册成功不自动登录，只返回成功状态
      if (response.success) {
        console.log('增强注册成功，用户信息:', response.user);
        return { success: true, user: response.user };
      } else {
        const errorMsg = response.message || response.error || '注册失败';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('增强注册错误:', error);
      let errorMessage = '注册失败';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 400) {
        errorMessage = '验证码错误或已过期';
      } else if (error.response?.status === 409) {
        errorMessage = '用户已存在，请直接登录';
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

  // 🆕 增强登出流程
  const enhancedLogout = async (): Promise<void> => {
    try {
      console.log('用户增强登出');
      await authApi.enhancedLogout();
    } catch (error) {
      console.warn('增强登出API调用失败:', error);
    } finally {
      // 无论API调用是否成功，都清理本地存储
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('sessionId');
      setUser(null);
      setError(null);
    }
  };

  // 🆕 检查会话状态
  const checkSessionStatus = async () => {
    try {
      const response = await authApi.getSessionStatus();
      if (response.success && response.user) {
        setUser(response.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('检查会话状态失败:', error);
      return false;
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  // 🆕 忘记密码功能
  const sendResetCode = async (email: string): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('发送密码重置验证码:', email);
      
      if (!email.trim()) {
        throw new Error('请输入邮箱');
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('请输入有效的邮箱地址');
      }
      
      // 使用专门的密码重置API
      const response = await authApi.sendResetCode(email);
      console.log('发送重置验证码API响应:', response);
      
      if (response.success) {
        return { success: true, token: response.token };
      } else {
        const errorMsg = response.message || response.error || '发送验证码失败';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      console.error('发送重置验证码错误:', err);
      const errorMessage = err.message || '网络错误，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const verifyResetCode = async (token: string, code: string): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('验证密码重置验证码');
      
      if (!token.trim()) {
        throw new Error('验证令牌无效');
      }
      if (!code.trim()) {
        throw new Error('请输入验证码');
      }
      if (code.length !== 6) {
        throw new Error('验证码应为6位数字');
      }
      
      // 使用专门的密码重置验证API
      const response = await authApi.verifyResetCode(token, code);
      console.log('验证重置验证码API响应:', response);
      
      if (response.success) {
        return { success: true, resetToken: response.resetToken };
      } else {
        const errorMsg = response.message || response.error || '验证码验证失败';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      console.error('验证重置验证码错误:', err);
      const errorMessage = err.message || '网络错误，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (resetToken: string, newPassword: string): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('重置密码');
      
      if (!resetToken.trim()) {
        throw new Error('重置令牌无效');
      }
      if (!newPassword.trim()) {
        throw new Error('请输入新密码');
      }
      if (newPassword.length < 6) {
        throw new Error('密码长度至少6位');
      }
      
      // 调用密码重置API
      const response = await authApi.resetPassword(resetToken, newPassword);
      console.log('重置密码API响应:', response);
      
      if (response.success) {
        return { success: true };
      } else {
        const errorMsg = response.error || '密码重置失败';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      console.error('重置密码错误:', err);
      const errorMessage = err.message || '网络错误，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    // 传统API（保持兼容性）
    login,
    register,
    logout,
    // 🆕 增强API
    enhancedLogin,
    enhancedRegister,
    enhancedLogout,
    checkSessionStatus,
    // 🆕 忘记密码API
    sendResetCode,
    verifyResetCode,
    resetPassword,
    clearError,
  };
} 