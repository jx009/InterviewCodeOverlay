import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import EmailVerification from '../components/EmailVerification';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [useEnhancedAuth, setUseEnhancedAuth] = useState(true); // 🆕 默认使用增强认证
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // 🆕 邮箱验证相关状态
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const { 
    login, 
    register, 
    enhancedLogin, 
    enhancedRegister, 
    isAuthenticated 
  } = useAuth();

  // 🆕 检查URL参数，支持注册成功后自动填入邮箱
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');
    const fromRegister = urlParams.get('from') === 'register';
    
    if (fromRegister && emailFromUrl) {
      console.log('检测到注册成功跳转，自动填入邮箱:', emailFromUrl);
      setIsLogin(true); // 切换到登录模式
      setFormData(prev => ({
        ...prev,
        email: emailFromUrl
      }));
      setSuccess('注册成功！请使用注册邮箱登录');
      
      // 清理URL参数，保持页面整洁
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // 填充演示账号
  const fillDemoAccount = () => {
    console.log('填充演示账号');
    setFormData({
      ...formData,
      email: '123456',  // 在登录时，这个字段会被当作username使用
      password: '123456',
    });
    setError('');
    setSuccess('');
    setValidationErrors({});
  };

  // 表单验证
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (isLogin) {
      // 登录验证
      if (useEnhancedAuth) {
        // 🆕 增强登录验证
        if (!formData.email.trim()) {
          errors.email = '请输入邮箱';
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formData.email)) {
            errors.email = '请输入有效的邮箱地址';
          }
        }
      } else {
        // 传统登录验证
        if (!formData.email.trim()) {
          errors.email = '请输入用户名或邮箱';
        }
      }
      
      if (!formData.password.trim()) {
        errors.password = '请输入密码';
      } else if (formData.password.length < 2) {
        errors.password = '密码长度至少2位';
      }
    } else {
      // 注册验证
      if (useEnhancedAuth) {
        // 🆕 增强注册验证
        if (!formData.email.trim()) {
          errors.email = '请输入邮箱';
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formData.email)) {
            errors.email = '请输入有效的邮箱地址';
          }
        }
        
        if (!formData.password.trim()) {
          errors.password = '请输入密码';
        } else if (formData.password.length < 6) {
          errors.password = '密码长度至少6位';
        }
        
        // 可选的用户名验证
        if (formData.username && formData.username.length < 2) {
          errors.username = '用户名长度至少2位';
        }
      } else {
        // 传统注册验证
        if (!formData.username.trim()) {
          errors.username = '请输入用户名';
        } else if (formData.username.length < 2) {
          errors.username = '用户名长度至少2位';
        }
        
        if (!formData.email.trim()) {
          errors.email = '请输入邮箱';
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formData.email)) {
            errors.email = '请输入有效的邮箱地址';
          }
        }
        
        if (!formData.password.trim()) {
          errors.password = '请输入密码';
        } else if (formData.password.length < 2) {
          errors.password = '密码长度至少2位';
        }
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 🆕 邮箱验证成功回调
  const handleEmailVerificationSuccess = (token: string, code: string) => {
    setVerificationToken(token);
    setVerificationCode(code);
    setEmailVerified(true);
    setShowEmailVerification(false);
    setSuccess('邮箱验证成功！请继续完成注册');
    console.log('邮箱验证成功，token:', token, 'code:', code);
  };

  // 🆕 邮箱验证错误回调
  const handleEmailVerificationError = (error: string) => {
    setError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('提交登录表单', isLogin ? '登录模式' : '注册模式', '增强认证:', useEnhancedAuth, formData);
    
    // 前端验证
    if (!validateForm()) {
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        // 登录流程
        if (useEnhancedAuth) {
          // 🆕 使用增强登录
          console.log('开始增强登录流程，使用邮箱:', formData.email);
          const result = await enhancedLogin({
            email: formData.email,
            password: formData.password,
          });
          
          console.log('增强登录结果:', result);
          
          if (result.success) {
            setSuccess('登录成功！正在跳转...');
            // 🚀 登录成功后短暂显示成功消息，然后让App.tsx自动处理跳转
            setTimeout(() => {
              console.log('登录成功，清除成功消息，让App.tsx显示DashboardPage');
            }, 500);
          } else {
            setError(result.error || '登录失败');
          }
        } else {
          // 传统登录
          console.log('开始传统登录流程，使用用户名:', formData.email);
          const result = await login({
            username: formData.email, // 使用email字段作为username
            password: formData.password,
          });
          
          console.log('传统登录结果:', result);
          
          if (result.success) {
            setSuccess('登录成功！正在跳转...');
            // 🚀 登录成功后短暂显示成功消息，然后让App.tsx自动处理跳转
            setTimeout(() => {
              console.log('登录成功，清除成功消息，让App.tsx显示DashboardPage');
            }, 500);
          } else {
            setError(result.error || '登录失败');
          }
        }
      } else {
        // 注册流程
        if (useEnhancedAuth) {
          // 🆕 使用增强注册
          if (!emailVerified) {
            // 需要先验证邮箱
            setShowEmailVerification(true);
            setLoading(false);
            return;
          }
          
          console.log('开始增强注册流程');
          const result = await enhancedRegister({
            token: verificationToken,
            verify_code: verificationCode,
            email: formData.email,
            password: formData.password,
            username: formData.username || formData.email.split('@')[0],
          });
          
          console.log('增强注册结果:', result);
          
          if (result.success) {
            setSuccess('注册成功！正在跳转到登录界面...');
            
            // 🆕 延迟跳转到登录界面并自动填入邮箱
            setTimeout(() => {
              console.log('注册成功，跳转到登录界面并填入邮箱:', formData.email);
              const currentUrl = new URL(window.location.href);
              const newUrl = `${currentUrl.pathname}?from=register&email=${encodeURIComponent(formData.email)}`;
              window.location.href = newUrl;
            }, 1500);
          } else {
            setError(result.error || '注册失败');
            // 如果注册失败，可能需要重新验证邮箱
            if (result.error?.includes('验证码') || result.error?.includes('过期')) {
              setEmailVerified(false);
              setShowEmailVerification(true);
            }
          }
        } else {
          // 传统注册
          console.log('开始传统注册流程');
          const result = await register({
            email: formData.email,
            password: formData.password,
            username: formData.username || formData.email.split('@')[0],
          });
          
          console.log('传统注册结果:', result);
          
          if (result.success) {
            setSuccess('注册成功！正在跳转到登录界面...');
            
            // 🆕 延迟跳转到登录界面并自动填入邮箱
            setTimeout(() => {
              console.log('注册成功，跳转到登录界面并填入邮箱:', formData.email);
              const currentUrl = new URL(window.location.href);
              const newUrl = `${currentUrl.pathname}?from=register&email=${encodeURIComponent(formData.email)}`;
              window.location.href = newUrl;
            }, 1500);
          } else {
            setError(result.error || '注册失败');
          }
        }
      }
    } catch (err: any) {
      console.error('认证错误:', err);
      const errorMessage = err.response?.data?.error || err.message || '网络错误，请检查后端服务是否启动';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setValidationErrors({});
    setFormData({ username: '', email: '', password: '' });
    // 🆕 重置邮箱验证状态
    setShowEmailVerification(false);
    setEmailVerified(false);
    setVerificationToken('');
    setVerificationCode('');
  };

  // 🆕 切换认证模式
  const toggleAuthMode = () => {
    setUseEnhancedAuth(!useEnhancedAuth);
    setError('');
    setSuccess('');
    setValidationErrors({});
    // 重置邮箱验证状态
    setShowEmailVerification(false);
    setEmailVerified(false);
    setVerificationToken('');
    setVerificationCode('');
  };

  // 登录成功后的自动跳转逻辑（参考test项目的成功做法）
  useEffect(() => {
    if (isAuthenticated) {
      console.log('检测到登录成功，准备跳转...');
      
      // 延迟1.5秒后强制刷新页面，让App.tsx重新渲染
      const timer = setTimeout(() => {
        console.log('执行页面刷新跳转');
        window.location.reload();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // 🚀 如果已经登录，显示跳转页面（参考test项目的成功做法）
  if (isAuthenticated) {
    return (
      <div className="w-full h-full min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl mx-auto mb-6 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-4">登录成功</h1>
          <p className="text-gray-400 text-sm mb-6">正在跳转到配置中心...</p>
          
          {/* 跳转进度指示 */}
          <div className="w-full bg-gray-700 rounded-full h-2 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full animate-pulse w-full"></div>
          </div>
          
          {/* 手动跳转按钮 */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              立即跳转到配置中心
            </button>
            <p className="text-gray-500 text-xs">
              如果没有自动跳转，请点击上面的按钮
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md mx-auto">
        {/* Logo 区域 */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mx-auto mb-3 sm:mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">
            {isLogin ? '登录' : '注册'}
          </h1>
          <p className="text-gray-400 text-sm">
            Interview Code Overlay
          </p>
        </div>

        {/* 登录/注册表单 */}
        <div className="bg-[#2d2d2d] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl sm:shadow-2xl">
          {/* 🆕 认证模式切换 */}
          <div className="mb-4 p-3 bg-gray-800/50 border border-gray-600/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-300">认证模式</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {useEnhancedAuth 
                    ? `增强认证 - ${isLogin ? '邮箱登录' : '邮箱验证注册'}` 
                    : `传统认证 - ${isLogin ? '用户名登录' : '快速注册'}`}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleAuthMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#2d2d2d] ${
                  useEnhancedAuth ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useEnhancedAuth ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 预设账号提示 */}
          {isLogin && !useEnhancedAuth && (
            <div className="mb-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-2 rounded-lg text-sm">
              <p>可使用预设账号快速登录:</p>
              <div className="flex justify-between items-center mt-1">
                <div>
                  <span className="font-medium">用户名:</span> 123456<br/>
                  <span className="font-medium">密码:</span> 123456
                </div>
                <button 
                  type="button"
                  onClick={fillDemoAccount}
                  className="bg-blue-600/50 hover:bg-blue-600/70 text-white text-xs px-2 py-1 rounded transition-colors"
                >
                  一键填充
                </button>
              </div>
            </div>
          )}

          {/* 🆕 增强认证说明 */}
          {useEnhancedAuth && (
            <div className="mb-4 bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-2 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium">增强认证模式</p>
                  <p className="text-xs text-purple-300 mt-1">
                    {isLogin 
                      ? '• 使用邮箱登录，支持30位会话ID\n• 自动多端同步登录状态' 
                      : '• 邮箱验证码注册，更安全\n• 验证码5分钟有效期'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 错误信息 */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-sm">
                ❌ {error}
              </div>
            )}

            {/* 成功信息 */}
            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-sm">
                ✅ {success}
              </div>
            )}

            {/* 注册时的用户名字段 */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  用户名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 sm:px-4 sm:py-3 bg-[#3d3d3d] border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    validationErrors.username ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="请输入用户名"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
                {validationErrors.username && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.username}</p>
                )}
              </div>
            )}

            {/* 邮箱/用户名字段 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                {(isLogin && !useEnhancedAuth) ? '用户名/邮箱' : '邮箱'} <span className="text-red-400">*</span>
              </label>
              <input
                type={(isLogin && !useEnhancedAuth) ? "text" : "email"}
                className={`w-full px-3 py-2 sm:px-4 sm:py-3 bg-[#3d3d3d] border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  validationErrors.email ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder={(isLogin && !useEnhancedAuth) ? "请输入用户名或邮箱" : "请输入邮箱地址"}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  // 🆕 重置邮箱验证状态当邮箱改变时
                  if (useEnhancedAuth && !isLogin) {
                    setEmailVerified(false);
                    setShowEmailVerification(false);
                  }
                }}
              />
              {validationErrors.email && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.email}</p>
              )}
            </div>

            {/* 密码字段 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                密码 <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                className={`w-full px-3 py-2 sm:px-4 sm:py-3 bg-[#3d3d3d] border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  validationErrors.password ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="请输入密码"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              {validationErrors.password && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.password}</p>
              )}
            </div>

            {/* 🆕 邮箱验证组件 */}
            {useEnhancedAuth && !isLogin && showEmailVerification && (
              <EmailVerification
                email={formData.email}
                username={formData.username}
                onVerificationSuccess={handleEmailVerificationSuccess}
                onError={handleEmailVerificationError}
                purpose="register"
                className="border-t border-gray-600 pt-4"
              />
            )}

            {/* 🆕 邮箱验证成功提示 */}
            {useEnhancedAuth && !isLogin && emailVerified && (
              <div className="p-3 bg-green-900/30 border border-green-600/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-400">邮箱验证成功，请继续注册</span>
                </div>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-2 sm:py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#2d2d2d]"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isLogin ? '登录中...' : '注册中...'}
                </div>
              ) : (
                isLogin ? '登录' : '注册'
              )}
            </button>

            {/* 分割线 */}
            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#2d2d2d] text-gray-400">或</span>
              </div>
            </div>

            {/* 第三方登录按钮 */}
            <div className="space-y-2 sm:space-y-3">
              <button
                type="button"
                className="w-full flex items-center justify-center px-3 py-2 sm:px-4 sm:py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-[#3d3d3d] transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="opacity-50">使用 Google 继续（即将支持）</span>
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-center px-3 py-2 sm:px-4 sm:py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-[#3d3d3d] transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="opacity-50">使用 GitHub 继续（即将支持）</span>
              </button>
            </div>
          </form>

          {/* 切换登录/注册 */}
          <div className="mt-4 sm:mt-6 text-center">
            <span className="text-gray-400 text-sm">
              {isLogin ? '没有账户？ ' : '已有账户？ '}
            </span>
            <button
              type="button"
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              onClick={toggleMode}
            >
              {isLogin ? '注册' : '登录'}
            </button>
          </div>
        </div>

        {/* 底部条款 */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-gray-500 text-xs">
            继续即表示您同意我们的{' '}
            <a href="#" className="text-blue-400 hover:text-blue-300">服务条款</a>
            {' '}和{' '}
            <a href="#" className="text-blue-400 hover:text-blue-300">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
} 