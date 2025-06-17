import { useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  username: string
  email: string
  createdAt: string
}

interface WebAuthStatus {
  authenticated: boolean
  user: User | null
  loading: boolean
  error: string | null
}

interface WebConfig {
  aiModel: string
  language: string
  theme: 'light' | 'dark' | 'system'
  shortcuts: {
    takeScreenshot: string
    openQueue: string
    openSettings: string
  }
  display: {
    opacity: number
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    autoHide: boolean
    hideDelay: number
  }
  processing: {
    autoProcess: boolean
    saveScreenshots: boolean
    compressionLevel: number
  }
}

export function useWebAuth() {
  const [authStatus, setAuthStatus] = useState<WebAuthStatus>({
    authenticated: false,
    user: null,
    loading: true,
    error: null,
  })
  const [webConfig, setWebConfig] = useState<WebConfig | null>(null)
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    checking: true,
  })

  // 检查认证状态
  const checkAuthStatus = useCallback(async () => {
    try {
      setAuthStatus(prev => ({ ...prev, loading: true, error: null }))
      const status = await window.electronAPI.webAuthStatus()
      
      if (status.error) {
        setAuthStatus({
          authenticated: false,
          user: null,
          loading: false,
          error: status.error,
        })
      } else {
        setAuthStatus({
          authenticated: status.authenticated,
          user: status.user,
          loading: false,
          error: null,
        })
      }
    } catch (error) {
      console.error('Failed to check auth status:', error)
      setAuthStatus({
        authenticated: false,
        user: null,
        loading: false,
        error: 'Failed to check authentication status',
      })
    }
  }, [])

  // 检查Web服务器连接状态
  const checkConnection = useCallback(async () => {
    try {
      setConnectionStatus(prev => ({ ...prev, checking: true }))
      const result = await window.electronAPI.webCheckConnection()
      setConnectionStatus({
        connected: result.connected,
        checking: false,
      })
      return result.connected
    } catch (error) {
      console.error('Failed to check connection:', error)
      setConnectionStatus({
        connected: false,
        checking: false,
      })
      return false
    }
  }, [])

  // 登录
  const login = useCallback(async () => {
    try {
      setAuthStatus(prev => ({ ...prev, loading: true, error: null }))
      const result = await window.electronAPI.webAuthLogin()
      
      if (!result.success) {
        setAuthStatus(prev => ({
          ...prev,
          loading: false,
          error: result.error || '登录失败',
        }))
        return { success: false, error: result.error }
      }
      
      // 登录成功后重新检查状态
      setTimeout(checkAuthStatus, 1000)
      return { success: true }
    } catch (error) {
      console.error('Login failed:', error)
      setAuthStatus(prev => ({
        ...prev,
        loading: false,
        error: '登录过程中出现错误',
      }))
      return { success: false, error: '登录过程中出现错误' }
    }
  }, [checkAuthStatus])

  // 登出
  const logout = useCallback(async () => {
    try {
      setAuthStatus(prev => ({ ...prev, loading: true }))
      const result = await window.electronAPI.webAuthLogout()
      
      if (result.success) {
        setAuthStatus({
          authenticated: false,
          user: null,
          loading: false,
          error: null,
        })
        setWebConfig(null)
      } else {
        setAuthStatus(prev => ({
          ...prev,
          loading: false,
          error: result.error || '登出失败',
        }))
      }
      
      return result
    } catch (error) {
      console.error('Logout failed:', error)
      setAuthStatus(prev => ({
        ...prev,
        loading: false,
        error: '登出过程中出现错误',
      }))
      return { success: false, error: '登出过程中出现错误' }
    }
  }, [])

  // 同步配置
  const syncConfig = useCallback(async () => {
    try {
      const result = await window.electronAPI.webSyncConfig()
      
      if (result.success && result.config) {
        setWebConfig(result.config)
        return { success: true, config: result.config }
      } else {
        console.error('Failed to sync config:', result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('Config sync failed:', error)
      return { success: false, error: '配置同步失败' }
    }
  }, [])

  return {
    // 认证状态
    ...authStatus,
    
    // Web配置
    webConfig,
    
    // 连接状态
    connectionStatus,
    
    // 操作方法
    login,
    logout,
    syncConfig,
    checkAuthStatus,
    checkConnection,
  }
}