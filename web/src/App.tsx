import React, { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LoadingSpinner from './components/LoadingSpinner'
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, loading, isAuthenticated } = useAuth()

  useEffect(() => {
    console.log('App检测到认证状态变化:', { isAuthenticated, loading, user: user?.username })
  }, [isAuthenticated, loading, user])

  if (loading) {
    console.log('App渲染加载状态')
    return <LoadingSpinner />
  }

  console.log('App渲染主界面，认证状态:', isAuthenticated)
  return (
    <div className="w-full h-full min-h-screen bg-gray-100 flex flex-col">
      {isAuthenticated ? (
        <DashboardPage />
      ) : (
        <LoginPage />
      )}
    </div>
  )
}

export default App 