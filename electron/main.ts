import { app, BrowserWindow, screen, shell, ipcMain } from "electron"
import path from "path"
import fs from "fs"
import { initializeIpcHandlers } from "./ipcHandlers"
import { SimpleProcessingHelper } from "./SimpleProcessingHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
import { initAutoUpdater } from "./autoUpdater"
import { configHelper } from "./ConfigHelper"
import { simpleAuthManager } from "./SimpleAuthManager"
import * as dotenv from "dotenv"
import { setupUTF8Encoding, patchConsoleForUTF8 } from "./encoding-fix"

// Setup UTF-8 encoding at the very beginning
setupUTF8Encoding()
patchConsoleForUTF8()

// Constants
const isDev = process.env.NODE_ENV === "development"

// Application State
const state = {
  // Window management properties
  mainWindow: null as BrowserWindow | null,
  isWindowVisible: false,
  windowPosition: null as { x: number; y: number } | null,
  windowSize: null as { width: number; height: number } | null,
  screenWidth: 0,
  screenHeight: 0,
  step: 0,
  currentX: 0,
  currentY: 0,

  // Application helpers
  screenshotHelper: null as ScreenshotHelper | null,
  shortcutsHelper: null as ShortcutsHelper | null,
  processingHelper: null as SimpleProcessingHelper | null,

  // View and state management
  view: "queue" as "queue" | "solutions" | "debug",
  problemInfo: null as any,
  hasDebugged: false,

  // Processing events
  PROCESSING_EVENTS: {
    UNAUTHORIZED: "processing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",
    OUT_OF_CREDITS: "out-of-credits",
    API_KEY_INVALID: "api-key-invalid",
    INITIAL_START: "initial-start",
    PROBLEM_EXTRACTED: "problem-extracted",
    SOLUTION_SUCCESS: "solution-success",
    INITIAL_SOLUTION_ERROR: "solution-error",
    DEBUG_START: "debug-start",
    DEBUG_SUCCESS: "debug-success",
    DEBUG_ERROR: "debug-error",
    COPY_CODE: "copy-code"
  } as const
}

// Add interfaces for helper classes
export interface IProcessingHelperDeps {
  getScreenshotHelper: () => ScreenshotHelper | null
  getMainWindow: () => BrowserWindow | null
  getView: () => "queue" | "solutions" | "debug"
  setView: (view: "queue" | "solutions" | "debug") => void
  getProblemInfo: () => any
  setProblemInfo: (info: any) => void
  getScreenshotQueue: () => string[]
  getExtraScreenshotQueue: () => string[]
  clearQueues: () => void
  takeScreenshot: () => Promise<string>
  getImagePreview: (filepath: string) => Promise<string>
  deleteScreenshot: (
    path: string
  ) => Promise<{ success: boolean; error?: string }>
  setHasDebugged: (value: boolean) => void
  getHasDebugged: () => boolean
  PROCESSING_EVENTS: typeof state.PROCESSING_EVENTS
}

export interface IShortcutsHelperDeps {
  getMainWindow: () => BrowserWindow | null
  getScreenshotHelper: () => ScreenshotHelper | null
  takeScreenshot: () => Promise<string>
  getImagePreview: (filepath: string) => Promise<string>
  processingHelper: SimpleProcessingHelper | null
  clearQueues: () => void
  setView: (view: "queue" | "solutions" | "debug") => void
  isVisible: () => boolean
  toggleMainWindow: () => void
  moveWindowLeft: () => void
  moveWindowRight: () => void
  moveWindowUp: () => void
  moveWindowDown: () => void
}

