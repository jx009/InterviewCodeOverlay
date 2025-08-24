import SubscribedApp from "./_pages/SubscribedApp"
import { UpdateNotification } from "./components/UpdateNotification"
import {
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query"
import { useEffect, useState, useCallback, useRef } from "react"
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
  const [credits, setCredits] = useState<number>(0) // Real credits from server
  const [isInitialized, setIsInitialized] = useState(false)
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [config, setConfig] = useState({})
  
  // Toast定时器引用，用于清理
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Web Authentication Hook
  const { 
    authenticated, 
    user, 
    loading: authLoading, 
    connectionStatus 
  } = useWebAuth()

  // 🆕 控制认证对话框显示
  // 当未认证时自动显示登录对话框，认证后自动关闭
  const [isWebAuthOpen, setIsWebAuthOpen] = useState(false)
  
  // Update credits from server
  const updateCredits = useCallback((newCredits: number) => {
    setCredits(newCredits)
    window.__CREDITS__ = newCredits
  }, [])

  // 🆕 获取用户积分余额 (通过IPC)
  const fetchUserCredits = useCallback(async () => {
    try {
      const result = await window.electronAPI.creditsGet()
      if (result.success) {
        updateCredits(result.credits)
        console.log('✅ (IPC) Credits balance fetched successfully:', result.credits)
      } else {
        console.error('❌ (IPC) Failed to fetch credits balance:', result.error)
        updateCredits(0)
      }
    } catch (error) {
      console.error('❌ (IPC) Credits balance fetch error:', error)
      updateCredits(0)
    }
  }, [updateCredits])

  // 🆕 监听认证状态变化，自动控制对话框显示
  useEffect(() => {
    if (isInitialized && !authLoading) {
      if (!authenticated) {
        // 未认证时显示登录对话框
        setIsWebAuthOpen(true)
        // 重置积分为0
        updateCredits(0)
      } else {
        // 已认证时关闭登录对话框
        setIsWebAuthOpen(false)
        // 🆕 认证成功后获取积分余额
        fetchUserCredits()
      }
    }
  }, [isInitialized, authenticated, authLoading, updateCredits, fetchUserCredits])


  // Helper function to mark initialization complete
  const markInitialized = useCallback(() => {
    setIsInitialized(true)
    window.__IS_INITIALIZED__ = true
  }, [])

  // Show toast method (enhanced with action support and forced auto-close)
  const showToast = useCallback(
    (
      title: string,
      description: string,
      variant: ToastVariant,
      actionText?: string,
      onActionClick?: () => void
    ) => {
      // 清理之前的定时器
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
        toastTimerRef.current = null
      }
      
      setToastState({
        open: true,
        title,
        description,
        variant,
        actionText: actionText || "",
        onActionClick: onActionClick || undefined
      })
      
      // 强制在1秒后关闭Toast，不受页面焦点状态影响
      toastTimerRef.current = setTimeout(() => {
        setToastState(prev => ({ ...prev, open: false }))
        toastTimerRef.current = null
      }, 1000)
    },
    []
  )

  // 监听后端发送的通知消息（优化用户体验）
  useEffect(() => {
    const unsubscribers: (() => void)[] = []
    
    if (window.electronAPI?.onNotification) {
      const unsubscribeNotification = window.electronAPI.onNotification((notification: any) => {
        console.log('Received notification:', notification)
        
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
              // Actually trigger login operation
              setTimeout(async () => {
                console.log('Preparing to trigger login operation')
                try {
                  // Call backend login function
                  const result = await window.electronAPI.webAuthLogin()
                  if (result.success) {
                    showToast('登录成功', '欢迎回来！', 'success')
                  } else {
                    showToast('登录失败', result.error || '请重试', 'error')
                  }
                } catch (error) {
                  console.error('Login operation failed:', error)
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

  // 🆕 监听背景透明度变更事件
  useEffect(() => {
    const unsubscribeOpacity = window.electronAPI.onBackgroundOpacityChanged?.((opacity: number) => {
      console.log('Background opacity changed:', opacity);
      // 更新CSS变量以控制背景透明度
      document.documentElement.style.setProperty('--bg-opacity', opacity.toString());
    });
    
    return () => {
      unsubscribeOpacity?.();
    };
  }, []);

  // Initialize basic app state
  useEffect(() => {
    // Load config and set values
    const initializeApp = async () => {
      try {
        // Initialize with 0 credits, will be loaded from server when authenticated
        updateCredits(0)
        
        // Load config including model settings
        const loadedConfig = await window.electronAPI.getConfig()
        setConfig(loadedConfig || {})
        
        // Model settings are now managed through the settings dialog
        // and stored in config as extractionModel, solutionModel, and debuggingModel
        
        markInitialized()
      } catch (error) {
        // 减少终端输出
        // Fallback to defaults
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
      // 清理Toast定时器
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
        toastTimerRef.current = null
      }
      window.__IS_INITIALIZED__ = false
      setIsInitialized(false)
    }
  }, [updateCredits, markInitialized, showToast])

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
    } catch (error) {
      // 减少终端输出
      showToast("错误", "保存设置失败", "error")
    }
  }, [showToast])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ToastContext.Provider value={{ showToast }}>
          <div className="relative">
            {isInitialized ? (
              // 🆕 修改逻辑：只有在已认证时才显示主应用
              authenticated ? (
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
                  />
                </ClickThroughManager>
              ) : (
                // 🆕 未认证时显示等待登录的界面
                <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 0, 0.9)'}}>
                  <div className="flex flex-col items-center gap-4 text-center">
                    {authLoading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                        <p className="text-white/60 text-sm">
                          检查认证状态...
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 border-2 border-white/20 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-white text-lg font-medium mb-2">需要登录</h2>
                          <p className="text-white/60 text-sm">
                            请通过Web配置中心登录以使用增强认证功能
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 0, 0.9)'}}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                  <p className="text-white/60 text-sm">
                    初始化中...
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
          
          {/* 🆕 Web Authentication Dialog - 根据认证状态自动控制显示 */}
          <WebAuthDialog 
            open={isWebAuthOpen}
            onOpenChange={setIsWebAuthOpen}
          />
          
          <Toast
            open={toastState.open}
            onOpenChange={(open) => {
              setToastState((prev) => ({ ...prev, open }))
              // 如果用户手动关闭Toast，也要清理定时器
              if (!open && toastTimerRef.current) {
                clearTimeout(toastTimerRef.current)
                toastTimerRef.current = null
              }
            }}
            variant={toastState.variant}
            duration={1000}
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