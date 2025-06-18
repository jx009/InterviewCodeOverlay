import SubscribedApp from "./_pages/SubscribedApp"
import { UpdateNotification } from "./components/UpdateNotification"
import {
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query"
import { useEffect, useState, useCallback } from "react"
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastVariant
} from "./components/ui/toast"
import { ToastContext } from "./contexts/toast"
import { WelcomeScreen } from "./components/WelcomeScreen"
import SettingsDialog from "./components/Settings/SettingsDialog"
import { WebAuthDialog } from "./components/WebAuth/WebAuthDialog"
import ClickThroughManager from "./components/ClickThroughManager"
import { useWebAuth } from "./hooks/useWebAuth"

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
})

// Root component that provides the QueryClient
function App() {
  const [toastState, setToastState] = useState({
    open: false,
    title: "",
    description: "",
    variant: "neutral" as ToastVariant,
    actionText: "",
    onActionClick: undefined as (() => void) | undefined
  })
  const [credits, setCredits] = useState<number>(999) // Unlimited credits
  const [currentLanguage, setCurrentLanguage] = useState<string>("python")
  const [isInitialized, setIsInitialized] = useState(false)
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isWebAuthOpen, setIsWebAuthOpen] = useState(false)
  const [config, setConfig] = useState({})

  // Web Authentication Hook
  const { 
    authenticated, 
    user, 
    loading: authLoading, 
    connectionStatus 
  } = useWebAuth()

  // Set unlimited credits
  const updateCredits = useCallback(() => {
    setCredits(999) // No credit limit in this version
    window.__CREDITS__ = 999
  }, [])

  // Helper function to safely update language
  const updateLanguage = useCallback((newLanguage: string) => {
    setCurrentLanguage(newLanguage)
    window.__LANGUAGE__ = newLanguage
  }, [])

  // Helper function to mark initialization complete
  const markInitialized = useCallback(() => {
    setIsInitialized(true)
    window.__IS_INITIALIZED__ = true
  }, [])

  // Show toast method (enhanced with action support)
  const showToast = useCallback(
    (
      title: string,
      description: string,
      variant: ToastVariant,
      actionText?: string,
      onActionClick?: () => void
    ) => {
      setToastState({
        open: true,
        title,
        description,
        variant,
        actionText: actionText || "",
        onActionClick: onActionClick || undefined
      })
    },
    []
  )

  // 监听后端发送的通知消息（优化用户体验）
  useEffect(() => {
    const unsubscribers: (() => void)[] = []
    
    if (window.electronAPI?.onNotification) {
      const unsubscribeNotification = window.electronAPI.onNotification((notification: any) => {
        console.log('收到通知:', notification)
        
        // 映射通知类型到Toast变体
        const getToastVariant = (type: string): ToastVariant => {
          switch (type) {
            case 'error': return 'error'
            case 'success': return 'success'
            case 'warning': return 'warning'
            case 'info': return 'info'
            case 'loading': return 'loading'
            default: return 'neutral'
          }
        }
        
        showToast(
          notification.title,
          notification.message,
          getToastVariant(notification.type),
          notification.actions && notification.actions.length > 0 ? notification.actions[0].text : undefined,
          notification.actions && notification.actions.length > 0 ? () => {
            if (notification.actions[0].action === 'open-web-login') {
              // 实际触发登录操作
              setTimeout(async () => {
                console.log('准备触发登录操作')
                try {
                  // 调用后端的登录功能
                  const result = await window.electronAPI.webAuthLogin()
                  if (result.success) {
                    showToast('登录成功', '欢迎回来！', 'success')
                  } else {
                    showToast('登录失败', result.error || '请重试', 'error')
                  }
                } catch (error) {
                  console.error('登录操作失败:', error)
                  showToast('登录失败', '网络错误，请重试', 'error')
                }
              }, 1000)
            }
          } : undefined
        )
      })
      unsubscribers.push(unsubscribeNotification)
    }
    
    // 监听清除通知事件
    if (window.electronAPI?.onClearNotification) {
      const unsubscribeClear = window.electronAPI.onClearNotification(() => {
        console.log('收到清除通知事件')
        setToastState(prev => ({ ...prev, open: false }))
      })
      unsubscribers.push(unsubscribeClear)
    }
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [showToast])

  // 简化的认证检查，只在初始化时触发一次
  useEffect(() => {
    if (isInitialized && !authLoading && !authenticated) {
      // 认证状态由后端智能管理，前端不再频繁检查
      console.log('User not authenticated, auth status managed by backend')
    }
  }, [isInitialized, authenticated, authLoading])

  // Initialize dropdown handler
  useEffect(() => {
    if (isInitialized) {
      // Process all types of dropdown elements with a shorter delay
      const timer = setTimeout(() => {
        // Find both native select elements and custom dropdowns
        const selectElements = document.querySelectorAll('select');
        const customDropdowns = document.querySelectorAll('.dropdown-trigger, [role="combobox"], button:has(.dropdown)');
        
        // Enable native selects
        selectElements.forEach(dropdown => {
          dropdown.disabled = false;
        });
        
        // Enable custom dropdowns by removing any disabled attributes
        customDropdowns.forEach(dropdown => {
          if (dropdown instanceof HTMLElement) {
            dropdown.removeAttribute('disabled');
            dropdown.setAttribute('aria-disabled', 'false');
          }
        });
        
        // 减少终端输出
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialized]);

  // Listen for settings dialog open requests
  useEffect(() => {
    const unsubscribeSettings = window.electronAPI.onShowSettings(() => {
      // 减少终端输出
      setIsSettingsOpen(true);
    });
    
    return () => {
      unsubscribeSettings();
    };
  }, []);

  // Initialize basic app state
  useEffect(() => {
    // Load config and set values
    const initializeApp = async () => {
      try {
        // Set unlimited credits
        updateCredits()
        
        // Load config including language and model settings
        const loadedConfig = await window.electronAPI.getConfig()
        setConfig(loadedConfig || {})
        
        // Load language preference
        if (loadedConfig && loadedConfig.language) {
          updateLanguage(loadedConfig.language)
        } else {
          updateLanguage("python")
        }
        
        // Model settings are now managed through the settings dialog
        // and stored in config as extractionModel, solutionModel, and debuggingModel
        
        markInitialized()
      } catch (error) {
        // 减少终端输出
        // Fallback to defaults
        updateLanguage("python")
        markInitialized()
      }
    }
    
    initializeApp()

    // Event listeners for process events
    const onApiKeyInvalid = () => {
      showToast(
        "认证失效",
        "请重新登录Web配置中心",
        "error"
      )
      setIsWebAuthOpen(true)
    }

    // Setup API key invalid listener
    window.electronAPI.onApiKeyInvalid(onApiKeyInvalid)

    // Define a no-op handler for solution success
    const unsubscribeSolutionSuccess = window.electronAPI.onSolutionSuccess(
      () => {
        // 减少终端输出
        // No credit deduction in this version
      }
    )

    // Cleanup function
    return () => {
      window.electronAPI.removeListener("API_KEY_INVALID", onApiKeyInvalid)
      unsubscribeSolutionSuccess()
      window.__IS_INITIALIZED__ = false
      setIsInitialized(false)
    }
  }, [updateCredits, updateLanguage, markInitialized, showToast])

  // API Key dialog management
  const handleOpenSettings = useCallback(() => {
    // 减少终端输出
    setIsSettingsOpen(true);
  }, []);
  
  const handleCloseSettings = useCallback((open: boolean) => {
    // 减少终端输出
    setIsSettingsOpen(open);
  }, []);

  const handleConfigUpdate = useCallback(async (newConfig: any) => {
    try {
      await window.electronAPI.updateConfig(newConfig)
      setConfig(newConfig)
      showToast("成功", "设置已保存", "success")
      
      // Update language if changed
      if (newConfig.language) {
        updateLanguage(newConfig.language)
      }
    } catch (error) {
      // 减少终端输出
      showToast("错误", "保存设置失败", "error")
    }
  }, [showToast, updateLanguage])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ToastContext.Provider value={{ showToast }}>
          <div className="relative">
            {isInitialized ? (
              // 简化逻辑：直接显示主应用，让后端通知系统处理认证
              <ClickThroughManager
                nonClickThroughSelectors={[
                  // 顶部区域
                  '.top-area', 
                  // 交互元素
                  '.pointer-events-auto',
                  'button',
                  'select',
                  'input',
                  '.settings-button',
                  // 设置相关
                  '.settings-dialog',
                  '[role="dialog"]',
                  // 复制按钮
                  '.absolute.top-2.right-2',
                  // 其他可能需要交互的元素
                  'a',
                  '[role="button"]',
                  '[role="menuitem"]',
                  '[role="tab"]',
                  '[role="switch"]',
                  '[role="checkbox"]',
                  '[role="radio"]',
                  '.react-select__control',
                  '.react-select__menu'
                ]}
              >
                <SubscribedApp
                  credits={credits}
                  currentLanguage={currentLanguage}
                  setLanguage={updateLanguage}
                />
              </ClickThroughManager>
            ) : (
              <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                  <p className="text-white/60 text-sm">
                    Initializing...
                  </p>
                </div>
              </div>
            )}
            <UpdateNotification />
          </div>
          
          {/* Settings Dialog */}
          <SettingsDialog 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)}
            onConfigUpdate={handleConfigUpdate}
            config={config}
          />
          
          {/* Web Authentication Dialog */}
          <WebAuthDialog 
            open={isWebAuthOpen}
            onOpenChange={setIsWebAuthOpen}
          />
          
          <Toast
            open={toastState.open}
            onOpenChange={(open) =>
              setToastState((prev) => ({ ...prev, open }))
            }
            variant={toastState.variant}
            duration={1500}
            actionText={toastState.actionText}
            onActionClick={toastState.onActionClick || undefined}
          >
            <ToastTitle>{toastState.title}</ToastTitle>
            <ToastDescription>{toastState.description}</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastContext.Provider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App