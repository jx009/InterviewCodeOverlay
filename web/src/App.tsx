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

function App() {
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