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
  const [currentTab, setCurrentTab] = useState('config')

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

  const isAdmin = user?.username === 'admin'

  const handleNavigateToManager = () => {
    window.location.href = '/manager';
  }

  const handleNavigateToRecharge = () => {
    window.location.href = '/recharge';
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
          <div className="flex gap-4">
            {isAdmin && (
              <button
                onClick={handleNavigateToManager}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                  />
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                  />
                </svg>
                积分配置管理
              </button>
            )}
            <button
              onClick={handleNavigateToRecharge}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" 
                />
              </svg>
              积分充值
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('成功') ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {message}
          </div>
        )}

        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setCurrentTab('config')}
            className={`px-4 py-2 font-medium transition-colors ${
              currentTab === 'config'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            个人配置
          </button>
          {isAdmin && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`px-4 py-2 font-medium transition-colors ${
                currentTab === 'admin'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              管理员面板
            </button>
          )}
        </div>

        {currentTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">⚙️ 系统设置</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">主题</label>
                  <select
                    value={config?.theme || 'dark'}
                    onChange={(e) => handleConfigChange('theme', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  >
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                    <option value="system">跟随系统</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">界面透明度</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={config?.display?.opacity || 1}
                    onChange={(e) => handleNestedConfigChange('display', 'opacity', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    当前值: {((config?.display?.opacity || 1) * 100).toFixed(0)}%
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={config?.processing?.autoProcess || false}
                      onChange={(e) => handleNestedConfigChange('processing', 'autoProcess', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">自动处理截图</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'admin' && isAdmin && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🛠️ 管理员控制面板</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">📊 系统统计</h3>
                <p className="text-gray-400 mb-4">查看系统使用情况和用户统计</p>
                <button className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors">
                  查看统计
                </button>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">⚙️ 积分配置</h3>
                <p className="text-gray-400 mb-4">管理AI模型的积分消耗配置</p>
                <button 
                  onClick={handleNavigateToManager}
                  className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
                >
                  配置管理
                </button>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">👥 用户管理</h3>
                <p className="text-gray-400 mb-4">管理用户账户和权限</p>
                <button className="w-full bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded transition-colors">
                  用户管理
                </button>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'config' && (
          <div className="flex justify-end mt-8">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-2 rounded-lg transition-colors"
            >
              {saving ? '保存中...' : '保存配置'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 