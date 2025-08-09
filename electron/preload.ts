console.log("Preload script starting...")
import { contextBridge, ipcRenderer } from "electron"
const { shell } = require("electron")

export const PROCESSING_EVENTS = {
  //global states
  UNAUTHORIZED: "procesing-unauthorized",
  NO_SCREENSHOTS: "processing-no-screenshots",
  OUT_OF_CREDITS: "out-of-credits",
  API_KEY_INVALID: "api-key-invalid",

  //states for generating the initial solution
  INITIAL_START: "initial-start",
  PROBLEM_EXTRACTED: "problem-extracted",
  SOLUTION_SUCCESS: "solution-success",
  INITIAL_SOLUTION_ERROR: "solution-error",
  RESET: "reset",

  //states for processing the debugging
  DEBUG_START: "debug-start",
  DEBUG_SUCCESS: "debug-success", 
  DEBUG_ERROR: "debug-error",
  REQUEST_CODE_FOR_COPY: "request-code-for-copy",
  
  // 🆕 流式输出事件
  SOLUTION_STREAM_CHUNK: "solution-stream-chunk",
  SOLUTION_STREAM_COMPLETE: "solution-stream-complete",
  SOLUTION_STREAM_ERROR: "solution-stream-error"
} as const

// At the top of the file
console.log("Preload script is running")