export interface IIpcHandlerDeps {
  getMainWindow: () => BrowserWindow | null
  setWindowDimensions: (width: number, height: number) => void
  getScreenshotQueue: () => string[]
  getExtraScreenshotQueue: () => string[]
  deleteScreenshot: (
    path: string
  ) => Promise<{ success: boolean; error?: string }>
  getImagePreview: (filepath: string) => Promise<string>
  processingHelper: SimpleProcessingHelper | null
  PROCESSING_EVENTS: typeof state.PROCESSING_EVENTS
  takeScreenshot: () => Promise<string>
  getView: () => "queue" | "solutions" | "debug"
  toggleMainWindow: () => void
  clearQueues: () => void
  setView: (view: "queue" | "solutions" | "debug") => void
  moveWindowLeft: () => void
  moveWindowRight: () => void
  moveWindowUp: () => void
  moveWindowDown: () => void
}

// Initialize Web Authentication
async function initializeWebAuth() {
  try {
    // Set up Web authentication event listeners
    simpleAuthManager.on('authenticated', (user) => {
      console.log('User authenticated:', user.username)
      // Notify renderer process
      if (state.mainWindow) {
        state.mainWindow.webContents.send('web-auth-status', { 
          authenticated: true, 
          user: user 
        })
      }
    })

    simpleAuthManager.on('authentication-cleared', () => {
      console.log('User authentication cleared')
      if (state.mainWindow) {
        state.mainWindow.webContents.send('web-auth-status', { 
          authenticated: false, 
          user: null 
        })
      }
    })

    simpleAuthManager.on('config-synced', (config) => {
      console.log('Configuration synced from web')
      if (state.mainWindow) {
        state.mainWindow.webContents.send('config-updated', config)
      }
    })

    simpleAuthManager.on('auth-required', () => {
      console.log('Authentication required - opening web login')
      simpleAuthManager.openWebLogin()
    })

    console.log("Web Authentication Manager initialized with event listeners")
  } catch (error) {
    console.error('Failed to initialize web auth:', error)
  }
}

/**
 * 启动检查 - 确保用户登录
 */
async function performSimpleStartupCheck() {
  try {
    console.log("🔐 执行启动时认证检查...")
    
    // 使用新的认证初始化方法，它会自动检查共享会话
    const isAuthenticated = await simpleAuthManager.initializeAuth()
    if (isAuthenticated) {
      const user = simpleAuthManager.getCurrentUser()
      console.log(`✅ 用户已认证: ${user?.username}`)
      return true
    } else {
      console.log("❌ 用户未登录，需要登录后才能使用")
      return false // 返回false表示需要登录
    }
  } catch (error) {
    console.error("❌ 认证检查失败:", error)
    return false
  }
}

// Initialize helpers
function initializeHelpers() {
  state.screenshotHelper = new ScreenshotHelper(state.view)
  state.processingHelper = new SimpleProcessingHelper({
    getScreenshotHelper,
    getMainWindow,
    getView,
    setView,
    getProblemInfo,
    setProblemInfo,
    getScreenshotQueue,
    getExtraScreenshotQueue,
    clearQueues,
    takeScreenshot,
    getImagePreview,
    deleteScreenshot,
    setHasDebugged,
    getHasDebugged,
    PROCESSING_EVENTS: state.PROCESSING_EVENTS
  } as IProcessingHelperDeps)
  state.shortcutsHelper = new ShortcutsHelper({
    getMainWindow,
    getScreenshotHelper,
    takeScreenshot,
    getImagePreview,
    processingHelper: state.processingHelper,
    clearQueues,
    setView,
    isVisible: () => state.isWindowVisible,
    toggleMainWindow,
    moveWindowLeft: () =>
      moveWindowHorizontal((x) =>
        Math.max(-(state.windowSize?.width || 0) / 2, x - state.step)
      ),
    moveWindowRight: () =>
      moveWindowHorizontal((x) =>
        Math.min(
          state.screenWidth - (state.windowSize?.width || 0) / 2,
          x + state.step
        )
      ),
    moveWindowUp: () => moveWindowVertical((y) => y - state.step),
    moveWindowDown: () => moveWindowVertical((y) => y + state.step)
  } as IShortcutsHelperDeps)
}

// Auth callback handler

