import { useState, useEffect } from 'react';
import { authApi } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
}

interface LoginParams {
  email: string;
  password: string;
}

interface RegisterParams {
  token: string;
  verify_code: string;
  email: string;
  password: string;
  username: string;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  user?: User;
  token?: string;
  resetToken?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 检查是否已登录
  useEffect(() => {
    const initializeAuth = async () => {
      const sessionId = localStorage.getItem('sessionId');
      const token = localStorage.getItem('token');
      
      console.log('🔄 初始化认证状态: ', {
        hasSessionId: !!sessionId,
        hasToken: !!token 
      });
      
      if (sessionId) {
        try {
          console.log('📡 检查会话状态...');
          
          // 尝试从不同路径获取会话信息
          let response = null;
          let error = null;
          
          try {
            // 第一种尝试: /api/session_status
            console.log('🔍 尝试端点: /api/session_status');
            response = await authApi.getSessionStatus();
            if (response.success && response.user) {
              console.log('✅ 端点1成功');
            }
          } catch (err) {
            console.warn('❌ 端点1失败，尝试下一个');
            error = err;
            
            try {
              // 第二种尝试: /api/auth-enhanced/session-status 
              console.log('🔍 尝试端点: /api/auth-enhanced/session-status');
              response = await fetch(`http://localhost:3001/api/auth-enhanced/session-status?sessionId=${sessionId}`, {
                headers: {
                  'X-Session-Id': sessionId
                },
                credentials: 'include'
              }).then(res => res.json());
              
              if (response.authenticated && response.user) {
                console.log('✅ 端点2成功');
                // 格式化响应以匹配预期格式
                response = {
                  success: true,
                  user: response.user
                };
              }
            } catch (err2) {
              console.warn('❌ 端点2失败，尝试下一个');
              
              try {
                // 第三种尝试: 直接用sessionId查询后端
                console.log('🔍 尝试端点: /api/debug/session');
                await fetch(`http://localhost:3001/api/debug/session`, {
                  headers: {
                    'X-Session-Id': sessionId
                  },
                  credentials: 'include'
                });
                
                // 如果没有报错，表示服务器正常，但可能会话已过期
                console.log('⚠️ 服务器可访问，但会话可能过期');
              } catch (err3) {
                console.error('❌ 所有端点均失败，服务器可能未启动', err3);
                // 服务器可能未启动，保持用户会话而不是清除
                setLoading(false);
                return;
              }
            }
          }
          
          if (response && response.success && response.user) {
            setUser(response.user);
            console.log('✅ 增强认证自动登录成功:', response.user);
            setLoading(false);
            return;
          } else {
            console.log('❌ 增强认证会话无效，清理sessionId');
            localStorage.removeItem('sessionId');
          }
        } catch (error) {
          console.error('❌ 检查增强认证会话状态失败:', error);
          // 不要马上清除sessionId，可能是临时网络问题
          if ((error as any).response?.status === 401) {
            console.log('🔑 认证失败，清理sessionId');
            localStorage.removeItem('sessionId');
          }
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
      
      console.log('开始登录流程:', params.email);
      
      // 基本验证
      if (!params.email.trim()) {
        throw new Error('请输入邮箱');
      }
      if (!params.password.trim()) {
        throw new Error('请输入密码');
      }
      if (params.password.length < 6) {
        throw new Error('密码长度至少6位');
      }
      
      // 邮箱格式验证
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(params.email)) {
        throw new Error('请输入有效的邮箱地址');
      }
      
      const response = await authApi.enhancedLogin(params);
      console.log('登录API响应:', response);
      
      if (response.success && response.sessionId && response.user) {
        localStorage.setItem('sessionId', response.sessionId);
        
        // 保存认证令牌
        if (response.token) {
          localStorage.setItem('token', response.token);
          console.log('🔑 已保存token:', response.token.substring(0, 10) + '...');
        }
        
        setUser(response.user);
        console.log('登录成功，用户信息:', response.user);
        console.log('🔑 已保存sessionId:', response.sessionId.substring(0, 10) + '...');
        
        // 创建共享会话供Electron客户端使用
        try {
          console.log('🔄 开始创建共享会话...');
          
          // 确保使用正确的sessionId调用API
          const createResponse = await authApi.createSharedSession();
          console.log('✅ 共享会话创建响应:', createResponse);
          
          if (createResponse.success) {
            console.log('✅ 共享会话已创建，Electron客户端可以同步登录状态');
          } else {
            console.error('❌ 创建共享会话失败:', createResponse.message);
          }
        } catch (error: any) {
          console.error('❌ 创建共享会话失败:', error);
          console.error('错误详情:', error.response?.data || error.message);
        }
        
        return { success: true, user: response.user };
      } else {
        const errorMsg = response.message || '登录失败，请检查邮箱和密码';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      let errorMessage = '登录失败';
      
      if (error.response?.data?.message) {
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

  const register = async (params: RegisterParams): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('开始注册流程:', params.email);
      
      // 基本验证
      if (!params.token || !params.verify_code || !params.email || !params.password || !params.username) {
        throw new Error('所有字段都不能为空');
      }
      
      if (params.password.length < 6) {
        throw new Error('密码长度至少6位');
      }
      
      if (params.username.length < 2) {
        throw new Error('用户名长度至少2位');
      }
      
      const response = await authApi.enhancedRegister(params);
      console.log('注册API响应:', response);
      
      if (response.success && response.user) {
        // 保存会话ID和token
        if (response.sessionId) {
          localStorage.setItem('sessionId', response.sessionId);
          console.log('🔑 已保存sessionId:', response.sessionId.substring(0, 10) + '...');
        }
        
        // 保存认证令牌
        if (response.token) {
          localStorage.setItem('token', response.token);
          console.log('🔑 已保存token:', response.token.substring(0, 10) + '...');
        }
        
        setUser(response.user);
        console.log('注册成功，用户信息:', response.user);
        return { success: true, user: response.user };
      } else {
        const errorMsg = response.message || '注册失败';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('注册错误:', error);
      let errorMessage = '注册失败';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 409) {
        errorMessage = '该邮箱已注册';
      } else if (error.response?.status === 500) {
        errorMessage = '服务器错误，请稍后重试';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🚪 Web端开始登出流程...');
    try {
      const sessionId = localStorage.getItem('sessionId');
      console.log('📋 当前sessionId:', sessionId ? '存在' : '不存在');
      
      if (sessionId) {
        console.log('📞 调用服务器登出API...');
        await authApi.enhancedLogout();
        console.log('✅ 服务器登出成功');
      }
    } catch (error) {
      console.error('❌ 服务器登出失败:', error);
    } finally {
      console.log('🗑️ 清除本地数据...');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('token');
      setUser(null);
      setError(null);
      
      // 🆕 登出后跳转到登录页面
      console.log('🔄 跳转到登录页面...');
      window.location.href = '/login';
    }
  };

  const checkSessionStatus = async () => {
    try {
      const response = await authApi.getSessionStatus();
      if (response.success && response.user) {
        setUser(response.user);
        return true;
      } else {
        localStorage.removeItem('sessionId');
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('检查会话状态失败:', error);
      localStorage.removeItem('sessionId');
      setUser(null);
      return false;
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  const sendResetCode = async (email: string): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      if (!email.trim()) {
        throw new Error('请输入邮箱地址');
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('请输入有效的邮箱地址');
      }
      
      const response = await authApi.sendResetCode(email);
      
      if (response.success) {
        return { success: true, token: response.token };
      } else {
        const errorMsg = response.message || '发送重置码失败';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('发送重置码失败:', error);
      let errorMessage = '发送重置码失败';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
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
      
      if (!token || !code) {
        throw new Error('令牌和验证码不能为空');
      }
      
      const response = await authApi.verifyResetCode(token, code);
      
      if (response.success) {
        return { success: true, resetToken: response.resetToken };
      } else {
        const errorMsg = response.message || '验证码验证失败';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('验证重置码失败:', error);
      let errorMessage = '验证码验证失败';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
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
      
      if (!resetToken || !newPassword) {
        throw new Error('重置令牌和新密码不能为空');
      }
      
      if (newPassword.length < 6) {
        throw new Error('密码长度至少6位');
      }
      
      const response = await authApi.resetPassword(resetToken, newPassword);
      
      if (response.success) {
        return { success: true };
      } else {
        const errorMsg = response.message || '密码重置失败';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error('密码重置失败:', error);
      let errorMessage = '密码重置失败';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 计算是否已认证
  const isAuthenticated = !!user;

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    enhancedLogout: logout,
    checkSessionStatus,
    clearError,
    sendResetCode,
    verifyResetCode,
    resetPassword
  };
} 