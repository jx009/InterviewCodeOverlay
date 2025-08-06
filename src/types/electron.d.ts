export interface ElectronAPI {
  // Original methods
  openSubscriptionPortal: (authData: {
    id: string
    email: string
  }) => Promise<{ success: boolean; error?: string }>
  updateContentDimensions: (dimensions: {
    width: number
    height: number
  }) => Promise<void>
  clearStore: () => Promise<{ success: boolean; error?: string }>
  getScreenshots: () => Promise<{
    success: boolean
    previews?: Array<{ path: string; preview: string }> | null
    error?: string
  }>
  deleteScreenshot: (
    path: string
  ) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken: (
    callback: (data: { path: string; preview: string }) => void
  ) => () => void
  onResetView: (callback: () => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: (callback: (data: any) => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onProblemExtracted: (callback: (data: any) => void) => () => void
  onSolutionSuccess: (callback: (data: any) => void) => () => void
  onUnauthorized: (callback: () => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void
  onRequestCodeForCopy: (callback: () => void) => () => void
  copyCodeToClipboard: (code: string) => Promise<{ success: boolean; error?: string }>
  openExternal: (url: string) => void
  toggleMainWindow: () => Promise<{ success: boolean; error?: string }>
  triggerScreenshot: () => Promise<{ success: boolean; error?: string }>
  triggerProcessScreenshots: () => Promise<{ success: boolean; error?: string }>
  triggerReset: () => Promise<{ success: boolean; error?: string }>
  triggerMoveLeft: () => Promise<{ success: boolean; error?: string }>
  triggerMoveRight: () => Promise<{ success: boolean; error?: string }>
  triggerMoveUp: () => Promise<{ success: boolean; error?: string }>
  triggerMoveDown: () => Promise<{ success: boolean; error?: string }>
  onSubscriptionUpdated: (callback: () => void) => () => void
  onSubscriptionPortalClosed: (callback: () => void) => () => void
  startUpdate: () => Promise<{ success: boolean; error?: string }>
  installUpdate: () => void
  onUpdateAvailable: (callback: (info: any) => void) => () => void
  onUpdateDownloaded: (callback: (info: any) => void) => () => void

  // 🆕 新的积分管理方法
  creditsGet: () => Promise<{ success: boolean; credits?: number; error?: string }>
  creditsCheck: (params: { modelName: string; questionType: string }) => Promise<{ 
    success: boolean; 
    sufficient?: boolean; 
    currentCredits?: number; 
    requiredCredits?: number; 
    error?: string 
  }>
  creditsDeduct: (params: { 
    modelName: string; 
    questionType: string; 
    operationId?: string 
  }) => Promise<{ 
    success: boolean; 
    previousCredits?: number; 
    newCredits?: number; 
    deductedAmount?: number; 
    operationId?: string; 
    error?: string 
  }>
  creditsRefund: (params: { 
    operationId: string; 
    amount: number; 
    reason?: string 
  }) => Promise<{ 
    success: boolean; 
    previousCredits?: number; 
    newCredits?: number; 
    refundedAmount?: number; 
    error?: string 
  }>

  // 🆕 兼容旧系统的方法（逐步废弃）
  decrementCredits: () => Promise<void>
  setInitialCredits: (credits: number) => Promise<void>
  onCreditsUpdated: (callback: (credits: number) => void) => () => void
  onOutOfCredits: (callback: () => void) => () => void
  openSettingsPortal: () => Promise<void>
  getPlatform: () => string
  
  // New methods for OpenAI integration
  getConfig: () => Promise<{ apiKey: string; model: string }>
  updateConfig: (config: { apiKey?: string; model?: string }) => Promise<boolean>
  checkApiKey: () => Promise<boolean>
  validateApiKey: (apiKey: string) => Promise<{ valid: boolean; error?: string }>
  openLink: (url: string) => void
  onApiKeyInvalid: (callback: () => void) => () => void
  removeListener: (eventName: string, callback: (...args: any[]) => void) => void

  // Web Authentication methods
  webAuthLogin: () => Promise<{ success: boolean; error?: string }>
  webAuthLogout: () => Promise<{ success: boolean; error?: string }>
  webAuthStatus: () => Promise<{ authenticated: boolean; user: any; sessionId: string; error?: string }>
  webSyncConfig: () => Promise<{ success: boolean; config?: any; error?: string }>
  webUpdateConfig: (config: any) => Promise<{ success: boolean; config?: any; error?: string }>
  webGetAIModels: () => Promise<{ success: boolean; models: any[]; error?: string }>
  webGetLanguages: () => Promise<{ success: boolean; languages: string[]; error?: string }>
  webCheckConnection: () => Promise<{ connected: boolean; error?: string }>
  
  // Web Authentication event listeners
  onWebAuthStatus?: (callback: (data: { authenticated: boolean; user: any }) => void) => () => void
  onConfigUpdated?: (callback: (config: any) => void) => () => void

  // Credits API
  creditsGet: () => Promise<{ success: boolean; credits?: number; error?: string }>
  creditsCheck: (modelName: string, questionType: string) => Promise<{ success: boolean; sufficient?: boolean; current?: number; required?: number; error?: string }>
  creditsDeduct: (modelName: string, questionType: string, operationId: string) => Promise<{ success: boolean; newCredits?: number; error?: string }>
  creditsRefund: (amount: number, operationId: string, reason: string) => Promise<{ success: boolean; newCredits?: number; error?: string }>

  // Notification listeners
  onNotification: (callback: (notification: any) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    electron: {
      ipcRenderer: {
        on: (channel: string, func: (...args: any[]) => void) => void
        removeListener: (
          channel: string,
          func: (...args: any[]) => void
        ) => void
      }
    }
    __CREDITS__: number
    __LANGUAGE__: string
    __IS_INITIALIZED__: boolean
    __AUTH_TOKEN__?: string | null
  }
}
