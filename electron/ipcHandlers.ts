// ipcHandlers.ts

import { ipcMain, shell, dialog } from "electron"
import { randomBytes } from "crypto"
import { IIpcHandlerDeps } from "./main"
import { configHelper } from "./ConfigHelper"
import { simpleAuthManager } from "./SimpleAuthManager"

export function initializeIpcHandlers(deps: IIpcHandlerDeps): void {
  console.log("Initializing IPC handlers")

  // Configuration handlers
  ipcMain.handle("get-config", () => {
    return configHelper.loadConfig();
  })

  ipcMain.handle("update-config", (_event, updates) => {
    return configHelper.updateConfig(updates);
  })

  ipcMain.handle("check-api-key", () => {
    // API key is now built-in, always available
    return true;
  })
  
  ipcMain.handle("validate-api-key", async (_event, apiKey) => {
    // API key is now built-in, always valid
    return { 
      valid: true, 
      error: null 
    };
  })

  // Credits handlers
  ipcMain.handle("set-initial-credits", async (_event, credits: number) => {
    const mainWindow = deps.getMainWindow()
    if (!mainWindow) return

    try {
      // Set the credits in a way that ensures atomicity
      await mainWindow.webContents.executeJavaScript(
        `window.__CREDITS__ = ${credits}`
      )
      mainWindow.webContents.send("credits-updated", credits)
    } catch (error) {
      console.error("Error setting initial credits:", error)
      throw error
    }
  })

  ipcMain.handle("decrement-credits", async () => {
    const mainWindow = deps.getMainWindow()
    if (!mainWindow) return

    try {
      const currentCredits = await mainWindow.webContents.executeJavaScript(
        "window.__CREDITS__"
      )
      if (currentCredits > 0) {
        const newCredits = currentCredits - 1
        await mainWindow.webContents.executeJavaScript(
          `window.__CREDITS__ = ${newCredits}`
        )
        mainWindow.webContents.send("credits-updated", newCredits)
      }
    } catch (error) {
      console.error("Error decrementing credits:", error)
    }
  })

  // Screenshot queue handlers
  ipcMain.handle("get-screenshot-queue", () => {
    return deps.getScreenshotQueue()
  })

  ipcMain.handle("get-extra-screenshot-queue", () => {
    return deps.getExtraScreenshotQueue()
  })

  ipcMain.handle("delete-screenshot", async (event, path: string) => {
    return deps.deleteScreenshot(path)
  })

  ipcMain.handle("get-image-preview", async (event, path: string) => {
    return deps.getImagePreview(path)
  })

  // Screenshot processing handlers
  ipcMain.handle("process-screenshots", async () => {
    // API key is now built-in, no need to check
    await deps.processingHelper?.processScreenshots()
  })

  // Window dimension handlers
  ipcMain.handle(
    "update-content-dimensions",
    async (event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        deps.setWindowDimensions(width, height)
      }
    }
  )

  ipcMain.handle(
    "set-window-dimensions",
    (event, width: number, height: number) => {
      deps.setWindowDimensions(width, height)
    }
  )

  // Screenshot management handlers
  ipcMain.handle("get-screenshots", async () => {
    try {
      let previews = []
      const currentView = deps.getView()

      if (currentView === "queue") {
        const queue = deps.getScreenshotQueue()
        previews = await Promise.all(
          queue.map(async (path) => ({
            path,
            preview: await deps.getImagePreview(path)
          }))
        )
      } else {
        const extraQueue = deps.getExtraScreenshotQueue()
        previews = await Promise.all(
          extraQueue.map(async (path) => ({
            path,
            preview: await deps.getImagePreview(path)
          }))
        )
      }

      return previews
    } catch (error) {
      console.error("Error getting screenshots:", error)
      throw error
    }
  })

  // Screenshot trigger handlers
  ipcMain.handle("trigger-screenshot", async () => {
    const mainWindow = deps.getMainWindow()
    if (mainWindow) {
      try {
        const screenshotPath = await deps.takeScreenshot()
        const preview = await deps.getImagePreview(screenshotPath)
        mainWindow.webContents.send("screenshot-taken", {
          path: screenshotPath,
          preview
        })
        return { success: true }
      } catch (error) {
        console.error("Error triggering screenshot:", error)
        return { error: "Failed to trigger screenshot" }
      }
    }
    return { error: "No main window available" }
  })

  ipcMain.handle("take-screenshot", async () => {
    try {
      const screenshotPath = await deps.takeScreenshot()
      const preview = await deps.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      console.error("Error taking screenshot:", error)
      return { error: "Failed to take screenshot" }
    }
  })

  // Web Authentication handlers
  ipcMain.handle("web-auth-login", async () => {
    try {
      const success = await simpleAuthManager.login()
      return { success }
    } catch (error) {
      console.error("Failed to open web login:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("web-auth-logout", async () => {
    try {
      await simpleAuthManager.logout()
      return { success: true }
    } catch (error) {
      console.error("Failed to logout:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("web-auth-status", async () => {
    try {
      const isAuthenticated = await simpleAuthManager.isAuthenticated()
      const user = simpleAuthManager.getCurrentUser()
      return { 
        authenticated: isAuthenticated, 
        user: user 
      }
    } catch (error) {
      console.error("Failed to check auth status:", error)
      return { 
        authenticated: false, 
        user: null, 
        error: error.message 
      }
    }
  })

  ipcMain.handle("web-sync-config", async () => {
    try {
      const config = await simpleAuthManager.refreshUserConfig()
      return { success: true, config: config }
    } catch (error) {
      console.error("Failed to sync config:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("web-update-config", async (_event, configUpdates) => {
    try {
      // 简化版：不支持更新Web配置，只返回当前配置
      const config = simpleAuthManager.getUserConfig()
      return { success: true, config: config }
    } catch (error) {
      console.error("Failed to update web config:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("web-get-ai-models", async () => {
    try {
      // 简化版：返回固定的AI模型列表
      const models = [
        'claude-3-5-sonnet-20241022',
        'gpt-4o',
        'gemini-2.0-flash'
      ]
      return { success: true, models: models }
    } catch (error) {
      console.error("Failed to get AI models:", error)
      return { success: false, error: error.message, models: [] }
    }
  })

  ipcMain.handle("web-get-languages", async () => {
    try {
      // 简化版：返回固定的语言列表
      const languages = ['python', 'javascript', 'java', 'cpp', 'go', 'rust']
      return { success: true, languages: languages }
    } catch (error) {
      console.error("Failed to get languages:", error)
      return { success: false, error: error.message, languages: [] }
    }
  })

  // Handle notification actions
  ipcMain.handle("handle-notification-action", async (_event, action) => {
    try {
      console.log("Handling notification action:", action)
      
      switch (action) {
        case 'open-web-login':
          const success = await simpleAuthManager.login()
          return { success }
        

        
        case 'open-startup-guide':
          // Open startup guide or documentation
          await shell.openExternal('https://github.com/your-repo/startup-guide')
          return { success: true }
        
        default:
          console.log("Unknown notification action:", action)
          return { success: false, error: "Unknown action" }
      }
    } catch (error) {
      console.error("Failed to handle notification action:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("web-check-connection", async () => {
    try {
      // 🆕 检查后端服务器连接状态
      const connected = await simpleAuthManager.checkConnection()
      return { connected: connected }
    } catch (error) {
      console.error("Failed to check web connection:", error)
      return { connected: false, error: error.message }
    }
  })

  ipcMain.handle("open-external-url", (event, url: string) => {
    shell.openExternal(url)
  })
  
  // Open external URL handler
  ipcMain.handle("openLink", (event, url: string) => {
    try {
      console.log(`Opening external URL: ${url}`);
      shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error(`Error opening URL ${url}:`, error);
      return { success: false, error: `Failed to open URL: ${error}` };
    }
  })

  // Settings portal handler
  ipcMain.handle("open-settings-portal", () => {
    const mainWindow = deps.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send("show-settings-dialog");
      return { success: true };
    }
    return { success: false, error: "Main window not available" };
  })

  // Window management handlers
  ipcMain.handle("toggle-window", () => {
    try {
      deps.toggleMainWindow()
      return { success: true }
    } catch (error) {
      console.error("Error toggling window:", error)
      return { error: "Failed to toggle window" }
    }
  })

  ipcMain.handle("reset-queues", async () => {
    try {
      deps.clearQueues()
      return { success: true }
    } catch (error) {
      console.error("Error resetting queues:", error)
      return { error: "Failed to reset queues" }
    }
  })

  // Process screenshot handlers
  ipcMain.handle("trigger-process-screenshots", async () => {
    try {
      // API key is now built-in, no need to check
      await deps.processingHelper?.processScreenshots()
      return { success: true }
    } catch (error) {
      console.error("Error processing screenshots:", error)
      return { error: "Failed to process screenshots" }
    }
  })

  // Reset handlers
  ipcMain.handle("trigger-reset", () => {
    try {
      // First cancel any ongoing requests
      deps.processingHelper?.cancelOngoingRequests()

      // Clear all queues immediately
      deps.clearQueues()

      // Reset view to queue
      deps.setView("queue")

      // Get main window and send reset events
      const mainWindow = deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Send reset events in sequence
        mainWindow.webContents.send("reset-view")
        mainWindow.webContents.send("reset")
      }

      return { success: true }
    } catch (error) {
      console.error("Error triggering reset:", error)
      return { error: "Failed to trigger reset" }
    }
  })

  // Window movement handlers
  ipcMain.handle("trigger-move-left", () => {
    try {
      deps.moveWindowLeft()
      return { success: true }
    } catch (error) {
      console.error("Error moving window left:", error)
      return { error: "Failed to move window left" }
    }
  })

  ipcMain.handle("trigger-move-right", () => {
    try {
      deps.moveWindowRight()
      return { success: true }
    } catch (error) {
      console.error("Error moving window right:", error)
      return { error: "Failed to move window right" }
    }
  })

  ipcMain.handle("trigger-move-up", () => {
    try {
      deps.moveWindowUp()
      return { success: true }
    } catch (error) {
      console.error("Error moving window up:", error)
      return { error: "Failed to move window up" }
    }
  })

  ipcMain.handle("trigger-move-down", () => {
    try {
      deps.moveWindowDown()
      return { success: true }
    } catch (error) {
      console.error("Error moving window down:", error)
      return { error: "Failed to move window down" }
    }
  })
  
  // Delete last screenshot handler
  ipcMain.handle("delete-last-screenshot", async () => {
    try {
      const queue = deps.getView() === "queue" 
        ? deps.getScreenshotQueue() 
        : deps.getExtraScreenshotQueue()
      
      if (queue.length === 0) {
        return { success: false, error: "No screenshots to delete" }
      }
      
      // Get the last screenshot in the queue
      const lastScreenshot = queue[queue.length - 1]
      
      // Delete it
      const result = await deps.deleteScreenshot(lastScreenshot)
      
      // Notify the renderer about the change
      const mainWindow = deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("screenshot-deleted", { path: lastScreenshot })
      }
      
      return result
    } catch (error) {
      console.error("Error deleting last screenshot:", error)
      return { success: false, error: "Failed to delete last screenshot" }
    }
  })
  
  // 处理显示设置对话框的请求
  ipcMain.on("show-settings-dialog", () => {
    const mainWindow = deps.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("show-settings-dialog")
    }
  })
}
