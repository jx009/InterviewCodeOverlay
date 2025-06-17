import React, { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LoadingSpinner from './components/LoadingSpinner'
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, isLoading, isAuthenticated, login, logout, register } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {isAuthenticated ? (
        <DashboardPage />
      ) : (
        <LoginPage />
      )}
    </div>
  )
}

export default App 