import { useState, useEffect, useCallback } from 'react'
import { useWebAuth } from './useWebAuth'

interface LanguageConfig {
  language: string
  loading: boolean
  error: string | null
  refetch: () => void
}

export const useLanguageConfig = (): LanguageConfig => {
  const [language, setLanguage] = useState<string>('python') // 默认为python
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  // 获取认证状态
  const { authenticated, webConfig } = useWebAuth()

  const fetchLanguageConfig = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // If not authenticated, use default language
      if (!authenticated) {
        console.log('🔒 Not authenticated, using default language: python')
        setLanguage('python')
        return
      }

      // First try to get language config from cached webConfig
      if (webConfig?.language) {
        const configLanguage = webConfig.language
        setLanguage(configLanguage)
        console.log(`🌐 Got programming language from cached Web config: ${configLanguage}`)
        return
      }

      // If not in cache, get web config via Electron IPC
      const result = await window.electronAPI.webSyncConfig()
      
      if (!result.success) {
        console.warn('Failed to get config, using default language:', result.error)
        setLanguage('python')
        return
      }

      // Set language, use default python if language field is missing
      const newLanguage = result.config?.language || 'python'
      setLanguage(newLanguage)
      
      console.log(`🌐 Got programming language from Web config API: ${newLanguage}`)
      
    } catch (err) {
      console.error('Failed to get language config:', err)
      setError(err instanceof Error ? err.message : 'Failed to get language config')
      // Use default value on error
      setLanguage('python')
    } finally {
      setLoading(false)
    }
  }, [authenticated, webConfig])

  useEffect(() => {
    fetchLanguageConfig()
  }, [fetchLanguageConfig])

  // 监听认证状态变化，重新获取配置
  useEffect(() => {
    if (authenticated) {
      fetchLanguageConfig()
    } else {
      // Use default value when not authenticated
      setLanguage('python')
      setLoading(false)
      setError(null)
    }
  }, [authenticated, fetchLanguageConfig])

  return { language, loading, error, refetch: fetchLanguageConfig }
}