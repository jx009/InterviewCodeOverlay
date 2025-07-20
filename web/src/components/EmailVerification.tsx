import { useState, useEffect } from 'react';
import { authApi } from '../services/api';

interface EmailVerificationProps {
  email: string;
  username?: string; // 🆕 支持传入用户名用于冲突检查
  onVerificationSuccess: (token: string, code: string) => void;
  onError: (error: string) => void;
  purpose?: 'register' | 'login';
  className?: string;
}

export default function EmailVerification({ 
  email, 
  username,
  onVerificationSuccess, 
  onError,
  purpose = 'register',
  className = ''
}: EmailVerificationProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 倒计时逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // 发送验证码
  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('请先输入邮箱地址');
      return;
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      console.log('发送验证码到:', email, username ? `，用户名: ${username}` : '');
      const response = await authApi.sendVerificationCode(email, username);
      
      if (response.success) {
        setVerificationToken(response.token);
        setCountdown(response.expiresIn || 300); // 默认5分钟
        setSuccess(`验证码已发送到 ${email}`);
        console.log('验证码发送成功，token:', response.token);
        
        // 如果是已注册用户的提示
        if (response.isExistingUser && purpose === 'register') {
          setSuccess(`验证码已发送到 ${email}（该邮箱已注册，建议直接登录）`);
        }
      } else {
        setError(response.error || '发送验证码失败');
      }
    } catch (err: any) {
      console.error('发送验证码失败:', err);
      let errorMessage = '发送验证码失败';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
        
        // 🆕 如果是注册信息冲突，显示详细信息
        if (err.response?.status === 409 && err.response?.data?.details) {
          const conflicts = err.response.data.details;
          const suggestion = err.response.data.suggestion;
          
          errorMessage = '注册信息冲突：\n' + 
                        conflicts.join('\n') + 
                        (suggestion ? '\n\n建议：' + suggestion : '');
        }
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 429) {
        errorMessage = '发送验证码过于频繁，请稍后重试';
      } else if (err.response?.status === 500) {
        errorMessage = '邮件服务暂时不可用，请稍后重试';
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = '网络错误，请检查网络连接';
      }
      
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  // 验证验证码
  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError('请输入验证码');
      return;
    }

    if (!verificationToken) {
      setError('请先获取验证码');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('验证码应为6位数字');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('验证验证码:', verificationCode);
      const response = await authApi.verifyCode(verificationToken, verificationCode);
      
      if (response.success) {
        setSuccess('验证码验证成功！');
        console.log('验证码验证成功');
        onVerificationSuccess(verificationToken, verificationCode);
      } else {
        setError(response.error || '验证码错误');
      }
    } catch (err: any) {
      console.error('验证码验证失败:', err);
      let errorMessage = '验证码验证失败';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 400) {
        errorMessage = '验证码错误或已过期';
      } else if (err.response?.status === 429) {
        errorMessage = '验证码错误次数过多，请重新获取';
      }
      
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 格式化倒计时显示
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 验证码发送按钮 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          邮箱验证
        </label>
        <div className="flex gap-2">
          <div className="flex-1 text-sm text-gray-400 bg-gray-800 px-3 py-2 rounded-lg border border-gray-600">
            {email || '请先输入邮箱'}
          </div>
          <button
            type="button"
            onClick={handleSendCode}
            disabled={sending || countdown > 0 || !email.trim()}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
              sending || countdown > 0 || !email.trim()
                ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500'
            }`}
          >
            {sending ? (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                发送中
              </div>
            ) : countdown > 0 ? (
              formatCountdown(countdown)
            ) : (
              '发送验证码'
            )}
          </button>
        </div>
      </div>

      {/* 验证码输入 */}
      {verificationToken && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            验证码
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
                setError('');
              }}
              placeholder="请输入6位验证码"
              className="flex-1 bg-gray-800 text-white placeholder-gray-400 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={6}
            />
            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={loading || verificationCode.length !== 6}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                loading || verificationCode.length !== 6
                  ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  验证中
                </div>
              ) : (
                '验证'
              )}
            </button>
          </div>
          
          {/* 验证码输入提示 */}
          <div className="text-xs text-gray-500">
            <p>• 验证码有效期为5分钟</p>
            <p>• 每个验证码最多可尝试5次</p>
            {countdown > 0 && <p>• 剩余时间: {formatCountdown(countdown)}</p>}
          </div>
        </div>
      )}

      {/* 成功消息 */}
      {success && (
        <div className="p-3 bg-green-900/30 border border-green-600/50 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-400">{success}</span>
          </div>
        </div>
      )}

      {/* 错误消息 */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-600/50 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-400">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
} 