// Register the interview-coder protocol for authentication callbacks
if (process.platform === "darwin") {
  app.setAsDefaultProtocolClient("interview-coder")
} else {
  app.setAsDefaultProtocolClient("interview-coder", process.execPath, [
    path.resolve(process.argv[1] || "")
  ])
}

// Handle the protocol for authentication callbacks
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient("interview-coder", process.execPath, [
    path.resolve(process.argv[1])
  ])
}

// Force Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", (event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    if (state.mainWindow) {
      if (state.mainWindow.isMinimized()) state.mainWindow.restore()
      state.mainWindow.focus()

      // Handle authentication callback from protocol
      const url = commandLine.find((arg) => arg.startsWith("interview-coder://"))
      if (url) {
        console.log("Received auth callback:", url)
        simpleAuthManager.handleAuthCallback(url)
      }
    }
  })
}

// Auth callback removed as we no longer use Supabase authentication

// Window management functions
async function createWindow(): Promise<void> {
  if (state.mainWindow) {
    if (state.mainWindow.isMinimized()) state.mainWindow.restore()
    state.mainWindow.focus()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const workArea = primaryDisplay.workAreaSize
  state.screenWidth = workArea.width
  state.screenHeight = workArea.height
  state.step = 60
  state.currentY = 50

  // 🆕 从配置中加载保存的透明度
  const config = configHelper.loadConfig()
  const savedOpacity = config.clientSettings?.opacity || 1.0
  console.log(`Loading saved opacity: ${savedOpacity}`)

  const windowSettings: Electron.BrowserWindowConstructorOptions = {
    width: 800,
    height: 600,
    minWidth: 750,
    minHeight: 550,
    x: state.currentX,
    y: 50,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: isDev
        ? path.join(__dirname, "../dist-electron/preload.js")
        : path.join(__dirname, "preload.js"),
      scrollBounce: true
    },
    show: true,
    frame: false,
    transparent: true,
    fullscreenable: false,
    hasShadow: false,
    opacity: savedOpacity,  // 🆕 使用保存的透明度
    backgroundColor: "#00000000",
    focusable: true,
    skipTaskbar: true,
    type: "panel",
    paintWhenInitiallyHidden: true,
    titleBarStyle: "hidden",
    enableLargerThanScreen: true,
    movable: true
  }

  state.mainWindow = new BrowserWindow(windowSettings)

  // 不在这里设置全局穿透，而是通过IPC消息来控制
  // state.mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // 添加事件监听器，用于处理鼠标事件
  ipcMain.handle('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  });

  // 新增：区域性穿透API
  ipcMain.handle('set-ignore-mouse-events-except', (event, exceptRegions) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    
    // 设置窗口为穿透模式
    win.setIgnoreMouseEvents(true, { forward: true });
    
    // 使用更可靠的方法：注入一个脚本来处理鼠标事件
    win.webContents.executeJavaScript(`
      (function() {
        // 清除之前的事件监听器
        if (window._mouseMoveHandler) {
          document.removeEventListener('mousemove', window._mouseMoveHandler);
          delete window._mouseMoveHandler;
        }
        
        // 创建新的事件处理函数
        window._mouseMoveHandler = function(e) {
          const mousePos = { x: e.clientX, y: e.clientY };
          
          // 检查鼠标是否在任何例外区域内
          const exceptRegions = ${JSON.stringify(exceptRegions)};
          const isInExceptRegion = exceptRegions.some(function(region) {
            return mousePos.x >= region.x && 
                   mousePos.x <= region.x + region.width && 
                   mousePos.y >= region.y && 
                   mousePos.y <= region.y + region.height;
          });
          
          // 根据鼠标位置设置穿透
          if (isInExceptRegion) {
            window.electronAPI.setIgnoreMouseEvents(false);
          } else {
            window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
          }
        };
        
        // 添加事件监听器
        document.addEventListener('mousemove', window._mouseMoveHandler);
        
        // 添加一个防抖函数，避免频繁调用
        function debounce(func, wait) {
          let timeout;
          return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
              func.apply(context, args);
            }, wait);
          };
        }
        
        // 使用防抖处理mousemove事件
        window._mouseMoveHandler = debounce(window._mouseMoveHandler, 50);
      })();
    `).catch(err => {
      console.error('Failed to inject mouse event handler:', err);
    });
  });

  // Add more detailed logging for window events
  state.mainWindow.webContents.on("did-finish-load", () => {
    console.log("Window finished loading")
  })
  state.mainWindow.webContents.on(
    "did-fail-load",
    async (event, errorCode, errorDescription) => {
      console.error("Window failed to load:", errorCode, errorDescription)
      if (isDev) {
        // In development, retry loading after a short delay
        console.log("Retrying to load development server...")
        setTimeout(() => {
          state.mainWindow?.loadURL("http://localhost:54321").catch((error) => {
            console.error("Failed to load dev server on retry:", error)
          })
        }, 1000)
      }
    }
  )

  if (isDev) {
    // In development, load from the dev server
    console.log("Loading from development server: http://localhost:54321")
    state.mainWindow.loadURL("http://localhost:54321").catch((error) => {
      console.error("Failed to load dev server, falling back to local file:", error)
      // Fallback to local file if dev server is not available
      const indexPath = path.join(__dirname, "../dist/index.html")
      console.log("Falling back to:", indexPath)
      if (fs.existsSync(indexPath)) {
        state.mainWindow.loadFile(indexPath)
      } else {
        console.error("Could not find index.html in dist folder")
      }
    })
  } else {
    // In production, load from the built files
    const indexPath = path.join(__dirname, "../dist/index.html")
    console.log("Loading production build:", indexPath)
    
    if (fs.existsSync(indexPath)) {
      state.mainWindow.loadFile(indexPath)
    } else {
      console.error("Could not find index.html in dist folder")
    }
  }

  // Configure window behavior
  state.mainWindow.webContents.setZoomFactor(1)
  if (isDev) {
    state.mainWindow.webContents.openDevTools()
  }
  state.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log("Attempting to open URL:", url)
    try {
      const parsedURL = new URL(url);
      const hostname = parsedURL.hostname;
      const allowedHosts = ["google.com", "supabase.co"];
      if (allowedHosts.includes(hostname) || hostname.endsWith(".google.com") || hostname.endsWith(".supabase.co")) {
        shell.openExternal(url);
        return { action: "deny" }; // Do not open this URL in a new Electron window
      }
    } catch (error) {
      console.error("Invalid URL %d in setWindowOpenHandler: %d" , url , error);
      return { action: "deny" }; // Deny access as URL string is malformed or invalid
    }
    return { action: "allow" };
  })

  // Enhanced screen capture resistance
  state.mainWindow.setContentProtection(true)

  state.mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true
  })
  state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1)

  // Additional screen capture resistance settings
  if (process.platform === "darwin") {
    // Prevent window from being captured in screenshots
    state.mainWindow.setHiddenInMissionControl(true)
    state.mainWindow.setWindowButtonVisibility(false)
    state.mainWindow.setBackgroundColor("#00000000")

    // Prevent window from being included in window switcher
    state.mainWindow.setSkipTaskbar(true)

    // Disable window shadow
    state.mainWindow.setHasShadow(false)
  }

  // Prevent the window from being captured by screen recording
  state.mainWindow.webContents.setBackgroundThrottling(false)
  state.mainWindow.webContents.setFrameRate(60)

  // Set up window listeners
  state.mainWindow.on("move", handleWindowMove)
  state.mainWindow.on("resize", handleWindowResize)
  state.mainWindow.on("closed", handleWindowClosed)

  // Initialize window state
  const bounds = state.mainWindow.getBounds()
  state.windowPosition = { x: bounds.x, y: bounds.y }
  state.windowSize = { width: bounds.width, height: bounds.height }
  state.currentX = bounds.x
  state.currentY = bounds.y
  state.isWindowVisible = true
  
  // Set initial window state
  const clientSettings = configHelper.getClientSettings();
  console.log(`Initial opacity from config: ${savedOpacity}`);
  
  // Force window to be visible initially and then set proper state
  state.mainWindow.show(); // Use show() instead of showInactive()
  state.mainWindow.focus(); // Ensure window has focus
  
  if (savedOpacity <= 0.1) {
    console.log('Initial opacity too low, will hide after showing');
    // Show window first, then hide it
    setTimeout(() => {
      if (state.mainWindow && !state.mainWindow.isDestroyed()) {
        hideMainWindow();
      }
    }, 100);
  } else {
    console.log(`Setting initial opacity to ${savedOpacity}`);
    state.mainWindow.setOpacity(savedOpacity);
    state.isWindowVisible = true;
  }
  
  // Ensure window is always on top and visible on all workspaces
  state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
  state.mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true
  });
  
  console.log(`Window created and shown. Visible: ${state.isWindowVisible}, Position: (${state.currentX}, ${state.currentY})`);
  
  // 窗口创建后处理认证状态
  handlePostWindowAuthCheck()

  // Event listeners for webContents messages
  state.mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`Frontend console: ${message}`)
  })

  // 监听登录需求事件
  state.mainWindow.webContents.on('ipc-message', (event, channel, ...args) => {
    if (channel === 'show-login-required') {
      const [loginData] = args;
      console.log('🔐 收到登录需求事件:', loginData);
      
      // 显示登录提示通知
      state.mainWindow?.webContents.send('show-notification', {
        type: 'warning',
        title: loginData.title || '需要登录',
        message: loginData.message || '请先登录以使用AI功能',
        duration: 8000,
        actions: [{
          text: '立即登录',
          action: 'open-web-login'
        }]
      });
    }
  });
}

