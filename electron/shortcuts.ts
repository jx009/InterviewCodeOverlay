import { globalShortcut, app } from "electron"
import { IShortcutsHelperDeps } from "./main"
import { configHelper } from "./ConfigHelper"

export class ShortcutsHelper {
  private deps: IShortcutsHelperDeps

  constructor(deps: IShortcutsHelperDeps) {
    this.deps = deps
  }

  /**
   * 异步执行耗时的清理操作，不阻塞UI响应
   * （积分操作已在主流程中同步处理）
   */
  private async performAsyncCleanup(): Promise<void> {
    console.log("🔄 Starting background cleanup operations...")
    
    const mainWindow = this.deps.getMainWindow()
    
    try {
      // 异步操作1: 清理临时文件（使用 setTimeout 延迟执行）
      setTimeout(() => {
        try {
          console.log("🔄 Cleaning up temp files in background...")
          const screenshotHelper = this.deps.getScreenshotHelper?.()
          if (screenshotHelper) {
            screenshotHelper.cleanupAllTempFiles()
            console.log("✅ Temp file cleanup completed")
          }
        } catch (error) {
          console.error("❌ 后台文件清理失败:", error)
        }
      }, 100) // 100ms后开始文件清理

      // 异步操作2: 窗口状态检查和恢复（延迟执行）
      setTimeout(() => {
        try {
          if (!mainWindow || mainWindow.isDestroyed()) return
          
          console.log("🔄 Checking window state in background...")
          
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
          
          console.log("✅ Window state check completed")
        } catch (error) {
          console.error("❌ 后台窗口状态检查失败:", error)
        }
      }, 50) // 50ms后检查窗口状态

      console.log("🚀 Background cleanup operations scheduled (files & window state)")
      
    } catch (error) {
      console.error("❌ 异步清理过程出错:", error)
    }
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

    // 编程题快捷键 - Ctrl+Enter (Command+Enter)
    globalShortcut.register("CommandOrControl+Enter", async () => {
      console.log("Ctrl/Cmd + Enter pressed. Processing as programming questions...")
      await this.deps.processingHelper?.processScreenshots()
    })

    // 单选题快捷键 - Alt+Enter (Option+Enter)  
    globalShortcut.register("Alt+Enter", async () => {
      console.log("Alt/Option + Enter pressed. Processing as single choice questions...")
      await this.deps.processingHelper?.processScreenshotsAsChoice()
    })

    // 多选题快捷键 - Ctrl+Shift+Enter (Command+Shift+Enter)
    globalShortcut.register("CommandOrControl+Shift+Enter", async () => {
      console.log("Ctrl/Cmd + Shift + Enter pressed. Processing as multiple choice questions...")
      await this.deps.processingHelper?.processScreenshotsAsMultipleChoice()
    })

    globalShortcut.register("CommandOrControl+R", async () => {
      console.log("Command + R pressed. Starting optimized cleanup process...")

      // 立即响应用户操作 - 先执行快速的同步操作
      const mainWindow = this.deps.getMainWindow()
      
      // 1. 立即取消正在进行的API请求（同步，快速）
      this.deps.processingHelper?.cancelOngoingRequests()
      
      // 2. 立即清除队列（同步，快速）
      this.deps.clearQueues()
      
      // 3. 立即更新视图状态（同步，快速）
      this.deps.setView("queue")
      
      // 4. 立即通知前端重置（同步，快速）
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view")
        mainWindow.webContents.send("reset")
        console.log("✅ Immediate reset completed - UI should respond instantly")
      }

      // 5. 同步处理积分取消操作（保持原有逻辑）
      if (this.deps.processingHelper) {
        try {
          await this.deps.processingHelper.cancelAllCreditReservations()
          console.log("✅ Credit cancellations completed")
        } catch (error) {
          console.error("❌ 积分取消失败:", error)
        }
      }

      // 异步执行剩余的清理操作（文件清理和窗口状态检查）
      this.performAsyncCleanup()
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

    // 🆕 水平滚动快捷键
    const scrollLeftSuccess = globalShortcut.register("CommandOrControl+Shift+Left", () => {
      console.log("🔥 Command/Ctrl + Shift + Left pressed. Scrolling code left...")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("scroll-code-horizontal", { direction: "left" })
      }
    })

    const scrollRightSuccess = globalShortcut.register("CommandOrControl+Shift+Right", () => {
      console.log("🔥 Command/Ctrl + Shift + Right pressed. Scrolling code right...")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("scroll-code-horizontal", { direction: "right" })
      }
    })

    if (scrollLeftSuccess && scrollRightSuccess) {
      console.log("✅ 水平滚动快捷键注册成功 (Ctrl+Shift+Left/Right)")
    } else {
      console.error("❌ 水平滚动快捷键注册失败")
    }

