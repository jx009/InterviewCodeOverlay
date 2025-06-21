import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { configApi } from '../services/api'

interface UserConfig {
  aiModel: string;
  programmingModel?: string;    // 编程题专用模型
  multipleChoiceModel?: string; // 选择题专用模型
  language: string;
  theme: 'light' | 'dark' | 'system';
  shortcuts: {
    takeScreenshot: string;
    openQueue: string;
    openSettings: string;
  };
  display: {
    opacity: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    autoHide: boolean;
    hideDelay: number;
  };
  processing: {
    autoProcess: boolean;
    saveScreenshots: boolean;
    compressionLevel: number;
  };
}

export default function DashboardPage() {
  const { user, enhancedLogout } = useAuth()
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [aiModels, setAiModels] = useState<any[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [configRes, modelsRes, langsRes] = await Promise.all([
        configApi.getConfig(),
        configApi.getAIModels(),
        configApi.getLanguages()
      ])
      
      setConfig(configRes)
      setAiModels(modelsRes)
      setLanguages(langsRes)
    } catch (error) {
      console.error('Failed to load data:', error)
      setMessage('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await enhancedLogout()
  }

  const handleConfigUpdate = async (updates: Partial<UserConfig>) => {
    if (!config) return
    
    try {
      setSaving(true)
      const updatedConfig = { ...config, ...updates }
      const result = await configApi.updateConfig(updatedConfig)
      setConfig(result)
      setMessage('配置已保存')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Failed to update config:', error)
      setMessage('保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-red-400">加载配置失败</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* Header */}
      <header className="bg-[#2d2d2d] border-b border-gray-600 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold">Interview Code Overlay</h1>
              <p className="text-sm text-gray-400">配置中心</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-400">欢迎，</span>
              <span className="text-white font-medium">{user?.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('失败') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 
            'bg-green-500/10 border border-green-500/20 text-green-400'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI模型配置 */}
          <div className="bg-[#2d2d2d] rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              AI模型配置
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  编程题模型
                </label>
                <select
                  value={config.programmingModel || config.aiModel || 'claude-3-5-sonnet-20241022'}
                  onChange={(e) => handleConfigUpdate({ programmingModel: e.target.value })}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-[#3d3d3d] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                >
                  {aiModels.map(model => (
                    <option key={model.id} value={model.name}>
                      {model.displayName} ({model.provider})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">用于代码生成和算法分析</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择题模型
                </label>
                <select
                  value={config.multipleChoiceModel || config.aiModel || 'claude-3-5-sonnet-20241022'}
                  onChange={(e) => handleConfigUpdate({ multipleChoiceModel: e.target.value })}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-[#3d3d3d] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                >
                  {aiModels.map(model => (
                    <option key={model.id} value={model.name}>
                      {model.displayName} ({model.provider})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">用于选择题识别和分析</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  首选编程语言
                </label>
                <select
                  value={config.language || 'python'}
                  onChange={(e) => handleConfigUpdate({ language: e.target.value })}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-[#3d3d3d] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                >
                  {languages.map(lang => (
                    <option key={lang} value={lang.toLowerCase()}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 显示设置 */}
          <div className="bg-[#2d2d2d] rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              显示设置
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  窗口透明度: {Math.round((config.display?.opacity || 1.0) * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.display?.opacity || 1.0}
                  onChange={(e) => handleConfigUpdate({ 
                    display: { ...config.display, opacity: parseFloat(e.target.value) }
                  })}
                  disabled={saving}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  窗口位置
                </label>
                <select
                  value={config.display?.position || 'top-right'}
                  onChange={(e) => handleConfigUpdate({ 
                    display: { ...config.display, position: e.target.value as any }
                  })}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-[#3d3d3d] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                >
                  <option value="top-left">左上角</option>
                  <option value="top-right">右上角</option>
                  <option value="bottom-left">左下角</option>
                  <option value="bottom-right">右下角</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">自动隐藏</span>
                <input
                  type="checkbox"
                  checked={config.display?.autoHide || false}
                  onChange={(e) => handleConfigUpdate({ 
                    display: { ...config.display, autoHide: e.target.checked }
                  })}
                  disabled={saving}
                  className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-600 rounded focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* 处理设置 */}
          <div className="bg-[#2d2d2d] rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              处理设置
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">自动处理截图</span>
                <input
                  type="checkbox"
                  checked={config.processing?.autoProcess || false}
                  onChange={(e) => handleConfigUpdate({ 
                    processing: { ...config.processing, autoProcess: e.target.checked }
                  })}
                  disabled={saving}
                  className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-600 rounded focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">保存截图</span>
                <input
                  type="checkbox"
                  checked={config.processing?.saveScreenshots || false}
                  onChange={(e) => handleConfigUpdate({ 
                    processing: { ...config.processing, saveScreenshots: e.target.checked }
                  })}
                  disabled={saving}
                  className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-600 rounded focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  压缩级别: {Math.round((config.processing?.compressionLevel || 0.8) * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={config.processing?.compressionLevel || 0.8}
                  onChange={(e) => handleConfigUpdate({ 
                    processing: { ...config.processing, compressionLevel: parseFloat(e.target.value) }
                  })}
                  disabled={saving}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* 主题设置 */}
          <div className="bg-[#2d2d2d] rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
              主题设置
            </h2>
            
            <div className="space-y-3">
              {[
                { value: 'light', label: '浅色主题' },
                { value: 'dark', label: '深色主题' },
                { value: 'system', label: '跟随系统' }
              ].map(theme => (
                <div
                  key={theme.value}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                    (config.theme || 'system') === theme.value
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30'
                  }`}
                  onClick={() => !saving && handleConfigUpdate({ theme: theme.value as any })}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        (config.theme || 'system') === theme.value ? 'bg-blue-500' : 'bg-gray-500'
                      }`}
                    />
                    <span className="font-medium">{theme.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 保存状态 */}
        {saving && (
          <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            正在保存...
          </div>
        )}
      </main>
    </div>
  )
} 