/**
 * 窗口创建后处理认证状态（优化用户体验）
 */
async function handlePostWindowAuthCheck() {
  // 延迟1秒后检查登录状态
  setTimeout(async () => {
    try {
      console.log("🔐 窗口创建后重新检查登录状态...")
      
      // 使用完整的认证初始化，包括检查共享会话
      const isAuthenticated = await simpleAuthManager.initializeAuth()
      if (isAuthenticated) {
        // 用户已登录，显示简洁的欢迎信息
        const user = simpleAuthManager.getCurrentUser()
        console.log(`✅ 用户已登录: ${user?.username}`)
        if (state.mainWindow) {
          state.mainWindow.webContents.send('show-notification', {
            type: 'success',
            title: '系统就绪',
            message: `欢迎回来，${user?.username}！`,
            duration: 2500
          })
        }
      } else {
        // 用户未登录，显示友好的登录提示
        console.log("❌ 用户未登录，显示登录提示")
        if (state.mainWindow) {
          state.mainWindow.webContents.send('show-notification', {
            type: 'info',
            title: '需要登录账户',
            message: '登录后即可使用AI智能分析功能',
            duration: 0, // 持续显示直到登录
            actions: [{
              text: '立即登录',
              action: 'open-web-login'
            }]
          })
        }
      }
    } catch (error) {
      console.error("❌ 登录检查失败:", error)
      if (state.mainWindow) {
        state.mainWindow.webContents.send('show-notification', {
          type: 'warning',
          title: '连接问题',
          message: '无法验证登录状态，请检查网络连接',
          duration: 6000,
          actions: [{
            text: '重试',
            action: 'open-web-login'
          }]
        })
      }
    }
  }, 1000)
}

