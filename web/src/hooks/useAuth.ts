import { useState, useEffect, useMemo } from 'react';
import { authApi } from '../services/api';
import { SessionProtection } from '../utils/sessionProtection';

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
  inviterId?: string; // 邀请人ID（可选）
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
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const storedSessionId = SessionProtection.getSessionId();
    setSessionId(storedSessionId);
    console.log('🔄 初始化sessionId状态:', storedSessionId ? '存在' : '不存在');
    console.log('📊 会话信息:', SessionProtection.getSessionInfo());
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedSessionId = SessionProtection.getSessionId();
      const token = localStorage.getItem('token');
      
      console.log('🔄 初始化认证状态: ', {
        hasSessionId: !!storedSessionId,
        hasToken: !!token 
      });
      
      if (storedSessionId) {
        try {
          console.log('📡 检查会话状态...');
          
          let response = null;
          
          try {
            console.log('🔍 尝试端点: /api/session_status');
            response = await authApi.getSessionStatus();
            if (response.success && response.user) {
              console.log('✅ 端点1成功');
            }
          } catch (err) {
            console.warn('❌ 端点1失败，尝试下一个');
            
            try {
              console.log('🔍 尝试端点: /api/auth-enhanced/session-status');
              response = await fetch(`/api/auth-enhanced/session-status?sessionId=${storedSessionId}`, {
                headers: {
                  'X-Session-Id': storedSessionId
                },
                credentials: 'include'
              }).then(res => res.json());
              
              if (response.authenticated && response.user) {
                console.log('✅ 端点2成功');
                response = {
                  success: true,
                  user: response.user
                };
              }
            } catch (err2) {
              console.warn('❌ 端点2失败，尝试下一个');
              
              try {
                console.log('🔍 尝试端点: /api/debug/session');
                await fetch(`/api/debug/session`, {
                  headers: {
                    'X-Session-Id': storedSessionId
                  },
                  credentials: 'include'
                });
                
                console.log('⚠️ 服务器可访问，但会话可能过期');
              } catch (err3) {
                console.error('❌ 所有端点均失败，服务器可能未启动', err3);
                setLoading(false);
                return;
              }
            }
          }
          
          if (response && response.success && response.user) {
            setUser(response.user);
            setSessionId(storedSessionId);
            console.log('✅ 增强认证自动登录成功:', response.user);
            setLoading(false);
            return;
          } else {
            console.log('❌ 增强认证会话无效或API调用失败');
            // 更严格的会话清理策略：如果有sessionId但无法获取用户信息，直接清除
            console.log('🔑 会话验证失败，清理sessionId和用户状态');
            SessionProtection.clearSessionId();
            setSessionId(null);
            setUser(null);
          }
        } catch (error) {
          console.error('❌ 检查增强认证会话状态失败:', error);
          // 只有在确认会话真正过期时才清除sessionId
          const isSessionExpiredError = 
            (error as any).response?.status === 401 && 
            ((error as any).response?.data?.message?.includes('会话') || 
             (error as any).response?.data?.message?.includes('过期') ||
             (error as any).response?.data?.message?.includes('未登录'));
          
                     if (isSessionExpiredError) {
             console.log('🔑 确认会话过期，清理sessionId');
             SessionProtection.clearSessionId();
             setSessionId(null);
          } else {
            console.log('⚠️ 网络或服务器错误，保留sessionId');
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
      
      if (!params.email.trim()) {
        throw new Error('请输入邮箱');
      }
      if (!params.password.trim()) {
        throw new Error('请输入密码');
      }
      if (params.password.length < 6) {
        throw new Error('密码长度至少6位');
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(params.email)) {
        throw new Error('请输入有效的邮箱地址');
      }
      
      const response = await authApi.enhancedLogin(params);
      console.log('登录API响应:', response);
      
      if (response.success && response.sessionId && response.user) {
        SessionProtection.saveSessionId(response.sessionId);
        setSessionId(response.sessionId);
        
        if (response.token) {
          localStorage.setItem('token', response.token);
          console.log('🔑 已保存token:', response.token.substring(0, 10) + '...');
        }
        
        setUser(response.user);
        console.log('登录成功，用户信息:', response.user);
        console.log('🔑 已保存sessionId:', response.sessionId.substring(0, 10) + '...');
        
        try {
          console.log('🔄 开始创建共享会话...');
          
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
        // 注册成功后不自动登录，需要用户手动登录
        console.log('注册成功，用户信息:', response.user);
        console.log('🔄 注册成功，需要跳转到登录页面');
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
      const currentSessionId = sessionId || SessionProtection.getSessionId();
      console.log('📋 当前sessionId:', currentSessionId ? '存在' : '不存在');
      
      if (currentSessionId) {
        console.log('📞 调用服务器登出API...');
        await authApi.enhancedLogout();
        console.log('✅ 服务器登出成功');
      }
    } catch (error) {
      console.error('❌ 服务器登出失败:', error);
    } finally {
      console.log('🗑️ 清除本地数据...');
      SessionProtection.clearSessionId();
      localStorage.removeItem('token');
      setSessionId(null);
      setUser(null);
      setError(null);
      
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
        SessionProtection.clearSessionId();
        setSessionId(null);
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('检查会话状态失败:', error);
      SessionProtection.clearSessionId();
      setSessionId(null);
      setUser(null);
      return false;
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  // 🆕 添加手动清除认证状态的方法，用于调试和紧急情况
  const clearAuthState = (): void => {
    console.log('🧹 手动清除认证状态...');
    SessionProtection.clearSessionId();
    localStorage.removeItem('token');
    setSessionId(null);
    setUser(null);
    setError(null);
    console.log('✅ 认证状态已清除');
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

  const isAuthenticated = useMemo(() => {
    const hasUser = !!user;
    const hasSessionId = !!sessionId;
    // 修复：必须同时有用户信息和sessionId才认为已认证，避免无效sessionId导致的问题
    const result = hasUser && hasSessionId;
    console.log('🔍 useAuth isAuthenticated计算:', { hasUser, hasSessionId, result, userInfo: user?.email });
    return result;
  }, [user, sessionId]);
  


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
    clearAuthState, // 新增：手动清除认证状态
    sendResetCode,
    verifyResetCode,
    resetPassword
  };
} 