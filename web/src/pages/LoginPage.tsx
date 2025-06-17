import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, isAuthenticated } = useAuth();
  
  // 填充演示账号
  const fillDemoAccount = () => {
    console.log('填充演示账号');
    setFormData({
      ...formData,
      email: '123456',  // 在登录时，这个字段会被当作username使用
      password: '123456',
    });
  };

  useEffect(() => {
    // 登录状态变化时记录
    console.log('登录页面检测到认证状态变化:', isAuthenticated);
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('提交登录表单', isLogin ? '登录模式' : '注册模式', formData);
    
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        console.log('开始登录流程，使用用户名:', formData.email);
        const result = await login({
          username: formData.email, // 使用email作为username
          password: formData.password,
        });
        console.log('登录结果:', result);
        
        if (!result.success) {
          setError(result.error || '登录失败');
        }
      } else {
        console.log('开始注册流程');
        const result = await register({
          email: formData.email,
          password: formData.password,
          username: formData.username || formData.email.split('@')[0], // 如果没有用户名，使用邮箱前缀
        });
        console.log('注册结果:', result);
        
        if (!result.success) {
          setError(result.error || '注册失败');
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
          {/* 预设账号提示 */}
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
                className="bg-blue-600/50 hover:bg-blue-600/70 text-white text-xs px-2 py-1 rounded"
              >
                一键填充
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-[#3d3d3d] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="请输入用户名"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                {isLogin ? '用户名/邮箱' : '邮箱'}
              </label>
              <input
                type={isLogin ? "text" : "email"}
                required
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-[#3d3d3d] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={isLogin ? "请输入用户名或邮箱" : "请输入邮箱地址"}
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                密码
              </label>
              <input
                type="password"
                required
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-[#3d3d3d] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="请输入密码"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

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
                isLogin ? '继续' : '注册'
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
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                使用 Google 继续
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-center px-3 py-2 sm:px-4 sm:py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-[#3d3d3d] transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                使用 GitHub 继续
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
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ username: '', email: '', password: '' });
              }}
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