function handleWindowMove(): void {
  if (!state.mainWindow) return
  const bounds = state.mainWindow.getBounds()
  state.windowPosition = { x: bounds.x, y: bounds.y }
  state.currentX = bounds.x
  state.currentY = bounds.y
}

function handleWindowResize(): void {
  if (!state.mainWindow) return
  const bounds = state.mainWindow.getBounds()
  state.windowSize = { width: bounds.width, height: bounds.height }
}

function handleWindowClosed(): void {
  state.mainWindow = null
  state.isWindowVisible = false
  state.windowPosition = null
  state.windowSize = null
}

// Window visibility functions
function hideMainWindow(): void {
  if (!state.mainWindow?.isDestroyed()) {
    const bounds = state.mainWindow.getBounds();
    state.windowPosition = { x: bounds.x, y: bounds.y };
    state.windowSize = { width: bounds.width, height: bounds.height };
    state.mainWindow.setIgnoreMouseEvents(true, { forward: true });
    state.mainWindow.setOpacity(0);
    state.isWindowVisible = false;
    console.log('Window hidden, opacity set to 0');
  }
}

function showMainWindow(): void {
  if (!state.mainWindow?.isDestroyed()) {
    try {
      // 确保窗口位置在屏幕范围内
      const { screen } = require('electron')
      const primaryDisplay = screen.getPrimaryDisplay()
      const workArea = primaryDisplay.workArea
      
      if (state.windowPosition && state.windowSize) {
        const { x, y } = state.windowPosition
        const { width, height } = state.windowSize
        
        // 检查窗口是否在屏幕范围内
        const adjustedX = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - width))
        const adjustedY = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - height))
        
        state.mainWindow.setBounds({
          x: adjustedX,
          y: adjustedY,
          width,
          height
        });
        
        // 更新状态
        state.currentX = adjustedX
        state.currentY = adjustedY
      }
      
      state.mainWindow.setIgnoreMouseEvents(false);
      state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
      state.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      });
      state.mainWindow.setContentProtection(true);
      state.mainWindow.setOpacity(0); // Set opacity to 0 before showing
      state.mainWindow.showInactive(); // Use showInactive instead of show+focus
      state.mainWindow.setOpacity(1); // Then set opacity to 1 after showing
      state.isWindowVisible = true;
      console.log(`Window shown at position (${state.currentX}, ${state.currentY}), opacity set to 1`);
    } catch (error) {
      console.error('Error showing main window:', error)
      // 简单回退方案
      state.mainWindow.setOpacity(1)
      state.mainWindow.showInactive()
      state.isWindowVisible = true
    }
  }
}

