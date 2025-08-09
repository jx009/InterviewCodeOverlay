import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import DownloadPage from './pages/DownloadPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import ManagerPage from './pages/ManagerPage'
import RechargePage from './pages/RechargePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import { AuthProvider } from './contexts/AuthContext'
import { UrlUtils } from './utils/urlUtils'
import { useEffect } from 'react'

function App() {
  // 在应用启动时处理邀请链接和设备绑定
  useEffect(() => {
    console.log('🚀 Web应用启动 - 初始化邀请处理');
    
    try {
      // 初始化邀请处理和设备绑定机制
      UrlUtils.initInviteHandling();
      
      // 打印设备绑定状态（用于调试）
      const bindingInfo = UrlUtils.getDeviceBindingInfo();
      console.log('💎 设备绑定状态:', bindingInfo);
      
      if (bindingInfo.isBound) {
        console.log(`✅ 设备已绑定邀请人: ${bindingInfo.inviterId}`);
      } else if (bindingInfo.urlInviterId) {
        console.log(`🔗 检测到邀请链接，邀请人ID: ${bindingInfo.urlInviterId}`);
      } else {
        console.log('📱 普通访问，无邀请关系');
      }
    } catch (error) {
      console.error('❌ 初始化邀请处理失败:', error);
    }
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 公开路由 - 带导航栏 */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="download" element={<DownloadPage />} />
            <Route path="recharge" element={<RechargePage />} />
            <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          </Route>
          
          {/* 🆕 文档重定向路由 */}
          <Route path="/doc" element={
            (() => {
              // 使用立即执行函数创建内联重定向组件
              const DocRedirectComponent = () => {
                useEffect(() => {
                  window.location.href = 'https://www.yuque.com/shuaidi-1le9i/fgolgo/cw0hvhlxu0w130gq?singleDoc#';
                }, []);

                return (
                  <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p className="text-lg mb-2">正在跳转到文档...</p>
                      <p className="text-sm text-gray-400">
                        如果没有自动跳转，请
                        <a 
                          href="https://www.yuque.com/shuaidi-1le9i/fgolgo/cw0hvhlxu0w130gq?singleDoc#" 
                          className="text-blue-400 hover:text-blue-300 underline ml-1"
                        >
                          点击这里
                        </a>
                      </p>
                    </div>
                  </div>
                );
              };
              return <DocRedirectComponent />;
            })()
          } />
          
          {/* 认证相关路由 - 无导航栏 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/manager" element={<ProtectedRoute><ManagerPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App 