import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LoadingSpinner from './components/LoadingSpinner'
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, loading, isAuthenticated } = useAuth()
  const [forceRefresh, setForceRefresh] = useState(0) // 🆕 强制刷新计数器

  useEffect(() => {
    console.log('🔍 App检测到认证状态变化:', { 
      isAuthenticated, 
      loading, 
      user: user?.username,
      timestamp: new Date().toISOString()
    })
    
    // 🆕 详细调试信息
    if (isAuthenticated && user) {
      console.log('✅ 用户已认证，应该显示DashboardPage')
      // 强制一次额外的渲染，确保界面更新
      setForceRefresh(prev => prev + 1)
    } else if (!isAuthenticated && !loading) {
      console.log('🔒 用户未认证，显示LoginPage')
    }
  }, [isAuthenticated, loading, user])

  // 🆕 监听localStorage的sessionId变化，作为备用方案
  useEffect(() => {
    const handleStorageChange = () => {
      const sessionId = localStorage.getItem('sessionId')
      console.log('📡 检测到localStorage变化，sessionId:', sessionId ? '存在' : '不存在')
      
      if (sessionId && !isAuthenticated) {
        console.log('🔄 检测到新的sessionId但用户未认证，强制刷新页面')
        window.location.reload()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isAuthenticated])

  if (loading) {
    console.log('⏳ App渲染加载状态')
    return <LoadingSpinner />
  }

  console.log('🎯 App渲染主界面，认证状态:', isAuthenticated, '用户:', user?.username, 'forceRefresh:', forceRefresh)
  
  if (isAuthenticated && user) {
    console.log('🚀 渲染DashboardPage')
    return (
      <div className="w-full h-full min-h-screen bg-gray-100 flex flex-col">
        <DashboardPage />
      </div>
    )
  } else {
    console.log('🔐 渲染LoginPage')
    return (
      <div className="w-full h-full min-h-screen bg-gray-100 flex flex-col">
        <LoginPage />
      </div>
    )
  }
}

export default App 