function toggleMainWindow(): void {
  console.log(`Toggling window. Current state: ${state.isWindowVisible ? 'visible' : 'hidden'}`);
  if (state.isWindowVisible) {
    hideMainWindow();
  } else {
    showMainWindow();
  }
}

// Window movement functions
function moveWindowHorizontal(updateFn: (x: number) => number): void {
  if (!state.mainWindow) return
  state.currentX = updateFn(state.currentX)
  state.mainWindow.setPosition(
    Math.round(state.currentX),
    Math.round(state.currentY)
  )
}

function moveWindowVertical(updateFn: (y: number) => number): void {
  if (!state.mainWindow) return

  const newY = updateFn(state.currentY)
  // Allow window to go 2/3 off screen in either direction
  const maxUpLimit = (-(state.windowSize?.height || 0) * 2) / 3
  const maxDownLimit =
    state.screenHeight + ((state.windowSize?.height || 0) * 2) / 3

  // Log the current state and limits
  console.log({
    newY,
    maxUpLimit,
    maxDownLimit,
    screenHeight: state.screenHeight,
    windowHeight: state.windowSize?.height,
    currentY: state.currentY,
    step: state.step
  })

  // 确保窗口可见且响应
  if (state.mainWindow.getOpacity() === 0) {
    console.log("Window was hidden, making it visible for movement")
    state.mainWindow.setOpacity(1)
    state.mainWindow.setIgnoreMouseEvents(false)
    state.isWindowVisible = true
  }

  // Only update if within bounds, or if we're trying to move the window back on screen
  const isMovingBackOnScreen = (state.currentY < 0 && newY > state.currentY) || 
                                (state.currentY > state.screenHeight && newY < state.currentY)
  
  if ((newY >= maxUpLimit && newY <= maxDownLimit) || isMovingBackOnScreen) {
    state.currentY = newY
    state.mainWindow.setPosition(
      Math.round(state.currentX),
      Math.round(state.currentY)
    )
    console.log(`Window moved to position: (${Math.round(state.currentX)}, ${Math.round(state.currentY)})`)
  } else {
    console.log(`Movement blocked - would move outside bounds. Current: ${state.currentY}, Attempted: ${newY}`)
  }
}

