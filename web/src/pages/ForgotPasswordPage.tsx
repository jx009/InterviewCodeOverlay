import { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import StepIndicator from '../components/shared/StepIndicator';

// 🛠️ 复用登录页面的密码隐藏样式
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

interface ForgotPasswordPageProps {
  onBackToLogin?: () => void;
}

export default function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [resendCooldown, setResendCooldown] = useState(0);

  const { sendResetCode, verifyResetCode, resetPassword, loading } = useAuthContext();

  const steps = ['验证邮箱', '输入验证码', '设置新密码', '完成'];

  // 步骤1：发送验证码
  const handleSendCode = async () => {
    setError('');
    setValidationErrors({});
    
    if (!email.trim()) {
      setValidationErrors({ email: '请输入邮箱地址' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationErrors({ email: '请输入有效的邮箱地址' });
      return;
    }

    const result = await sendResetCode(email);
    if (result.success && result.token) {
      setVerificationToken(result.token);
      setCurrentStep(2);
      setSuccess('验证码已发送到您的邮箱');
      // 开始倒计时
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setError(result.error || '发送验证码失败');
    }
  };

  // 步骤2：验证码验证成功处理（复用EmailVerification组件）
  // const handleVerificationSuccess = (token: string, code: string) => {
  //   setVerificationToken(token);
  //   setVerificationCode(code);
  //   // 验证验证码
  //   handleVerifyCode(token, code);
  // };

  const handleVerifyCode = async (token: string, code: string) => {
    const result = await verifyResetCode(token, code);
    if (result.success && result.resetToken) {
      setResetToken(result.resetToken);
      setCurrentStep(3);
      setSuccess('验证成功，请设置新密码');
    } else {
      setError(result.error || '验证码验证失败');
    }
  };

  // 步骤3：重置密码
  const handleResetPassword = async () => {
    setError('');
    setValidationErrors({});

    const errors: {[key: string]: string} = {};
    
    if (!newPassword.trim()) {
      errors.newPassword = '请输入新密码';
    } else if (newPassword.length < 6) {
      errors.newPassword = '密码长度至少6位';
    }
    
    if (!confirmPassword.trim()) {
      errors.confirmPassword = '请确认密码';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const result = await resetPassword(resetToken, newPassword);
    if (result.success) {
      setCurrentStep(4);
      setSuccess('密码重置成功！');
    } else {
      setError(result.error || '密码重置失败');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
      setSuccess('');
    } else {
      // 返回登录页
      if (onBackToLogin) {
        onBackToLogin();
      } else {
        window.location.href = '/';
      }
    }
  };

  const handleGoToLogin = () => {
    // 跳转到登录页面
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      window.location.href = `/?email=${encodeURIComponent(email)}`;
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      {/* 注入样式来隐藏浏览器默认图标 */}
      <style dangerouslySetInnerHTML={{ __html: passwordInputStyles }} />
      
      <div className="w-full max-w-md mx-auto">
        {/* Logo 区域 */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mx-auto mb-3 sm:mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v14a2 2 0 002 2h6a2 2 0 002-2v-2m-6-6h6" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">
            重置密码
          </h1>
          <p className="text-gray-400 text-sm">
            Interview Code Overlay
          </p>
        </div>

        {/* 步骤指示器 */}
        <StepIndicator 
          currentStep={currentStep} 
          totalSteps={4} 
          steps={steps} 
        />

        {/* 主要内容区域 */}
        <div className="bg-[#2d2d2d] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl sm:shadow-2xl">
          {/* 错误信息 */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-sm mb-4">
              ❌ {error}
            </div>
          )}

          {/* 成功信息 */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-sm mb-4">
              ✅ {success}
            </div>
          )}

          {/* 步骤1: 邮箱输入 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-gray-400 text-sm">
                  请输入您的注册邮箱，我们将发送验证码到您的邮箱
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  邮箱地址 <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  className={`w-full px-3 py-2 sm:px-4 sm:py-3 bg-[#3d3d3d] border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    validationErrors.email ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="请输入您的邮箱地址"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationErrors.email) {
                      setValidationErrors(prev => ({ ...prev, email: '' }));
                    }
                  }}
                  disabled={loading}
                />
                {validationErrors.email && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.email}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 sm:py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={loading}
                >
                  返回登录
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || !email.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-2 sm:py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {loading ? '发送中...' : '发送验证码'}
                </button>
              </div>
            </div>
          )}

          {/* 步骤2: 验证码输入（自定义实现） */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-gray-400 text-sm">
                  验证码已发送到
                </p>
                <p className="text-blue-400 text-sm font-medium mt-1">
                  {email}
                </p>
              </div>

              {/* 验证码输入框 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  验证码 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                    setError('');
                  }}
                  placeholder="请输入6位验证码"
                  className={`w-full px-3 py-2 sm:px-4 sm:py-3 bg-[#3d3d3d] border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    validationErrors.verificationCode ? 'border-red-500' : 'border-gray-600'
                  }`}
                  maxLength={6}
                  disabled={loading}
                />
                {validationErrors.verificationCode && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.verificationCode}</p>
                )}
                
                {/* 验证码输入提示 */}
                <div className="text-xs text-gray-500 mt-1">
                  <p>• 验证码有效期为5分钟</p>
                  <p>• 请查看您的邮箱垃圾箱</p>
                </div>
              </div>

              {/* 重发验证码 */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || resendCooldown > 0}
                  className={`text-sm transition-colors ${
                    loading || resendCooldown > 0
                      ? 'text-gray-500 cursor-not-allowed'
                      : 'text-blue-400 hover:text-blue-300'
                  }`}
                >
                  {loading ? '发送中...' : resendCooldown > 0 ? `${resendCooldown}秒后可重新发送` : '没有收到验证码？点击重新发送'}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 sm:py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={loading}
                >
                  上一步
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyCode(verificationToken, verificationCode)}
                  disabled={loading || !verificationCode || verificationCode.length !== 6}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-2 sm:py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {loading ? '验证中...' : '验证码验证'}
                </button>
              </div>
            </div>
          )}

          {/* 步骤3: 设置新密码（复用登录页面的密码输入逻辑） */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-gray-400 text-sm">
                  请设置您的新密码，建议使用强密码
                </p>
              </div>

              {/* 新密码输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  新密码 <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`w-full px-3 py-2 sm:px-4 sm:py-3 pr-10 bg-[#3d3d3d] border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      validationErrors.newPassword ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="请输入新密码"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (validationErrors.newPassword) {
                        setValidationErrors(prev => ({ ...prev, newPassword: '' }));
                      }
                    }}
                    disabled={loading}
                    style={{
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                  {/* 眼睛图标 */}
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent hover:bg-transparent focus:outline-none focus:bg-transparent transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5 text-gray-400 hover:text-gray-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400 hover:text-gray-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {validationErrors.newPassword && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.newPassword}</p>
                )}
              </div>

              {/* 确认密码输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  确认新密码 <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  className={`w-full px-3 py-2 sm:px-4 sm:py-3 bg-[#3d3d3d] border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="请再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (validationErrors.confirmPassword) {
                      setValidationErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }
                  }}
                  disabled={loading}
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none'
                  }}
                />
                {validationErrors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.confirmPassword}</p>
                )}

                {/* 密码匹配提示 */}
                {newPassword && confirmPassword && (
                  <div className="mt-1">
                    {newPassword === confirmPassword ? (
                      <p className="text-green-400 text-xs flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        密码匹配
                      </p>
                    ) : (
                      <p className="text-red-400 text-xs flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        密码不匹配
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 sm:py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={loading}
                >
                  上一步
                </button>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-2 sm:py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {loading ? '重置中...' : '重置密码'}
                </button>
              </div>
            </div>
          )}

          {/* 步骤4: 完成 */}
          {currentStep === 4 && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">密码重置成功！</h2>
              <p className="text-gray-400 text-sm mb-6">
                您的密码已成功重置，现在可以使用新密码登录
              </p>
              
              <button
                type="button"
                onClick={handleGoToLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 sm:py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                立即登录
              </button>
            </div>
          )}
        </div>

        {/* 底部条款 */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-gray-500 text-xs">
            如需帮助，请联系{' '}
            <a href="#" className="text-blue-400 hover:text-blue-300">技术支持</a>
          </p>
        </div>
      </div>
    </div>
  );
} 