import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthContext();
  
  // 检查本地存储的sessionId，与ProtectedRoute保持一致
  const hasSessionId = !!localStorage.getItem('sessionId');
  const hasValidSession = isAuthenticated || hasSessionId;

  const navItems = [
    { name: '首页', path: '/', icon: 'Home' },
    { name: '下载', path: '/download', icon: 'Download' },
    { name: '充值', path: '/recharge', icon: 'CreditCard' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleProfileClick = () => {
    if (hasValidSession) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png" 
                alt="QuizCoze Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-white font-semibold text-lg">QuizCoze</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive(item.path)
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            {/* 使用文档按钮 */}
            <a
              href="https://www.yuque.com/shuaidi-1le9i/fgolgo/cw0hvhlxu0w130gq?singleDoc#"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
            >
              使用文档
            </a>
            
            {/* 个人按钮 */}
            <button
              onClick={handleProfileClick}
              className={`px-3 py-2 text-sm font-medium transition-colors duration-200 flex items-center space-x-1 ${
                location.pathname === '/profile'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {hasValidSession ? (
                <>
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-medium">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span>{user?.username || '个人'}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>登录</span>
                </>
              )}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-gray-300 hover:text-white p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - 简化版，后续可扩展 */}
      <div className="md:hidden bg-black/90 border-t border-gray-800">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`block px-3 py-2 text-base font-medium transition-colors duration-200 ${
                isActive(item.path)
                  ? 'text-blue-400 bg-gray-800'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              {item.name}
            </Link>
          ))}
          <a
            href="https://www.yuque.com/shuaidi-1le9i/fgolgo/cw0hvhlxu0w130gq?singleDoc#"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200"
          >
            使用文档
          </a>
          <button
            onClick={handleProfileClick}
            className={`block w-full text-left px-3 py-2 text-base font-medium transition-colors duration-200 ${
              location.pathname === '/profile'
                ? 'text-blue-400 bg-gray-800'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
          >
            {hasValidSession ? user?.username || '个人' : '登录'}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 