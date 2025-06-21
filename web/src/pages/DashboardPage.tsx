import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { configApi } from '../services/api';

interface UserConfig {
  aiModel: string;
  programmingModel?: string;
  multipleChoiceModel?: string;
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
  const { user, logout } = useAuth()
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
      const [configData, modelsData, languagesData] = await Promise.all([
        configApi.getConfig(),
        configApi.getAIModels(),
        configApi.getLanguages()
      ])
      
      setConfig(configData)
      setAiModels(modelsData)
      setLanguages(languagesData)
    } catch (error) {
      console.error('Failed to load initial data:', error)
      setMessage('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/'
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  const handleConfigChange = (key: string, value: any) => {
    if (config) {
      setConfig({
        ...config,
        [key]: value
      })
    }
  }

  const handleNestedConfigChange = (section: string, key: string, value: any) => {
    if (config) {
      const currentSection = config[section as keyof UserConfig] as any
      setConfig({
        ...config,
        [section]: {
          ...currentSection,
          [key]: value
        }
      })
    }
  }

  const handleSaveConfig = async () => {
    if (!config) return

    try {
      setSaving(true)
      await configApi.updateConfig(config)
      setMessage('配置保存成功！')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('保存配置失败:', error)
      setMessage('保存配置失败')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">未登录</h2>
          <p>请先登录</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">欢迎，{user.username}！</h1>
            <p className="text-gray-400">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
          >
            退出登录
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('成功') ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI模型配置 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🤖 AI模型配置</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">编程题模型</label>
                <select
                  value={config?.programmingModel || config?.aiModel || ''}
                  onChange={(e) => handleConfigChange('programmingModel', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                >
                  {aiModels.map((model) => (
                    <option key={model.id} value={model.name}>
                      {model.displayName || model.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-400 mt-1">用于代码生成和算法分析</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">选择题模型</label>
                <select
                  value={config?.multipleChoiceModel || config?.aiModel || ''}
                  onChange={(e) => handleConfigChange('multipleChoiceModel', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                >
                  {aiModels.map((model) => (
                    <option key={model.id} value={model.name}>
                      {model.displayName || model.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-400 mt-1">用于选择题识别和分析</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">首选编程语言</label>
                <select
                  value={config?.language || ''}
                  onChange={(e) => handleConfigChange('language', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 显示设置 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🎨 显示设置</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  透明度: {Math.round((config?.display?.opacity || 1) * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={config?.display?.opacity || 1}
                  onChange={(e) => handleNestedConfigChange('display', 'opacity', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">窗口位置</label>
                <select
                  value={config?.display?.position || 'top-right'}
                  onChange={(e) => handleNestedConfigChange('display', 'position', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                >
                  <option value="top-left">左上角</option>
                  <option value="top-right">右上角</option>
                  <option value="bottom-left">左下角</option>
                  <option value="bottom-right">右下角</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoHide"
                  checked={config?.display?.autoHide || false}
                  onChange={(e) => handleNestedConfigChange('display', 'autoHide', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="autoHide" className="text-sm">自动隐藏</label>
              </div>

              {config?.display?.autoHide && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    隐藏延迟: {config?.display?.hideDelay || 3000}ms
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="10000"
                    step="500"
                    value={config?.display?.hideDelay || 3000}
                    onChange={(e) => handleNestedConfigChange('display', 'hideDelay', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 快捷键设置 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">⌨️ 快捷键设置</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">截图快捷键</label>
                <input
                  type="text"
                  value={config?.shortcuts?.takeScreenshot || ''}
                  onChange={(e) => handleNestedConfigChange('shortcuts', 'takeScreenshot', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  placeholder="例如: Ctrl+Shift+S"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">打开队列快捷键</label>
                <input
                  type="text"
                  value={config?.shortcuts?.openQueue || ''}
                  onChange={(e) => handleNestedConfigChange('shortcuts', 'openQueue', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  placeholder="例如: Ctrl+Shift+Q"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">打开设置快捷键</label>
                <input
                  type="text"
                  value={config?.shortcuts?.openSettings || ''}
                  onChange={(e) => handleNestedConfigChange('shortcuts', 'openSettings', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  placeholder="例如: Ctrl+Shift+,"
                />
              </div>
            </div>
          </div>

          {/* 处理设置 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">⚙️ 处理设置</h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoProcess"
                  checked={config?.processing?.autoProcess || false}
                  onChange={(e) => handleNestedConfigChange('processing', 'autoProcess', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="autoProcess" className="text-sm">自动处理截图</label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="saveScreenshots"
                  checked={config?.processing?.saveScreenshots || false}
                  onChange={(e) => handleNestedConfigChange('processing', 'saveScreenshots', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="saveScreenshots" className="text-sm">保存截图</label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  压缩级别: {config?.processing?.compressionLevel || 80}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={config?.processing?.compressionLevel || 80}
                  onChange={(e) => handleNestedConfigChange('processing', 'compressionLevel', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-8 py-3 rounded-lg font-medium transition-colors"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  )
} 