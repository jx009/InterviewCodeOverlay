import React, { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LoadingSpinner from './components/LoadingSpinner'
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, loading, isAuthenticated } = useAuth()

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
    } else if (!isAuthenticated && !loading) {
      console.log('🔒 用户未认证，显示LoginPage')
    }
  }, [isAuthenticated, loading, user])

  if (loading) {
    console.log('⏳ App渲染加载状态')
    return <LoadingSpinner />
  }

  console.log('🎯 App渲染主界面，认证状态:', isAuthenticated, '用户:', user?.username)
  
  if (isAuthenticated) {
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