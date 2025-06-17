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
  ToastViewport
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
    variant: "neutral" as "neutral" | "success" | "error"
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

  // Show toast method
  const showToast = useCallback(
    (
      title: string,
      description: string,
      variant: "neutral" | "success" | "error"
    ) => {
      setToastState({
        open: true,
        title,
        description,
        variant
      })
    },
    []
  )

  // Check Web authentication status and prompt if not authenticated
  useEffect(() => {
    if (isInitialized && !authLoading) {
      // If user is not authenticated, show Web auth dialog after a short delay
      if (!authenticated) {
        setTimeout(() => {
          setIsWebAuthOpen(true)
        }, 1000)
      }
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
                    currentLanguage={currentLanguage}
                    setLanguage={updateLanguage}
                  />
                </ClickThroughManager>
              ) : (
                <div className="min-h-screen bg-black flex items-center justify-center">
                  <div className="flex flex-col items-center gap-6 p-8 bg-gray-900 rounded-lg border border-gray-700 max-w-md mx-4">
                    <div className="text-center">
                      <h1 className="text-2xl font-bold text-white mb-2">Interview Code Overlay</h1>
                      <p className="text-gray-300 text-sm">需要登录Web配置中心才能使用</p>
                    </div>
                    
                    {authLoading ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-gray-400 text-sm">检查认证状态...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 w-full">
                        <div className="text-center">
                          <p className="text-gray-400 text-sm mb-2">
                            {connectionStatus.connected 
                              ? "请点击下方按钮登录" 
                              : "请先启动Web配置中心"
                            }
                          </p>
                          {user && (
                            <p className="text-green-400 text-xs">
                              上次登录: {user.username}
                            </p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => setIsWebAuthOpen(true)}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          {connectionStatus.connected ? "登录配置中心" : "检查连接状态"}
                        </button>
                        
                        <button
                          onClick={() => setIsSettingsOpen(true)}
                          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
                        >
                          本地设置
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
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