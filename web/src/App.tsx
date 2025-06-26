import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ManagerPage from './pages/ManagerPage'
import RechargePage from './pages/RechargePage'
import LoadingSpinner from './components/LoadingSpinner'
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, loading, isAuthenticated } = useAuth()
  
  // 只要本地存储中有sessionId就视为已登录
  const hasSessionId = !!localStorage.getItem('sessionId');
  const hasValidSession = isAuthenticated || hasSessionId;
  
  console.log('App渲染状态:', { 
    isAuthenticated, 
    loading, 
    hasUser: !!user, 
    userId: user?.id,
    hasSessionId,
    hasValidSession
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {!hasValidSession ? (
          <Route path="*" element={<LoginPage />} />
        ) : (
          <>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/manager" element={<ManagerPage />} />
            <Route path="/recharge" element={<RechargePage />} />
            {/* 兜底：未匹配到的路径重定向到首页 */}
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App 