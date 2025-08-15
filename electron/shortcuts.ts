import { globalShortcut, app } from "electron"
import { IShortcutsHelperDeps } from "./main"
import { configHelper } from "./ConfigHelper"

export class ShortcutsHelper {
  private deps: IShortcutsHelperDeps

  constructor(deps: IShortcutsHelperDeps) {
    this.deps = deps
  }

  private adjustOpacity(delta: number): void {
    const mainWindow = this.deps.getMainWindow();
    if (!mainWindow) return;
    
    // 从配置获取当前背景透明度
    const config = configHelper.loadConfig();
    let currentOpacity = config.clientSettings?.backgroundOpacity || 0.8;
    let newOpacity = Math.max(0.1, Math.min(1.0, currentOpacity + delta));
    console.log(`Adjusting background opacity from ${currentOpacity} to ${newOpacity}`);
    
    // 发送背景透明度变更事件到前端
    mainWindow.webContents.send("background-opacity-changed", newOpacity);
    
    // Save the background opacity setting to config
    try {
      configHelper.updateClientSettings({ backgroundOpacity: newOpacity });
    } catch (error) {
      console.error('Error saving background opacity to config:', error);
    }
    
    // If we're making the window visible, also make sure it's shown and interaction is enabled
    if (newOpacity > 0.1 && !this.deps.isVisible()) {
      this.deps.toggleMainWindow();
    }
  }

