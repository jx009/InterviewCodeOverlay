import React, { useState } from 'react';
import { Settings, LogOut, LogIn, ChevronDown, ChevronUp, Menu, User } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '../../contexts/toast';
import { useWebAuth } from '../../hooks/useWebAuth';

interface HeaderProps {
  currentLanguage: string;
  setLanguage: (language: string) => void;
  onOpenSettings: () => void;
}

// Available programming languages
const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'typescript', label: 'TypeScript' },
];

export function Header({ currentLanguage, setLanguage, onOpenSettings }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { showToast } = useToast();
  
  // 🆕 使用增强认证状态
  const { 
    authenticated, 
    user, 
    loading: authLoading, 
    login, 
    logout: webLogout,
    connectionStatus 
  } = useWebAuth();

  // 🆕 增强认证登出处理
  const handleLogout = async () => {
    console.log('🚪 开始登出流程...');
    try {
      showToast('正在登出...', '请稍等', 'loading');
      console.log('📤 Calling webLogout 函数...');
      const result = await webLogout();
      console.log('📥 webLogout 响应:', result);
      
      if (result.success) {
        console.log('✅ Logout successful');
        showToast('登出成功', '已成功退出登录', 'success');
      } else {
        console.log('❌ Logout failed:', result.error);
        showToast('登出失败', result.error || '请重试', 'error');
      }
    } catch (error) {
      console.error('❌ 登出错误:', error);
      showToast('登出失败', '网络错误，请重试', 'error');
    }
  };

  // 🆕 增强认证登录处理
  const handleLogin = async () => {
    try {
      showToast('正在登录...', '将打开Web登录页面', 'loading');
      const result = await login();
      
      if (result.success) {
        showToast('登录成功', '欢迎回来！', 'success');
      } else {
        showToast('登录失败', result.error || '请重试', 'error');
      }
    } catch (error) {
      console.error('登录错误:', error);
      showToast('登录失败', '网络错误，请重试', 'error');
    }
  };

  // Handle language selection
  const handleLanguageSelect = async (lang: string) => {
    setLanguage(lang);
    setDropdownOpen(false);
    
    // Save language preference to web-side configuration
    try {
      const response = await fetch('http://localhost:3001/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('authToken') || ''
        },
        body: JSON.stringify({ language: lang })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update language configuration');
      }
      
      console.log(`Language preference saved to web configuration: ${lang}`);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Find the current language object
  const currentLangObj = LANGUAGES.find(lang => lang.value === currentLanguage) || LANGUAGES[0];

  return (
    <div 
      className="top-area absolute top-0 left-0 right-0 z-50 pointer-events-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setDropdownOpen(false);
      }}
    >
      {isHovered ? (
        <div className="bg-black p-2 border-b border-white/10 flex items-center justify-between transition-all duration-200">
          <div className="flex items-center space-x-1">
            <span className="text-white text-sm mr-2">语言:</span>
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="flex items-center gap-1 rounded-md bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10 transition-colors"
              >
                {currentLangObj.label}
                {dropdownOpen ? (
                  <ChevronUp className="h-4 w-4 text-white/70" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/70" />
                )}
              </button>
              
              {dropdownOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-md bg-black border border-white/10 shadow-lg">
                  <div className="py-1">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => handleLanguageSelect(lang.value)}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          currentLanguage === lang.value
                            ? 'bg-white/10 text-white'
                            : 'text-white/70 hover:bg-white/5'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 🆕 用户信息显示 */}
            {authenticated && user && (
              <div className="flex items-center space-x-2 px-2 py-1 rounded-md bg-white/5">
                <User className="h-4 w-4 text-green-400" />
                <span className="text-xs text-white/90">欢迎，{user.username}</span>
              </div>
            )}
            
            {/* 🆕 连接状态指示 */}
            {!connectionStatus.connected && !connectionStatus.checking && (
              <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-xs text-red-400">离线</span>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-white/70 hover:text-white hover:bg-white/10"
              onClick={onOpenSettings}
              title="设置 (Ctrl+,)"
            >
              <Settings className="h-4 w-4 mr-1" />
              <span className="text-xs">设置</span>
            </Button>
            
            {/* 🆕 根据认证状态显示登录或登出按钮 */}
            {authenticated ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-red-400/80 hover:text-red-400 hover:bg-white/10"
                onClick={handleLogout}
                disabled={authLoading}
                title="登出 (Ctrl+Q)"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="text-xs">{authLoading ? '登出中...' : '登出'}</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-green-400/80 hover:text-green-400 hover:bg-white/10"
                onClick={handleLogin}
                disabled={authLoading || !connectionStatus.connected}
                title="登录"
              >
                <LogIn className="h-4 w-4 mr-1" />
                <span className="text-xs">{authLoading ? '登录中...' : '登录'}</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-black/50 hover:bg-black/80 p-2 w-8 h-8 rounded-br-lg flex items-center justify-center transition-all duration-200">
          <Menu className="h-4 w-4 text-white/70" />
        </div>
      )}
    </div>
  );
}
