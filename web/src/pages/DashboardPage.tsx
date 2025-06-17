import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import AIModelSettings from '../components/Settings/AIModelSettings'
import ShortcutSettings from '../components/Settings/ShortcutSettings'
import DisplaySettings from '../components/Settings/DisplaySettings'
import { configApi, Config } from '../services/api'

type ActivePanel = 'ai' | 'shortcuts' | 'display' | null;

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [config, setConfig] = useState<Config>({})
  const [isConfigUpdated, setIsConfigUpdated] = useState(false)
  const [configUpdateMessage, setConfigUpdateMessage] = useState('')

  const handleLogout = async () => {
    await logout()
  }

  const openPanel = (panel: ActivePanel) => {
    setActivePanel(panel)
  }

  const closePanel = () => {
    setActivePanel(null)
  }

  const handleSaveAIModel = async (modelId: string) => {
    try {
      const updatedConfig = await configApi.updateConfig({ aiModel: modelId })
      setConfig(updatedConfig)
      showUpdateMessage('AI模型配置已保存')
      closePanel()
    } catch (error) {
      console.error('保存AI模型失败:', error)
      showUpdateMessage('保存失败，请重试')
    }
  }

  const handleSaveShortcuts = async (shortcuts: Record<string, string>) => {
    try {
      const updatedConfig = await configApi.updateConfig({ shortcuts })
      setConfig(updatedConfig)
      showUpdateMessage('快捷键设置已保存')
      closePanel()
    } catch (error) {
      console.error('保存快捷键设置失败:', error)
      showUpdateMessage('保存失败，请重试')
    }
  }

  const handleSaveDisplaySettings = async (displaySettings: any) => {
    try {
      const updatedConfig = await configApi.updateConfig({ display: displaySettings })
      setConfig(updatedConfig)
      showUpdateMessage('显示设置已保存')
      closePanel()
    } catch (error) {
      console.error('保存显示设置失败:', error)
      showUpdateMessage('保存失败，请重试')
    }
  }

  const showUpdateMessage = (message: string) => {
    setConfigUpdateMessage(message)
    setIsConfigUpdated(true)
    setTimeout(() => {
      setIsConfigUpdated(false)
    }, 3000)
  }

  // 渲染当前活动的设置面板
  const renderActivePanel = () => {
    switch (activePanel) {
      case 'ai':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto">
              <AIModelSettings onClose={closePanel} onSave={handleSaveAIModel} />
            </div>
          </div>
        )
      case 'shortcuts':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto">
              <ShortcutSettings onClose={closePanel} onSave={handleSaveShortcuts} />
            </div>
          </div>
        )
      case 'display':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto">
              <DisplaySettings onClose={closePanel} onSave={handleSaveDisplaySettings} />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-white shadow w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Interview Code Overlay
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">欢迎, {user?.username}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full">
        <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            {isConfigUpdated && (
              <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                {configUpdateMessage}
              </div>
            )}
            
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-4 sm:p-6 lg:p-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  配置中心
                </h2>
                <p className="text-gray-600 mb-6">
                  欢迎使用Interview Code Overlay配置中心
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div 
                    className="bg-white p-4 sm:p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openPanel('ai')}
                  >
                    <h3 className="text-lg font-medium text-gray-900 mb-2">AI模型配置</h3>
                    <p className="text-gray-600">配置AI模型和API密钥</p>
                    <div className="mt-4 flex justify-end">
                      <button 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPanel('ai');
                        }}
                      >
                        配置
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    className="bg-white p-4 sm:p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openPanel('shortcuts')}
                  >
                    <h3 className="text-lg font-medium text-gray-900 mb-2">快捷键设置</h3>
                    <p className="text-gray-600">自定义快捷键组合</p>
                    <div className="mt-4 flex justify-end">
                      <button 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPanel('shortcuts');
                        }}
                      >
                        配置
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    className="bg-white p-4 sm:p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openPanel('display')}
                  >
                    <h3 className="text-lg font-medium text-gray-900 mb-2">显示设置</h3>
                    <p className="text-gray-600">调整界面显示选项</p>
                    <div className="mt-4 flex justify-end">
                      <button 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPanel('display');
                        }}
                      >
                        配置
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* 设置面板 */}
      {renderActivePanel()}
    </div>
  )
} 