// Window dimension functions
function setWindowDimensions(width: number, height: number): void {
  if (!state.mainWindow?.isDestroyed()) {
    const [currentX, currentY] = state.mainWindow.getPosition()
    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize
    const maxWidth = Math.floor(workArea.width * 0.5)

    state.mainWindow.setBounds({
      x: Math.min(currentX, workArea.width - maxWidth),
      y: currentY,
      width: Math.min(width + 32, maxWidth),
      height: Math.ceil(height)
    })
  }
}

// Environment setup
function loadEnvVariables() {
  if (isDev) {
    console.log("Loading env variables from:", path.join(process.cwd(), ".env"))
    dotenv.config({ path: path.join(process.cwd(), ".env") })
  } else {
    console.log(
      "Loading env variables from:",
      path.join(process.resourcesPath, ".env")
    )
    dotenv.config({ path: path.join(process.resourcesPath, ".env") })
  }
  console.log("Environment variables loaded for open-source version")
}

// Initialize application
async function initializeApp() {
  try {
    // Set custom cache directory to prevent permission issues
    const appDataPath = path.join(app.getPath('appData'), 'interview-coder-v1')
    const sessionPath = path.join(appDataPath, 'session')
    const tempPath = path.join(appDataPath, 'temp')
    const cachePath = path.join(appDataPath, 'cache')
    
    // Create directories if they don't exist
    for (const dir of [appDataPath, sessionPath, tempPath, cachePath]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }
    
    app.setPath('userData', appDataPath)
    app.setPath('sessionData', sessionPath)      
    app.setPath('temp', tempPath)
    app.setPath('cache', cachePath)
      
    loadEnvVariables()
    
    // Configuration file setup (API key is now built-in)
    console.log("Using built-in API configuration.")
    
    // Initialize Web authentication manager
    await initializeWebAuth()
    
    // 🆕 监听自动重新登录事件
    simpleAuthManager.on('auto-relogin-started', () => {
      console.log('🔄 自动重新登录开始')
      if (state.mainWindow && !state.mainWindow.isDestroyed()) {
        state.mainWindow.webContents.send('auto-relogin-started')
      }
    })

    simpleAuthManager.on('auto-relogin-success', (data) => {
      console.log('✅ 自动重新登录成功:', data)
      if (state.mainWindow && !state.mainWindow.isDestroyed()) {
        state.mainWindow.webContents.send('auto-relogin-success', data)
      }
    })

    simpleAuthManager.on('auto-relogin-failed', (data) => {
      console.log('❌ 自动重新登录失败:', data)
      if (state.mainWindow && !state.mainWindow.isDestroyed()) {
        state.mainWindow.webContents.send('auto-relogin-failed', data)
      }
    })

    simpleAuthManager.on('show-relogin-prompt', () => {
      console.log('💬 显示重新登录提示')
      if (state.mainWindow && !state.mainWindow.isDestroyed()) {
        state.mainWindow.webContents.send('show-relogin-prompt')
      }
    })
    
    // 智能认证检查 - 如果未登录则引导用户登录
    await performSimpleStartupCheck()
    
    initializeHelpers()
    initializeIpcHandlers({
      getMainWindow,
      setWindowDimensions,
      getScreenshotQueue,
      getExtraScreenshotQueue,
      deleteScreenshot,
      getImagePreview,
      processingHelper: state.processingHelper,
      PROCESSING_EVENTS: state.PROCESSING_EVENTS,
      takeScreenshot,
      getView,
      toggleMainWindow,
      clearQueues,
      setView,
      moveWindowLeft: () =>
        moveWindowHorizontal((x) =>
          Math.max(-(state.windowSize?.width || 0) / 2, x - state.step)
        ),
      moveWindowRight: () =>
        moveWindowHorizontal((x) =>
          Math.min(
            state.screenWidth - (state.windowSize?.width || 0) / 2,
            x + state.step
          )
        ),
      moveWindowUp: () => moveWindowVertical((y) => y - state.step),
      moveWindowDown: () => moveWindowVertical((y) => y + state.step)
    })
    await createWindow()
    state.shortcutsHelper?.registerGlobalShortcuts()

    // Initialize auto-updater regardless of environment
    initAutoUpdater()
    console.log(
      "Auto-updater initialized in",
      isDev ? "development" : "production",
      "mode"
    )
  } catch (error) {
    console.error("Failed to initialize application:", error)
    app.quit()
  }
}

