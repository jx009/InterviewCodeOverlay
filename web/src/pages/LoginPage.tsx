import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import EmailVerification from '../components/EmailVerification';
import ForgotPasswordPage from './ForgotPasswordPage';
import { UrlUtils } from '../utils/urlUtils';
// import { useNavigate } from 'react-router-dom';

// 🛠️ 添加CSS样式来隐藏浏览器默认的密码显示图标
const passwordInputStyles = `
  input[type="password"]::-ms-reveal,
  input[type="password"]::-ms-clear {
    display: none !important;
  }
  
  input[type="password"]::-webkit-credentials-auto-fill-button,
  input[type="password"]::-webkit-strong-password-auto-fill-button {
    display: none !important;
  }
  
  input[type="text"]::-ms-reveal,
  input[type="text"]::-ms-clear {
    display: none !important;
  }
`;

export default function LoginPage() {
  const [currentPage, setCurrentPage] = useState<'login' | 'forgot-password'>('login');
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [showPassword, setShowPassword] = useState(false);
  
  // 邮箱验证相关状态
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const { 
    login, 
    register, 
    isAuthenticated 
  } = useAuthContext();

  // const navigate = useNavigate();

  // 🆕 检查URL参数，支持注册成功后自动填入邮箱
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');
    const fromRegister = urlParams.get('from') === 'register';
    
    if (fromRegister && emailFromUrl) {
      console.log('检测到注册成功跳转，自动填入邮箱:', emailFromUrl);
      setIsLogin(true);
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



  // 表单验证
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (isLogin) {
      // 登录验证
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
    } else {
      // 注册验证
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
      
      // 确认密码验证
      if (!formData.confirmPassword.trim()) {
        errors.confirmPassword = '请确认密码';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = '两次输入的密码不一致';
      }
      
      // 可选的用户名验证
      if (formData.username && formData.username.length < 2) {
        errors.username = '用户名长度至少2位';
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
    console.log('提交表单', isLogin ? '登录模式' : '注册模式', formData);
    
    if (!validateForm()) {
      console.log('表单验证失败');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // 登录逻辑
        const result = await login({
          email: formData.email,
          password: formData.password,
        });
        
        if (result.success) {
          console.log('登录成功');
          setSuccess('登录成功！正在跳转...');
          
          // 检查是否有登录后的重定向页面
          const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
          console.log('登录成功，检查重定向路径:', redirectAfterLogin);
          
          // 清除重定向信息
          sessionStorage.removeItem('redirectAfterLogin');
          
          // 登录成功后跳转
          setTimeout(() => {
            if (redirectAfterLogin) {
              console.log('🔄 跳转到重定向路径:', redirectAfterLogin);
              window.location.href = redirectAfterLogin;
            } else {
              console.log('🔄 跳转到首页');
              window.location.href = '/';  // 跳转到首页
            }
          }, 1000);  // 1秒后跳转，让用户看到成功提示
        } else {
          console.log('登录失败:', result.error);
          setError(result.error || '登录失败');
        }
      } else {
        // 注册逻辑
        if (!emailVerified) {
          // 需要先进行邮箱验证
          setShowEmailVerification(true);
          setLoading(false);
          return;
        }
        
        // 获取设备绑定的邀请人ID（如果有）
        const inviterId = UrlUtils.getInviterIdForRegistration();
        console.log('🎯 注册时检测到的邀请人ID:', inviterId);
        
        // 使用验证过的邮箱进行注册
        const registerData: any = {
          token: verificationToken,
          verify_code: verificationCode,
          email: formData.email,
          password: formData.password,
          username: formData.username || formData.email.split('@')[0]
        };
        
        // 如果有邀请人ID，添加到注册数据中
        if (inviterId) {
          registerData.inviterId = inviterId;
          console.log('✅ 注册时包含邀请人ID:', inviterId);
        }
        
        const result = await register(registerData);
        
        if (result.success) {
          console.log('注册成功');
          setSuccess('注册成功！请登录');
          // 自动切换到登录模式并填入邮箱
          setIsLogin(true);
          setFormData(prev => ({
            ...prev,
            password: '',
            confirmPassword: '',
            username: ''
          }));
          setEmailVerified(false);
          setVerificationToken('');
          setVerificationCode('');
        } else {
          console.log('注册失败:', result.error);
          setError(result.error || '注册失败');
        }
      }
    } catch (error: any) {
      console.error('提交失败:', error);
      setError(error.message || '操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setValidationErrors({});
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
    });
    setEmailVerified(false);
    setShowEmailVerification(false);
    setVerificationToken('');
    setVerificationCode('');
  };

  // 如果用户已认证，显示加载状态
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-300">正在跳转到仪表板...</p>
          </div>
        </div>
      </div>
    );
  }

  // 忘记密码页面
  if (currentPage === 'forgot-password') {
    return <ForgotPasswordPage onBackToLogin={() => setCurrentPage('login')} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <style>{passwordInputStyles}</style>
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            {isLogin ? '登录账户' : '创建账户'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            {isLogin ? '使用邮箱和密码登录' : '使用邮箱验证注册新账户'}
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* 错误信息 */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* 成功信息 */}
          {success && (
            <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded relative">
              <span className="block sm:inline">{success}</span>
            </div>
          )}



          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* 邮箱输入 */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  邮箱 <span className="text-red-400">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="请输入邮箱地址"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (!isLogin) {
                      setEmailVerified(false);
                    }
                  }}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
                )}
              </div>

              {/* 用户名输入（仅注册时显示） */}
              {!isLogin && (
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                    用户名 <span className="text-gray-500">(可选)</span>
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="请输入用户名（可选，默认使用邮箱前缀）"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                  {validationErrors.username && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.username}</p>
                  )}
                </div>
              )}

              {/* 密码输入 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  密码 <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    required
                    className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder={`请输入密码（至少6位）`}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center bg-transparent hover:bg-transparent focus:outline-none focus:bg-transparent transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.757 6.757M9.878 9.878a3 3 0 00-4.243 4.243m4.243-4.243L12 12m0 0l3.121 3.121M12 12l-3.121-3.121" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400 hover:text-gray-300 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
                )}
              </div>

              {/* 确认密码输入（仅注册时显示） */}
              {!isLogin && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                    确认密码 <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="请再次输入密码"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                  {validationErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              )}
            </div>

            {/* 邮箱验证组件 */}
            {!isLogin && showEmailVerification && (
                           <EmailVerification
               email={formData.email}
               onVerificationSuccess={handleEmailVerificationSuccess}
               onError={handleEmailVerificationError}
             />
            )}

            {/* 邮箱验证成功提示 */}
            {!isLogin && emailVerified && (
              <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>邮箱验证成功！现在可以完成注册</span>
                </div>
              </div>
            )}

            {/* 提交按钮 */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    处理中...
                  </div>
                ) : (
                  isLogin ? '登录' : '注册'
                )}
              </button>
            </div>

            {/* 切换模式 */}
            <div className="text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                {isLogin ? '没有账户？点击注册' : '已有账户？点击登录'}
              </button>
            </div>

            {/* 忘记密码链接 */}
            {isLogin && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setCurrentPage('forgot-password')}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  忘记密码？
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
} 