    // 🆕 窗口宽度调整快捷键
    const decreaseWidthSuccess = globalShortcut.register("CommandOrControl+Shift+3", () => {
      console.log("🔥 Command/Ctrl + Shift + 3 pressed. Decreasing window width...")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        const oldBounds = mainWindow.getBounds()
        console.log(`📏 当前窗口尺寸: ${oldBounds.width}x${oldBounds.height} at (${oldBounds.x}, ${oldBounds.y})`)
        
        // 检查窗口限制
        const minSize = mainWindow.getMinimumSize()
        const maxSize = mainWindow.getMaximumSize()
        console.log(`🔍 窗口尺寸限制: 最小 ${minSize[0]}x${minSize[1]}, 最大 ${maxSize[0]}x${maxSize[1]}`)
        
        const newWidth = oldBounds.width - 50
        console.log(`📏 计算新宽度: ${newWidth}px (原宽度: ${oldBounds.width}px)`)
        
        if (newWidth !== oldBounds.width) {
          console.log(`🔄 尝试设置窗口尺寸为: ${newWidth}x${oldBounds.height}`)
          
          // 强制设置新尺寸
          mainWindow.setResizable(true)
          mainWindow.setSize(newWidth, oldBounds.height)
          
          // 🆕 标记用户手动调整了窗口大小
          if ((this.deps as any).setUserManuallyResized) {
            (this.deps as any).setUserManuallyResized(true)
            console.log("🔒 标记窗口为用户手动调整状态")
          }
          
          // 🆕 保存宽度到本地配置
          try {
            configHelper.updateClientSettings({ windowWidth: newWidth })
            console.log(`💾 窗口宽度已保存到配置: ${newWidth}px`)
          } catch (error) {
            console.error('保存窗口宽度失败:', error)
          }
          
          // 验证调整后的尺寸
          setTimeout(() => {
            const newBounds = mainWindow.getBounds()
            console.log(`🎯 最终窗口尺寸: ${newBounds.width}x${newBounds.height}`)
            if (newBounds.width === newWidth) {
              console.log("✅ 窗口宽度调整成功!")
            } else {
              console.log(`❌ 窗口宽度调整失败 (期望: ${newWidth}px, 实际: ${newBounds.width}px)`)
            }
          }, 100)
        }
      }
    })

    const increaseWidthSuccess = globalShortcut.register("CommandOrControl+Shift+4", () => {
      console.log("🔥 Command/Ctrl + Shift + 4 pressed. Increasing window width...")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        const oldBounds = mainWindow.getBounds()
        console.log(`📏 当前窗口尺寸: ${oldBounds.width}x${oldBounds.height} at (${oldBounds.x}, ${oldBounds.y})`)
        
        // 检查窗口限制
        const minSize = mainWindow.getMinimumSize()
        const maxSize = mainWindow.getMaximumSize()
        console.log(`🔍 窗口尺寸限制: 最小 ${minSize[0]}x${minSize[1]}, 最大 ${maxSize[0]}x${maxSize[1]}`)
        
        const { screen } = require('electron')
        const primaryDisplay = screen.getPrimaryDisplay()
        const workArea = primaryDisplay.workArea
        const systemMaxWidth = workArea.width - 100
        const windowMaxWidth = maxSize[0] > 0 ? maxSize[0] : systemMaxWidth
        const effectiveMaxWidth = Math.min(systemMaxWidth, windowMaxWidth)
        
        const newWidth = Math.min(effectiveMaxWidth, oldBounds.width + 50)
        console.log(`📏 计算新宽度: ${newWidth}px (原宽度: ${oldBounds.width}px, 有效最大宽度: ${effectiveMaxWidth}px)`)
        
        if (newWidth !== oldBounds.width) {
          console.log(`🔄 尝试设置窗口尺寸为: ${newWidth}x${oldBounds.height}`)
          
          // 强制设置新尺寸
          mainWindow.setResizable(true)
          mainWindow.setSize(newWidth, oldBounds.height)
          
          // 🆕 标记用户手动调整了窗口大小
          if ((this.deps as any).setUserManuallyResized) {
            (this.deps as any).setUserManuallyResized(true)
            console.log("🔒 标记窗口为用户手动调整状态")
          }
          
          // 🆕 保存宽度到本地配置
          try {
            configHelper.updateClientSettings({ windowWidth: newWidth })
            console.log(`💾 窗口宽度已保存到配置: ${newWidth}px`)
          } catch (error) {
            console.error('保存窗口宽度失败:', error)
          }
          
          // 验证调整后的尺寸
          setTimeout(() => {
            const newBounds = mainWindow.getBounds()
            console.log(`🎯 最终窗口尺寸: ${newBounds.width}x${newBounds.height}`)
            if (newBounds.width === newWidth) {
              console.log("✅ 窗口宽度调整成功!")
            } else {
              console.log(`❌ 窗口宽度调整失败 (期望: ${newWidth}px, 实际: ${newBounds.width}px)`)
            }
          }, 100)
        }
      }
    })

    if (decreaseWidthSuccess && increaseWidthSuccess) {
      console.log("✅ 窗口宽度调整快捷键注册成功 (Ctrl+Shift+3/4)")
    } else {
      console.error("❌ 窗口宽度调整快捷键注册失败")
    }
    
    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}