// Auth callback handling removed - no longer needed
app.on("open-url", (event, url) => {
  console.log("open-url event received:", url)
  event.preventDefault()
})

// Handle second instance (removed auth callback handling)
app.on("second-instance", (event, commandLine) => {
  console.log("second-instance event received:", commandLine)
  
  // Focus or create the main window
  if (!state.mainWindow) {
    createWindow()
  } else {
    if (state.mainWindow.isMinimized()) state.mainWindow.restore()
    state.mainWindow.focus()
  }
})

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
      state.mainWindow = null
    }
  })
}

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// State getter/setter functions
function getMainWindow(): BrowserWindow | null {
  return state.mainWindow
}

function getView(): "queue" | "solutions" | "debug" {
  return state.view
}

function setView(view: "queue" | "solutions" | "debug"): void {
  state.view = view
  state.screenshotHelper?.setView(view)
}

function getScreenshotHelper(): ScreenshotHelper | null {
  return state.screenshotHelper
}

function getProblemInfo(): any {
  return state.problemInfo
}

function setProblemInfo(problemInfo: any): void {
  state.problemInfo = problemInfo
}

function getScreenshotQueue(): string[] {
  return state.screenshotHelper?.getScreenshotQueue() || []
}

function getExtraScreenshotQueue(): string[] {
  return state.screenshotHelper?.getExtraScreenshotQueue() || []
}

function clearQueues(): void {
  state.screenshotHelper?.clearQueues()
  state.problemInfo = null
  setView("queue")
}

async function takeScreenshot(): Promise<string> {
  if (!state.mainWindow) throw new Error("No main window available")
  return (
    state.screenshotHelper?.takeScreenshot(
      () => hideMainWindow(),
      () => showMainWindow()
    ) || ""
  )
}

async function getImagePreview(filepath: string): Promise<string> {
  return state.screenshotHelper?.getImagePreview(filepath) || ""
}

async function deleteScreenshot(
  path: string
): Promise<{ success: boolean; error?: string }> {
  return (
    state.screenshotHelper?.deleteScreenshot(path) || {
      success: false,
      error: "Screenshot helper not initialized"
    }
  )
}

function setHasDebugged(value: boolean): void {
  state.hasDebugged = value
}

function getHasDebugged(): boolean {
  return state.hasDebugged
}

function isVisible(): boolean {
  return state.isWindowVisible
}

// Export state and functions for other modules
  export {
    state,
    createWindow,
    hideMainWindow,
    showMainWindow,
    toggleMainWindow,
    setWindowDimensions,
    moveWindowHorizontal,
    moveWindowVertical,
    getMainWindow,
    getView,
    setView,
    getScreenshotHelper,
    getProblemInfo,
    setProblemInfo,
    getScreenshotQueue,
    getExtraScreenshotQueue,
    clearQueues,
    takeScreenshot,
    getImagePreview,
    deleteScreenshot,
    setHasDebugged,
    getHasDebugged,
    isVisible
  }

app.whenReady().then(initializeApp)