const electronAPI = {
  // Original methods
  openSubscriptionPortal: async (authData: { id: string; email: string }) => {
    return ipcRenderer.invoke("open-subscription-portal", authData)
  },
  openSettingsPortal: () => ipcRenderer.invoke("open-settings-portal"),
  updateContentDimensions: (dimensions: { width: number; height: number }) =>
    ipcRenderer.invoke("update-content-dimensions", dimensions),
  clearStore: () => ipcRenderer.invoke("clear-store"),
  getScreenshots: () => ipcRenderer.invoke("get-screenshots"),
  deleteScreenshot: (path: string) =>
    ipcRenderer.invoke("delete-screenshot", path),
  toggleMainWindow: async () => {
    console.log("toggleMainWindow called from preload")
    try {
      const result = await ipcRenderer.invoke("toggle-window")
      console.log("toggle-window result:", result)
      return result
    } catch (error) {
      console.error("Error in toggleMainWindow:", error)
      throw error
    }
  },
  // Event listeners
  onScreenshotTaken: (
    callback: (data: { path: string; preview: string }) => void
  ) => {
    const subscription = (_: any, data: { path: string; preview: string }) =>
      callback(data)
    ipcRenderer.on("screenshot-taken", subscription)
    return () => {
      ipcRenderer.removeListener("screenshot-taken", subscription)
    }
  },
  onResetView: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("reset-view", subscription)
    return () => {
      ipcRenderer.removeListener("reset-view", subscription)
    }
  },
  onSolutionStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_START, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.INITIAL_START, subscription)
    }
  },
  onDebugStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_START, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_START, subscription)
    }
  },
  onDebugSuccess: (callback: (data: any) => void) => {
    ipcRenderer.on("debug-success", (_event, data) => callback(data))
    return () => {
      ipcRenderer.removeListener("debug-success", (_event, data) =>
        callback(data)
      )
    }
  },
  onDebugError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
    }
  },
  onSolutionError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
        subscription
      )
    }
  },
  onProcessingNoScreenshots: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    }
  },
  onOutOfCredits: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.OUT_OF_CREDITS, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.OUT_OF_CREDITS, subscription)
    }
  },
  onProblemExtracted: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.PROBLEM_EXTRACTED,
        subscription
      )
    }
  },
  onSolutionSuccess: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.SOLUTION_SUCCESS,
        subscription
      )
    }
  },
  onUnauthorized: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.UNAUTHORIZED, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.UNAUTHORIZED, subscription)
    }
  },
  // External URL handler
  openLink: (url: string) => shell.openExternal(url),
  triggerScreenshot: () => ipcRenderer.invoke("trigger-screenshot"),
  triggerProcessScreenshots: () =>
    ipcRenderer.invoke("trigger-process-screenshots"),
  triggerReset: () => ipcRenderer.invoke("trigger-reset"),
  triggerMoveLeft: () => ipcRenderer.invoke("trigger-move-left"),
  triggerMoveRight: () => ipcRenderer.invoke("trigger-move-right"),
  triggerMoveUp: () => ipcRenderer.invoke("trigger-move-up"),
  triggerMoveDown: () => ipcRenderer.invoke("trigger-move-down"),
  onSubscriptionUpdated: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("subscription-updated", subscription)
    return () => {
      ipcRenderer.removeListener("subscription-updated", subscription)
    }
  },
  onSubscriptionPortalClosed: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("subscription-portal-closed", subscription)
    return () => {
      ipcRenderer.removeListener("subscription-portal-closed", subscription)
    }
  },
  onReset: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.RESET, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.RESET, subscription)
    }
  },
  onRequestCodeForCopy: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.REQUEST_CODE_FOR_COPY, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.REQUEST_CODE_FOR_COPY, subscription)
    }
  },
  startUpdate: () => ipcRenderer.invoke("start-update"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateAvailable: (callback: (info: any) => void) => {
    const subscription = (_: any, info: any) => callback(info)
    ipcRenderer.on("update-available", subscription)
    return () => {
      ipcRenderer.removeListener("update-available", subscription)
    }
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    const subscription = (_: any, info: any) => callback(info)
    ipcRenderer.on("update-downloaded", subscription)
    return () => {
      ipcRenderer.removeListener("update-downloaded", subscription)
    }
  },
  // 🆕 新的积分管理方法
  creditsGet: () => ipcRenderer.invoke("credits:get"),
  creditsCheck: (params: { modelName: string; questionType: string }) => 
    ipcRenderer.invoke("credits:check", params),
  creditsDeduct: (params: { modelName: string; questionType: string; operationId?: string }) => 
    ipcRenderer.invoke("credits:deduct", params),
  creditsRefund: (params: { operationId: string; amount: number; reason?: string }) => 
    ipcRenderer.invoke("credits:refund", params),

  // 🆕 兼容旧系统的方法（逐步废弃）
  decrementCredits: () => ipcRenderer.invoke("decrement-credits"),
  onCreditsUpdated: (callback: (credits: number) => void) => {
    const subscription = (_event: any, credits: number) => callback(credits)
    ipcRenderer.on("credits-updated", subscription)
    return () => {
      ipcRenderer.removeListener("credits-updated", subscription)
    }
  },
  getPlatform: () => process.platform,
  
  // New methods for OpenAI API integration
  getConfig: () => ipcRenderer.invoke("get-config"),
  updateConfig: (config: { apiKey?: string; model?: string; language?: string; opacity?: number }) => 
    ipcRenderer.invoke("update-config", config),
  copyCodeToClipboard: (code: string) => ipcRenderer.invoke("copy-code-to-clipboard", code),
  onShowSettings: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("show-settings-dialog", subscription)
    return () => {
      ipcRenderer.removeListener("show-settings-dialog", subscription)
    }
  },
  checkApiKey: () => ipcRenderer.invoke("check-api-key"),
  validateApiKey: (apiKey: string) => 
    ipcRenderer.invoke("validate-api-key", apiKey),
  openExternal: (url: string) => 
    ipcRenderer.invoke("openExternal", url),
  onApiKeyInvalid: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.API_KEY_INVALID, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.API_KEY_INVALID, subscription)
    }
  },
  removeListener: (eventName: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(eventName, callback)
  },
  onDeleteLastScreenshot: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("delete-last-screenshot", subscription)
    return () => {
      ipcRenderer.removeListener("delete-last-screenshot", subscription)
    }
  },
  deleteLastScreenshot: () => ipcRenderer.invoke("delete-last-screenshot"),
  
  // 添加控制鼠标事件穿透的方法
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => {
    return ipcRenderer.invoke('set-ignore-mouse-events', ignore, options);
  },
  
  // 新增：区域性穿透API
  setIgnoreMouseEventsExcept: (exceptRegions: Array<{x: number, y: number, width: number, height: number}>) => {
    return ipcRenderer.invoke('set-ignore-mouse-events-except', exceptRegions);
  },

  // 新增：显示设置对话框
  showSettings: () => {
    return ipcRenderer.send('show-settings-dialog');
  },

  // Web Authentication methods
  webAuthLogin: () => ipcRenderer.invoke("web-auth-login"),
  webAuthLogout: () => ipcRenderer.invoke("web-auth-logout"),
  webAuthStatus: () => ipcRenderer.invoke("web-auth-status"),
  webSyncConfig: () => ipcRenderer.invoke("web-sync-config"),
  attemptAutoRelogin: () => ipcRenderer.invoke("attempt-auto-relogin"),
  webUpdateConfig: (config: any) => ipcRenderer.invoke("web-update-config", config),
  webGetAIModels: () => ipcRenderer.invoke("web-get-ai-models"),
  webGetLanguages: () => ipcRenderer.invoke("web-get-languages"),
  webCheckConnection: () => ipcRenderer.invoke("web-check-connection"),
  
  // 🆕 透明度控制API
  adjustOpacity: (delta: number) => ipcRenderer.invoke("adjust-opacity", delta),
  getOpacity: () => ipcRenderer.invoke("get-opacity"),
  setOpacity: (opacity: number) => ipcRenderer.invoke("set-opacity", opacity),
  
  // 🆕 背景透明度变更事件监听
  onBackgroundOpacityChanged: (callback: (opacity: number) => void) => {
    const subscription = (_: any, opacity: number) => callback(opacity)
    ipcRenderer.on("background-opacity-changed", subscription)
    return () => {
      ipcRenderer.removeListener("background-opacity-changed", subscription)
    }
  },
  
  // Web Authentication event listeners
  onWebAuthStatus: (callback: (data: { authenticated: boolean; user: any }) => void) => {
    const subscription = (_: any, data: { authenticated: boolean; user: any }) => callback(data)
    ipcRenderer.on("web-auth-status", subscription)
    return () => {
      ipcRenderer.removeListener("web-auth-status", subscription)
    }
  },
  onConfigUpdated: (callback: (config: any) => void) => {
    const subscription = (_: any, config: any) => callback(config)
    ipcRenderer.on("config-updated", subscription)
    return () => {
      ipcRenderer.removeListener("config-updated", subscription)
    }
  },
  
  // 添加通知事件监听器
  onNotification: (callback: (notification: any) => void) => {
    const subscription = (_: any, notification: any) => callback(notification)
    ipcRenderer.on("show-notification", subscription)
    return () => {
      ipcRenderer.removeListener("show-notification", subscription)
    }
  },
  
  // 添加清除通知事件监听器
  onClearNotification: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("clear-notification", subscription)
    return () => {
      ipcRenderer.removeListener("clear-notification", subscription)
    }
  },

  // 🆕 流式输出相关方法
  onSolutionStreamChunk: (callback: (data: {
    delta: string,
    fullContent: string,
    parsedContent: any,
    progress: number,
    isComplete: boolean
  }) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.SOLUTION_STREAM_CHUNK, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.SOLUTION_STREAM_CHUNK, subscription)
    }
  },

  onSolutionStreamComplete: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.SOLUTION_STREAM_COMPLETE, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.SOLUTION_STREAM_COMPLETE, subscription)
    }
  },

  onSolutionStreamError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.SOLUTION_STREAM_ERROR, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.SOLUTION_STREAM_ERROR, subscription)
    }
  },

  // 🆕 取消流式传输
  cancelStreaming: () => ipcRenderer.invoke("cancel-streaming"),
}

// Before exposing the API
console.log(
  "About to expose electronAPI with methods:",
  Object.keys(electronAPI)
)

// Expose the API
contextBridge.exposeInMainWorld("electronAPI", electronAPI)

console.log("electronAPI exposed to window")

// Add this focus restoration handler
ipcRenderer.on("restore-focus", () => {
  // Try to focus the active element if it exists
  const activeElement = document.activeElement as HTMLElement
  if (activeElement && typeof activeElement.focus === "function") {
    activeElement.focus()
  }
})

// Remove auth-callback handling - no longer needed
