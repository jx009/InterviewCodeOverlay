import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import DocRedirect from './components/DocRedirect'
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
          <Route path="/doc" element={<DocRedirect />} />
          
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