  public registerGlobalShortcuts(): void {
    // 清理之前注册的快捷键，防止重复注册
    console.log("Cleaning up existing global shortcuts...")
    globalShortcut.unregisterAll()
    
    console.log("Registering global shortcuts...")
    globalShortcut.register("CommandOrControl+H", async () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        console.log("Taking screenshot...")
        try {
          const screenshotPath = await this.deps.takeScreenshot()
          const preview = await this.deps.getImagePreview(screenshotPath)
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
        } catch (error) {
          console.error("Error capturing screenshot:", error)
        }
      }
    })

    globalShortcut.register("CommandOrControl+Enter", async () => {
      await this.deps.processingHelper?.processScreenshots()
    })

    // 多选题快捷键
    globalShortcut.register("CommandOrControl+Shift+Enter", async () => {
      console.log("Ctrl/Cmd + Shift + Enter pressed. Processing as multiple choice questions...")
      // 生成新的operationId，因为这是独立的快捷键操作
      const operationId = `shortcut_multiple_choice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await this.deps.processingHelper?.processScreenshotsAsMultipleChoice(operationId)
    })

    globalShortcut.register("CommandOrControl+R", () => {
      console.log(
        "Command + R pressed. Canceling requests and resetting queues..."
      )

      // Cancel ongoing API requests
      this.deps.processingHelper?.cancelOngoingRequests()

      // Clear both screenshot queues
      this.deps.clearQueues()

      // 🆕 清理所有临时文件和缓存
      const screenshotHelper = this.deps.getScreenshotHelper?.()
      if (screenshotHelper) {
        screenshotHelper.cleanupAllTempFiles()
      }

      console.log("Cleared queues and cleaned up temp files.")

      // Update the view state to 'queue'
      this.deps.setView("queue")

      // Notify renderer process to switch view to 'queue'
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        // 确保窗口可见并恢复焦点
        if (!this.deps.isVisible()) {
          console.log("Window was hidden, restoring visibility...")
          mainWindow.setIgnoreMouseEvents(false)
          mainWindow.showInactive()
          // 更新状态管理
          if (typeof (this.deps as any).setVisible === 'function') {
            (this.deps as any).setVisible(true)
          }
        }
        
        // 确保窗口在屏幕内可见
        const bounds = mainWindow.getBounds()
        const { screen } = require('electron')
        const primaryDisplay = screen.getPrimaryDisplay()
        const workArea = primaryDisplay.workArea
        
        // 如果窗口完全在屏幕外，将其移回屏幕内
        if (bounds.x + bounds.width < 0 || bounds.x > workArea.width ||
            bounds.y + bounds.height < 0 || bounds.y > workArea.height) {
          console.log("Window was off-screen, repositioning...")
          const newX = Math.max(0, Math.min(bounds.x, workArea.width - bounds.width))
          const newY = Math.max(0, Math.min(bounds.y, workArea.height - bounds.height))
          mainWindow.setPosition(newX, newY)
        }
        
        mainWindow.webContents.send("reset-view")
        mainWindow.webContents.send("reset")
        console.log("Reset completed, window visibility ensured")
      }
    })

    // New shortcuts for moving the window
    globalShortcut.register("CommandOrControl+Left", () => {
      console.log("Command/Ctrl + Left pressed. Moving window left.")
      this.deps.moveWindowLeft()
    })

    globalShortcut.register("CommandOrControl+Right", () => {
      console.log("Command/Ctrl + Right pressed. Moving window right.")
      this.deps.moveWindowRight()
    })

    globalShortcut.register("CommandOrControl+Down", () => {
      console.log("Command/Ctrl + down pressed. Moving window down.")
      try {
        this.deps.moveWindowDown()
      } catch (error) {
        console.error("Error moving window down:", error)
      }
    })

    globalShortcut.register("CommandOrControl+Up", () => {
      console.log("Command/Ctrl + Up pressed. Moving window Up.")
      try {
        this.deps.moveWindowUp()
      } catch (error) {
        console.error("Error moving window up:", error)
      }
    })

    globalShortcut.register("CommandOrControl+B", () => {
      console.log("Command/Ctrl + B pressed. Toggling window visibility.")
      this.deps.toggleMainWindow()
    })

    globalShortcut.register("CommandOrControl+Q", () => {
      console.log("Command/Ctrl + Q pressed. Quitting application.")
      app.quit()
    })

    // Adjust opacity shortcuts
    globalShortcut.register("CommandOrControl+[", () => {
      console.log("Command/Ctrl + [ pressed. Decreasing opacity.")
      this.adjustOpacity(-0.1)
    })

    globalShortcut.register("CommandOrControl+]", () => {
      console.log("Command/Ctrl + ] pressed. Increasing opacity.")
      this.adjustOpacity(0.1)
    })

    // 🆕 新增透明度快捷键 - Ctrl+Shift+1 调低透明度，Ctrl+Shift+2 调高透明度
    globalShortcut.register("CommandOrControl+Shift+1", () => {
      console.log("Command/Ctrl + Shift + 1 pressed. Decreasing opacity.")
      this.adjustOpacity(-0.1)
    })

    globalShortcut.register("CommandOrControl+Shift+2", () => {
      console.log("Command/Ctrl + Shift + 2 pressed. Increasing opacity.")
      this.adjustOpacity(0.1)
    })
    
    // Zoom controls
    globalShortcut.register("CommandOrControl+-", () => {
      console.log("Command/Ctrl + - pressed. Zooming out.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        const currentZoom = mainWindow.webContents.getZoomLevel()
        mainWindow.webContents.setZoomLevel(currentZoom - 0.5)
      }
    })
    
    globalShortcut.register("CommandOrControl+0", () => {
      console.log("Command/Ctrl + 0 pressed. Resetting zoom.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.setZoomLevel(0)
      }
    })
    
    globalShortcut.register("CommandOrControl+=", () => {
      console.log("Command/Ctrl + = pressed. Zooming in.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        const currentZoom = mainWindow.webContents.getZoomLevel()
        mainWindow.webContents.setZoomLevel(currentZoom + 0.5)
      }
    })
    
    // Delete last screenshot shortcut
    globalShortcut.register("CommandOrControl+L", () => {
      console.log("Command/Ctrl + L pressed. Deleting last screenshot.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        // Send an event to the renderer to delete the last screenshot
        mainWindow.webContents.send("delete-last-screenshot")
      }
    })

    // Emergency window recovery shortcut (Ctrl+Shift+R)
    globalShortcut.register("CommandOrControl+Shift+R", () => {
      console.log("Emergency window recovery shortcut activated!")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          // Force window to be visible and on screen
          const { screen } = require('electron')
          const primaryDisplay = screen.getPrimaryDisplay()
          const workArea = primaryDisplay.workArea
          
          // Reset window to center of screen
          const bounds = mainWindow.getBounds()
          const centerX = workArea.x + (workArea.width - bounds.width) / 2
          const centerY = workArea.y + (workArea.height - bounds.height) / 2
          
          mainWindow.setPosition(Math.round(centerX), Math.round(centerY))
          mainWindow.setIgnoreMouseEvents(false)
          mainWindow.showInactive()  // 使用不抢夺焦点的方法
          
          console.log("Window recovered to center of screen")
        } catch (error) {
          console.error("Error during emergency window recovery:", error)
        }
      }
    })

    // Manual config refresh shortcut (Ctrl+Shift+C)
    globalShortcut.register("CommandOrControl+Shift+C", async () => {
      console.log("Manual config refresh shortcut activated!")
      try {
        const { simpleAuthManager } = require('./SimpleAuthManager')
        console.log("🔄 手动刷新用户配置...")
        await simpleAuthManager.refreshUserConfig(true)
        console.log("✅ 配置刷新完成")
        
        // 显示通知
        const mainWindow = this.deps.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("config-refreshed")
        }
      } catch (error) {
        console.error("Error during manual config refresh:", error)
      }
    })

    // Copy code shortcut (Ctrl/Cmd+J) - 直接在主进程中处理复制
    const copySuccess = globalShortcut.register("CommandOrControl+J", () => {
      console.log("🔥 Command/Ctrl + J pressed. Copying code directly...")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        // 请求代码内容并直接在主进程中复制
        mainWindow.webContents.send("request-code-for-copy")
      } else {
        console.error("❌ MainWindow is null or destroyed")
      }
    })
    
    if (copySuccess) {
      console.log("✅ CommandOrControl+J shortcut registered successfully")
    } else {
      console.error("❌ Failed to register CommandOrControl+J shortcut")
    }
    
    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}
