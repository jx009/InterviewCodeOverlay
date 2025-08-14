// SimpleProcessingHelper.ts - Cursor式AI处理助手
import fs from "node:fs"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import { BrowserWindow } from "electron"
import { OpenAI } from "openai"
import { simpleAuthManager } from "./SimpleAuthManager"
import { configHelper } from "./ConfigHelper"
import { ipcMain } from "electron"
import { randomUUID } from "crypto"
import fetch from 'node-fetch'

// Set UTF-8 encoding for console output in this module
if (process.stdout.setEncoding) {
  process.stdout.setEncoding('utf8')
}
if (process.stderr.setEncoding) {
  process.stderr.setEncoding('utf8')
}

// LLM配置接口
interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  maxRetries: number;
  timeout: number;
  provider: string;
}

// 类型定义
type CreditResult = {
  success: boolean;
  sufficient?: boolean;
  currentPoints?: number;
  newBalance?: number;
  requiredPoints?: number;
  message?: string
}

/**
 * 简化的AI处理助手 - 采用Cursor式设计
 * 核心原则：
 * 1. 强制用户认证（必须登录才能使用）
 * 2. 统一token验证
 * 3. 简化的配置获取（直接从Web用户配置）
 */
export class SimpleProcessingHelper {
  private deps: IProcessingHelperDeps
  private screenshotHelper: ScreenshotHelper
  private ismaqueClient: OpenAI | null = null
  private static instance: SimpleProcessingHelper | null = null
  private ongoingRequests: Map<string, AbortController> = new Map()

  // AbortControllers for API requests
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  // 🆕 积分管理相关
  private pendingCreditOperations: Map<string, { modelName: string; questionType: string; amount: number; transactionId?: number }> = new Map()

  // 🆕 积分缓存
  private userCredits: number | null = null
  private lastCreditsFetchTime: number = 0
  private CREDITS_CACHE_TTL = 60000 // 1分钟缓存时间
  private creditModelsCache: Map<string, number> = new Map() // 缓存模型积分配置

  // 🆕 LLM配置缓存
  private llmConfig: LLMConfig | null = null
  private lastLLMConfigFetchTime: number = 0
  private LLM_CONFIG_CACHE_TTL = 300000 // 5分钟缓存时间

  constructor(deps: IProcessingHelperDeps) {
    this.deps = deps
    this.screenshotHelper = deps.getScreenshotHelper()

    // AI客户端将在需要时动态初始化
  }

  /**
   * 从后端获取LLM配置
   */
  private async getLLMConfig(forceRefresh = false): Promise<LLMConfig | null> {
    const now = Date.now()

    // 如果有缓存且未过期，直接返回缓存数据
    if (!forceRefresh && this.llmConfig && (now - this.lastLLMConfigFetchTime) < this.LLM_CONFIG_CACHE_TTL) {
      console.log("✅ 使用缓存的LLM配置")
      return this.llmConfig
    }

    try {
      const token = simpleAuthManager.getToken()
      if (!token) {
        console.error("❌ 未找到认证token，无法获取LLM配置")
        // 降级到默认配置
        return this.getDefaultLLMConfig()
      }

      const BASE_URL = 'http://159.75.174.234:3004'
      console.log("🔍 正在获取LLM配置，URL:", `${BASE_URL}/api/client/credits?llm-config=true`)

      const response = await fetch(`${BASE_URL}/api/client/credits?llm-config=true`, {
        method: 'GET',
        headers: {
          'X-Session-Id': token,
          'Content-Type': 'application/json'
        }
      })

      console.log("📡 LLM配置请求响应状态:", response.status, response.statusText)

      if (!response.ok) {
        console.error("❌ 获取LLM配置失败:", response.status, response.statusText)

        // 如果是404，说明API接口不存在，使用默认配置
        if (response.status === 404) {
          console.warn("⚠️ LLM配置API不存在，使用默认配置")
          return this.getDefaultLLMConfig()
        }

        // 其他错误也降级到默认配置
        return this.getDefaultLLMConfig()
      }

      const data = await response.json()
      console.log("📦 LLM配置响应数据:", data)

      if (data.success && data.data && data.data.config) {
        // 更新缓存
        this.llmConfig = data.data.config
        this.lastLLMConfigFetchTime = now
        console.log("✅ LLM配置获取成功:", {
          provider: data.data.config.provider,
          baseUrl: data.data.config.baseUrl,
          hasApiKey: !!data.data.config.apiKey,
          source: data.data.source
        })
        return data.data.config
      } else {
        console.error("❌ LLM配置响应格式错误:", data)
        console.warn("⚠️ 降级到默认配置")
        return this.getDefaultLLMConfig()
      }
    } catch (error) {
      console.error("❌ 获取LLM配置异常:", error)
      console.warn("⚠️ 网络异常，降级到默认配置")
      return this.getDefaultLLMConfig()
    }
  }

  /**
   * 获取默认LLM配置（降级方案）
   */
  private getDefaultLLMConfig(): LLMConfig {
    console.log("🔧 使用默认LLM配置")
    return {
      baseUrl: "https://ismaque.org/v1",
      apiKey: "sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP",
      maxRetries: 2,
      timeout: 30000,
      provider: "ismaque"
    }
  }

  /**
   * 动态初始化AI客户端
   */
  private async initializeAIClient(): Promise<boolean> {
    try {
      // 获取LLM配置
      const config = await this.getLLMConfig()
      if (!config) {
        console.error("❌ 无法获取LLM配置，AI客户端初始化失败")
        return false
      }

      // 使用配置初始化AI客户端
      this.ismaqueClient = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
        maxRetries: config.maxRetries || 2,
        timeout: config.timeout || 30000
      })

      console.log(`✅ AI客户端初始化成功 (${config.provider})`)
      return true
    } catch (error) {
      console.error("❌ AI客户端初始化失败:", error)
      this.ismaqueClient = null
      return false
    }
  }

  /**
   * 确保AI客户端已初始化
   */
  private async ensureAIClient(): Promise<boolean> {
    if (!this.ismaqueClient) {
      return await this.initializeAIClient()
    }
    return true
  }

  /**
   * 刷新LLM配置并重新初始化客户端
   */
  public async refreshLLMConfig(): Promise<boolean> {
    console.log("🔄 刷新LLM配置...")
    this.llmConfig = null
    this.ismaqueClient = null
    return await this.initializeAIClient()
  }

  /**
   * 核心方法：处理截图（强制多选题模式）
   * 强制登录流程：检查认证 → 获取配置 → 处理AI → 返回结果
   */
  public async processScreenshotsAsMultipleChoice(operationId?: string): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    console.log('🚀 开始多选题AI处理流程...')

    // Step 1: 强制检查用户认证
    console.log('🔐 执行认证检查...')
    const isAuthenticated = await simpleAuthManager.isAuthenticated()
    console.log('🔐 认证检查结果:', isAuthenticated)

    if (!isAuthenticated) {
      console.log('❌ 用户未认证，必须登录')
      await this.showLoginDialog()
      return
    }

    // Step 2: 获取用户和配置
    console.log('👤 获取用户信息...')
    const user = simpleAuthManager.getCurrentUser()
    console.log('👤 用户信息:', user ? `${user.username} (${user.id})` : 'null')

    console.log('⚙️ 获取用户配置...')
    // 强制刷新配置以确保获取最新设置
    console.log('🔄 强制刷新用户配置以获取最新设置...')
    await simpleAuthManager.refreshUserConfig(true) // 强制刷新

    const userConfig = simpleAuthManager.getUserConfig()
    console.log('⚙️ 用户配置:', userConfig ? {
      aiModel: userConfig.aiModel,
      programmingModel: userConfig.programmingModel,
      multipleChoiceModel: userConfig.multipleChoiceModel,
      language: userConfig.language
    } : 'null')

    if (!user || !userConfig) {
      console.log('❌ 用户信息或配置获取失败，需要重新登录')
      console.log('  - 用户信息存在:', !!user)
      console.log('  - 用户配置存在:', !!userConfig)
      await this.showLoginDialog()
      return
    }

    console.log(`✅ 用户认证成功: ${user.username}`)
    console.log(`📋 使用配置: 多选题模型=${userConfig.multipleChoiceModel || userConfig.aiModel || 'gpt-3.5-turbo'}`)

    // Step 3: 使用Web端语言设置（优先级最高）
    const finalLanguage = userConfig.language || 'python'

    console.log(`🎯 最终使用语言 (来自Web配置): ${finalLanguage}`)

    // Step 4: 执行多选题AI处理
    const view = this.deps.getView()
    if (view === "queue") {
      await this.processMainQueueAsMultipleChoice(userConfig, finalLanguage, operationId)
    } else {
      console.log('⚠️ 多选题模式只支持主队列处理')
      await this.processMainQueueAsMultipleChoice(userConfig, finalLanguage, operationId)
    }
  }

  /**
   * 核心方法：处理截图
   * 强制登录流程：检查认证 → 获取配置 → 处理AI → 返回结果
   */
  public async processScreenshots(): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    console.log('🚀 开始AI处理流程...')

    // Step 1: 强制检查用户认证
    console.log('🔐 执行认证检查...')
    const isAuthenticated = await simpleAuthManager.isAuthenticated()
    console.log('🔐 认证检查结果:', isAuthenticated)

    if (!isAuthenticated) {
      console.log('❌ 用户未认证，必须登录')
      await this.showLoginDialog()
      return
    }

    // Step 2: 获取用户和配置
    console.log('👤 获取用户信息...')
    const user = simpleAuthManager.getCurrentUser()
    console.log('👤 用户信息:', user ? `${user.username} (${user.id})` : 'null')

    console.log('⚙️ 获取用户配置...')
    // 强制刷新配置以确保获取最新设置
    console.log('🔄 强制刷新用户配置以获取最新设置...')
    await simpleAuthManager.refreshUserConfig(true) // 强制刷新

    const userConfig = simpleAuthManager.getUserConfig()
    console.log('⚙️ 用户配置:', userConfig ? {
      aiModel: userConfig.aiModel,
      programmingModel: userConfig.programmingModel,
      multipleChoiceModel: userConfig.multipleChoiceModel,
      language: userConfig.language
    } : 'null')

    if (!user || !userConfig) {
      console.log('❌ 用户信息或配置获取失败，需要重新登录')
      console.log('  - 用户信息存在:', !!user)
      console.log('  - 用户配置存在:', !!userConfig)
      await this.showLoginDialog()
      return
    }

    console.log(`✅ 用户认证成功: ${user.username}`)
    console.log(`📋 使用配置: AI模型=${userConfig.aiModel}, 语言=${userConfig.language}`)

    // Step 3: 使用Web端语言设置（优先级最高）
    const finalLanguage = userConfig.language || 'python'

    console.log(`🎯 最终使用语言 (来自Web配置): ${finalLanguage}`)

    // Step 4: 执行AI处理
    const view = this.deps.getView()
    if (view === "queue") {
      await this.processMainQueue(userConfig, finalLanguage)
    } else {
      await this.processExtraQueue(userConfig, finalLanguage)
    }
  }


  /**
   * 等待客户端初始化
   */
  private async waitForInitialization(mainWindow: BrowserWindow): Promise<void> {
    let attempts = 0
    const maxAttempts = 50

    while (attempts < maxAttempts) {
      const isInitialized = await mainWindow.webContents.executeJavaScript(
          "window.__IS_INITIALIZED__"
      )
      if (isInitialized) return
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }
    throw new Error("应用程序5秒后初始化失败")
  }


  /**
   * 处理主队列截图（强制多选题模式）
   */
  private async processMainQueueAsMultipleChoice(userConfig: any, language: string, operationId?: string): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    console.log('📸 开始处理主队列截图（多选题模式）...')
    mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)

    const screenshotQueue = this.screenshotHelper.getScreenshotQueue()

    // 检查截图队列
    if (!screenshotQueue || screenshotQueue.length === 0) {
      console.log("❌ 主队列中没有截图")
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
      return
    }

    // 检查文件是否存在
    const existingScreenshots = screenshotQueue.filter(path => fs.existsSync(path))
    if (existingScreenshots.length === 0) {
      console.log("❌ 截图文件不存在")
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
      return
    }

    try {
      // 初始化AbortController
      this.currentProcessingAbortController = new AbortController()
      const { signal } = this.currentProcessingAbortController

      // 加载截图数据
      const screenshots = await Promise.all(
          existingScreenshots.map(async (path) => {
            try {
              return {
                path,
                preview: await this.screenshotHelper.getImagePreview(path),
                data: fs.readFileSync(path).toString('base64')
              }
            } catch (err) {
              console.error(`读取截图错误 ${path}:`, err)
              return null
            }
          })
      )

      const validScreenshots = screenshots.filter(Boolean)

      if (validScreenshots.length === 0) {
        throw new Error("加载截图数据失败")
      }

      // 处理截图（强制为多选题）
      const result = await this.processScreenshotsWithAIAsMultipleChoice(validScreenshots, userConfig, language, signal, operationId)

      if (!result.success) {
        console.log("❌ 多选题AI处理失败:", result.error)

        // 检查是否是认证错误
        if (this.isAuthError(result.error)) {
          await simpleAuthManager.logout()
          await this.showLoginDialog()
        } else {
          mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
              result.error
          )
        }

        this.deps.setView("queue")
        return
      }

      // 成功处理
      console.log("✅ 多选题AI处理成功")
      mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          'data' in result ? result.data : null
      )
      this.deps.setView("solutions")

    } catch (error: any) {
      console.error("多选题处理错误:", error)

      if (error.name === 'AbortError') {
        mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "多选题处理已被用户取消"
        )
      } else {
        mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            error.message || "多选题处理失败，请重试"
        )
      }

      this.deps.setView("queue")
    } finally {
      this.currentProcessingAbortController = null
    }
  }

  /**
   * 处理主队列截图
   */
  private async processMainQueue(userConfig: any, language: string): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    console.log('📸 开始处理主队列截图...')
    mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)

    const screenshotQueue = this.screenshotHelper.getScreenshotQueue()

    // 检查截图队列
    if (!screenshotQueue || screenshotQueue.length === 0) {
      console.log("❌ 主队列中没有截图")
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
      return
    }

    // 检查文件是否存在
    const existingScreenshots = screenshotQueue.filter(path => fs.existsSync(path))
    if (existingScreenshots.length === 0) {
      console.log("❌ 截图文件不存在")
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
      return
    }

    try {
      // 初始化AbortController
      this.currentProcessingAbortController = new AbortController()
      const { signal } = this.currentProcessingAbortController

      // 加载截图数据
      const screenshots = await Promise.all(
          existingScreenshots.map(async (path) => {
            try {
              return {
                path,
                preview: await this.screenshotHelper.getImagePreview(path),
                data: fs.readFileSync(path).toString('base64')
              }
            } catch (err) {
              console.error(`读取截图错误 ${path}:`, err)
              return null
            }
          })
      )

      const validScreenshots = screenshots.filter(Boolean)

      if (validScreenshots.length === 0) {
        throw new Error("加载截图数据失败")
      }

      // 处理截图
      const result = await this.processScreenshotsWithAI(validScreenshots, userConfig, language, signal)

      if (!result.success) {
        console.log("❌ AI处理失败:", result.error)

        // 检查是否是认证错误
        if (this.isAuthError(result.error)) {
          await simpleAuthManager.logout()
          await this.showLoginDialog()
        } else {
          mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
              result.error
          )
        }

        this.deps.setView("queue")
        return
      }

      // 成功处理
      console.log("✅ AI处理成功")
      mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          'data' in result ? result.data : null
      )
      this.deps.setView("solutions")

    } catch (error: any) {
      console.error("处理错误:", error)

      if (error.name === 'AbortError') {
        mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "处理已被用户取消"
        )
      } else {
        mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            error.message || "处理失败，请重试"
        )
      }

      this.deps.setView("queue")
    } finally {
      this.currentProcessingAbortController = null
    }
  }

  /**
   * 显示友好的登录提示
   */
  private async showLoginDialog(): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    // 显示友好的登录提示
    mainWindow.webContents.send('show-notification', {
      type: 'info',
      title: '需要登录账户',
      message: '请登录以使用AI智能分析功能',
      duration: 0, // 持续显示
      actions: [{
        text: '立即登录',
        action: 'open-web-login'
      }]
    })

    // 监听登录进度事件
    const handleLoginProgress = (data: any) => {
      mainWindow.webContents.send('show-notification', {
        type: 'loading',
        title: '正在登录',
        message: data.message,
        duration: 30000, // 30秒后自动消失，避免永久显示
        showProgress: true
      })
    }

    const handleLoginSuccess = (data: any) => {
      // 先清除加载通知，再显示成功通知
      mainWindow.webContents.send('clear-notification')
      setTimeout(() => {
        mainWindow.webContents.send('show-notification', {
          type: 'success',
          title: '登录成功',
          message: data.message,
          duration: 3000
        })
      }, 100)
    }

    const handleLoginError = (data: any) => {
      // 先清除加载通知，再显示错误通知
      mainWindow.webContents.send('clear-notification')
      setTimeout(() => {
        mainWindow.webContents.send('show-notification', {
          type: 'error',
          title: '登录失败',
          message: data.error,
          duration: 6000,
          actions: [{
            text: '重试',
            action: 'open-web-login'
          }]
        })
      }, 100)
    }

    const handleLoginCancelled = () => {
      // 登录被取消时清除通知
      mainWindow.webContents.send('clear-notification')
    }

    // 临时监听登录事件
    simpleAuthManager.once('login-progress', handleLoginProgress)
    simpleAuthManager.once('login-success', handleLoginSuccess)
    simpleAuthManager.once('login-error', handleLoginError)
    simpleAuthManager.once('login-cancelled', handleLoginCancelled)
  }

  /**
   * 使用AI处理截图（强制多选题模式）
   */
  private async processScreenshotsWithAIAsMultipleChoice(
      screenshots: Array<{ path: string; data: string }>,
      userConfig: any,
      language: string,
      signal: AbortSignal,
      providedOperationId?: string
  ) {
    // 使用提供的操作ID，如果没有则生成新的
    const operationId = providedOperationId || `ai_call_multiple_choice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📝 ${providedOperationId ? '使用提供的' : '创建新的'}多选题操作ID: ${operationId}`);

    try {
      const mainWindow = this.deps.getMainWindow()

      if (!(await this.ensureAIClient())) {
        return {
          success: false,
          error: "AI客户端初始化失败，请检查网络连接或联系管理员"
        }
      }

      // Step 1: 强制设定为多选题，跳过题目类型识别
      const questionType = 'multiple_choice'

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "检测到多选题模式，正在提取题目信息...",
          progress: 20
        })
      }

      // 确定要使用的模型（多选题模型）
      const modelName = userConfig.multipleChoiceModel || userConfig.aiModel || 'gpt-3.5-turbo';

      // Step 1.5: 积分检查和扣除
      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "检查积分余额...",
          progress: 15
        })
      }

      // 使用直接的检查方式，避免类型错误
      try {
        // 先获取token
        const token = simpleAuthManager.getToken();
        if (!token) {
          return {
            success: false,
            error: "用户未登录，请先登录"
          };
        }

        const BASE_URL = 'http://159.75.174.234:3004';

        // 1. 检查积分
        const checkResponse = await fetch(`${BASE_URL}/api/client/credits/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Id': token },
          body: JSON.stringify({ modelName, questionType })
        });

        const checkResult = await checkResponse.json();
        console.log('✅ 多选题积分检查结果:', checkResult);

        if (!checkResponse.ok || !checkResult.sufficient) {
          return {
            success: false,
            error: checkResult.error || `积分不足 (需要 ${checkResult.requiredCredits || '未知'} 积分)`
          };
        }

        // 2. 扣除积分
        const deductResponse = await fetch(`${BASE_URL}/api/client/credits/deduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Id': token },
          body: JSON.stringify({ modelName, questionType, operationId })
        });

        const deductResult = await deductResponse.json();
        console.log('💰 多选题积分扣除结果:', deductResult);

        if (!deductResponse.ok || !deductResult.success) {
          return {
            success: false,
            error: deductResult.error || '积分扣除失败'
          };
        }

        // 记录积分操作，便于后续退款
        console.log('🔍 积分扣除API响应:', deductResult);
        console.log('🔍 提取transactionId:', deductResult.transactionId);
        
        this.pendingCreditOperations.set(operationId, {
          modelName,
          questionType,
          amount: checkResult.requiredCredits || 0,
          transactionId: deductResult.transactionId
        });
        
        console.log('💾 保存操作记录到pendingCreditOperations:', {
          operationId,
          transactionId: deductResult.transactionId
        });

        console.log(`✅ 多选题积分检查通过，扣除成功，剩余积分: ${deductResult.newCredits || '未知'}`);
      } catch (creditsError) {
        console.error("多选题积分检查或扣除失败:", creditsError);
        return {
          success: false,
          error: `积分处理失败: ${creditsError.message || '未知错误'}`
        };
      }

      const imageDataList = screenshots.map(screenshot => screenshot.data)

      // 强制提取多选题信息（跳过类型识别）
      const problemInfo = await this.extractMultipleChoiceProblems(imageDataList, 'gemini-2.5-flash-preview-04-17', signal)

      if (!problemInfo.success) {
        // 提取信息失败，退款积分
        try {
          await this.refundCredits(operationId, 0, "多选题信息提取失败: " + (problemInfo.error || "未知错误"));
        } catch (refundError) {
          console.error("退款失败:", refundError);
          // 继续处理，不中断流程
        }
        return problemInfo
      }

      console.log("✅ 多选题信息提取成功:", (problemInfo as any).data)

      // Step 2: 生成多选题解决方案
      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "正在生成多选题解决方案...",
          progress: 60
        })
      }

      // 存储题目信息
      this.deps.setProblemInfo((problemInfo as any).data)

      // 发送题目提取成功事件
      if (mainWindow) {
        mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
            (problemInfo as any).data
        )
      }

      // 使用专门的多选题解决方案生成逻辑
      const solutionsResult = await this.generateMultipleChoiceSolutionsWithCustomPrompt(userConfig, (problemInfo as any).data, signal)

      console.log('🔍 搜题结果检查 - solutionsResult.success:', solutionsResult.success);
      console.log('🔍 当前operationId:', operationId);
      
      if (solutionsResult.success) {
        console.log('✅ 搜题成功，开始标记积分操作完成...');
        // 🆕 积分操作标记为完成
        try {
          await this.completeCreditsOperation(operationId);
          console.log('✅ 积分操作完成标记成功');
        } catch (completeError) {
          console.error("❌ 标记积分操作完成失败:", completeError);
          // 继续处理，不中断流程
        }

        // 清除额外截图队列
        this.screenshotHelper.clearExtraScreenshotQueue()

        if (mainWindow) {
          mainWindow.webContents.send("processing-status", {
            message: "多选题解决方案生成成功",
            progress: 100
          })
        }

        return { success: true, data: (solutionsResult as any).data }
      } else {
        console.log('❌ 搜题失败，不会标记积分操作完成');
        console.log('❌ 搜题失败原因:', solutionsResult.error || '未知原因');
        
        // 生成解决方案失败，退款积分
        try {
          await this.refundCredits(operationId, 0, "生成多选题解决方案失败: " + ((solutionsResult as any).error || "未知错误"));
        } catch (refundError) {
          console.error("退款失败:", refundError);
          // 继续处理，不中断流程
        }
        throw new Error((solutionsResult as any).error || "生成多选题解决方案失败")
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: "多选题处理已被用户取消"
        }
      }

      console.error("多选题AI处理错误:", error)
      return {
        success: false,
        error: error.message || "多选题AI处理失败，请重试"
      }
    }
  }

  /**
   * 使用AI处理截图（简化版本）
   */
  private async processScreenshotsWithAI(
      screenshots: Array<{ path: string; data: string }>,
      userConfig: any,
      language: string,
      signal: AbortSignal
  ) {
    // 生成唯一操作ID，用于跟踪整个处理过程中的积分消费
    const operationId = `ai_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📝 创建操作ID: ${operationId}`);

    try {
      const mainWindow = this.deps.getMainWindow()

      if (!(await this.ensureAIClient())) {
        return {
          success: false,
          error: "AI客户端初始化失败，请检查网络连接或联系管理员"
        }
      }

      // Step 1: 识别题目类型和提取题目信息
      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "正在识别题目类型...",
          progress: 10
        })
      }

      const imageDataList = screenshots.map(screenshot => screenshot.data)

      // 根据题目类型选择合适的模型
      const questionType = await this.identifyQuestionType(imageDataList, userConfig, signal)

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: `检测到${questionType === 'programming' ? '编程题' : '选择题'}，正在提取题目信息...`,
          progress: 20
        })
      }

      // 确定要使用的模型
      const modelName = questionType === 'programming'
          ? userConfig.programmingModel || userConfig.aiModel || 'gpt-4'
          : userConfig.multipleChoiceModel || userConfig.aiModel || 'gpt-3.5-turbo';

      // Step 1.5: 积分检查和扣除
      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "检查积分余额...",
          progress: 15
        })
      }

      // 使用直接的检查方式，避免类型错误
      try {
        // 先获取token
        const token = simpleAuthManager.getToken();
        if (!token) {
          return {
            success: false,
            error: "用户未登录，请先登录"
          };
        }

        const BASE_URL = 'http://159.75.174.234:3004';

        // 1. 检查积分
        const checkResponse = await fetch(`${BASE_URL}/api/client/credits/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Id': token },
          body: JSON.stringify({ modelName, questionType })
        });

        const checkResult = await checkResponse.json();
        console.log('✅ 积分检查结果:', checkResult);

        if (!checkResponse.ok || !checkResult.sufficient) {
          return {
            success: false,
            error: checkResult.error || `积分不足 (需要 ${checkResult.requiredCredits || '未知'} 积分)`
          };
        }

        // 2. 扣除积分
        const deductResponse = await fetch(`${BASE_URL}/api/client/credits/deduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Id': token },
          body: JSON.stringify({ modelName, questionType, operationId })
        });

        const deductResult = await deductResponse.json();
        console.log('💰 积分扣除结果:', deductResult);

        if (!deductResponse.ok || !deductResult.success) {
          return {
            success: false,
            error: deductResult.error || '积分扣除失败'
          };
        }

        // 记录积分操作，便于后续退款
        console.log('🔍 积分扣除API响应:', deductResult);
        console.log('🔍 提取transactionId:', deductResult.transactionId);
        
        this.pendingCreditOperations.set(operationId, {
          modelName,
          questionType,
          amount: checkResult.requiredCredits || 0,
          transactionId: deductResult.transactionId
        });
        
        console.log('💾 保存操作记录到pendingCreditOperations:', {
          operationId,
          transactionId: deductResult.transactionId
        });

        console.log(`✅ 积分检查通过，扣除成功，剩余积分: ${deductResult.newCredits || '未知'}`);
      } catch (creditsError) {
        console.error("积分检查或扣除失败:", creditsError);
        return {
          success: false,
          error: `积分处理失败: ${creditsError.message || '未知错误'}`
        };
      }

      // 根据题目类型提取不同的信息
      const problemInfo = await this.extractProblemInfo(imageDataList, questionType, userConfig, language, signal)

      if (!problemInfo.success) {
        // 提取信息失败，退款积分
        try {
          await this.refundCredits(operationId, 0, "题目信息提取失败: " + (problemInfo.error || "未知错误"));
        } catch (refundError) {
          console.error("退款失败:", refundError);
          // 继续处理，不中断流程
        }
        return problemInfo
      }

      console.log("✅ 题目信息提取成功:", (problemInfo as any).data)

      // Step 2: 生成解决方案
      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "正在生成解决方案...",
          progress: 60
        })
      }

      // 存储题目信息
      this.deps.setProblemInfo((problemInfo as any).data)

      // 发送题目提取成功事件
      if (mainWindow) {
        mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
            (problemInfo as any).data
        )
      }

      const solutionsResult = await this.generateSolutions(userConfig, language, (problemInfo as any).data, signal, operationId)

      console.log('🔍 搜题结果检查 - solutionsResult.success:', solutionsResult.success);
      console.log('🔍 当前operationId:', operationId);
      
      if (solutionsResult.success) {
        console.log('✅ 搜题成功，开始标记积分操作完成...');
        // 🆕 积分操作标记为完成
        try {
          await this.completeCreditsOperation(operationId);
          console.log('✅ 积分操作完成标记成功');
        } catch (completeError) {
          console.error("❌ 标记积分操作完成失败:", completeError);
          // 继续处理，不中断流程
        }

        // 清除额外截图队列
        this.screenshotHelper.clearExtraScreenshotQueue()

        if (mainWindow) {
          mainWindow.webContents.send("processing-status", {
            message: "解决方案生成成功",
            progress: 100
          })
        }

        return { success: true, data: (solutionsResult as any).data }
      } else {
        console.log('❌ 搜题失败，不会标记积分操作完成');
        console.log('❌ 搜题失败原因:', solutionsResult.error || '未知原因');
        
        // 生成解决方案失败，退款积分
        try {
          await this.refundCredits(operationId, 0, "生成解决方案失败: " + ((solutionsResult as any).error || "未知错误"));
        } catch (refundError) {
          console.error("退款失败:", refundError);
          // 继续处理，不中断流程
        }
        throw new Error((solutionsResult as any).error || "生成解决方案失败")
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: "处理已被用户取消"
        }
      }

      console.error("AI处理错误:", error)
      return {
        success: false,
        error: error.message || "AI处理失败，请重试"
      }
    }
  }

  /**
   * 生成解决方案
   */
  private async generateSolutions(userConfig: any, language: string, problemInfo: any, signal: AbortSignal, parentOperationId?: string) {
    try {
      if (!(await this.ensureAIClient())) {
        return {
          success: false,
          error: "AI客户端初始化失败"
        }
      }

      // 根据题目类型选择处理方式
      if (problemInfo.type === 'multiple_choice') {
        return await this.generateMultipleChoiceSolutions(userConfig, problemInfo, signal)
      } else {
        return await this.generateProgrammingSolutions(userConfig, language, problemInfo, signal, parentOperationId)
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: "处理已被用户取消"
        }
      }

      console.error("生成解决方案错误:", error)
      return { success: false, error: error.message || "生成解决方案失败" }
    }
  }

  /**
   * 生成编程题解决方案
   */
  private async generateProgrammingSolutions(userConfig: any, language: string, problemInfo: any, signal: AbortSignal, parentOperationId?: string) {
    const operationId = parentOperationId || `prog_${randomUUID()}`;
    console.log(`📝 编程题使用操作ID: ${operationId} ${parentOperationId ? '(继承自父级)' : '(新生成)'}`);
    let deductionInfo: {
      success: boolean;
      sufficient?: boolean;
      currentPoints?: number;
      newBalance?: number;
      requiredPoints?: number;
      message?: string
    } | null = null;
    try {
      // 🔧 使用可用的模型，优先使用用户配置，然后使用可用的备选模型
      let model = userConfig.programmingModel || userConfig.aiModel || 'gpt-3.5-turbo'

      // 移除硬编码的模型限制，允许使用用户配置的模型

      console.log('🎯 使用模型:', model)
      
      // 如果没有父级操作ID，说明是独立调用，需要检查和扣除积分
      if (!parentOperationId) {
        console.log('💰 独立调用，需要检查并扣除积分');
        const model = userConfig.programmingModel || userConfig.aiModel || 'claude-sonnet-4-20250514'
        deductionInfo = await this.checkAndDeductCredits(model, 'programming', operationId);

        if (!deductionInfo.success) {
          return {
            success: false,
            error: deductionInfo.message || "积分检查失败"
          }
        }
      } else {
        console.log('ℹ️ 跳过重复的积分检查（已在上层方法中完成）')
      }

      const promptText = `
请为以下编程题目提供最优解决方案：

【题目描述】
${problemInfo.problem_statement}

【约束条件】
${problemInfo.constraints || "未提供具体约束条件"}

【示例输入】
${problemInfo.example_input || "未提供示例输入"}

【示例输出】  
${problemInfo.example_output || "未提供示例输出"}

【编程语言】${language}

**解决方案要求：**
1. 仔细分析题目要求，确保理解正确
2. 选择最合适的算法和数据结构
3. 代码必须能正确处理所有边界情况
4. 优化时间和空间复杂度

**回复格式：**

**解题思路：**
- [分析思路1]
- [分析思路2]
- [核心算法]

**代码实现：**
\`\`\`${language}
[完整的ACM竞赛格式代码]
\`\`\`

**复杂度分析：**
时间复杂度：O(X) - [详细解释]
空间复杂度：O(X) - [详细解释]

**代码要求：**
- 完整的ACM竞赛格式（包含main函数和输入输出处理）
- Java语言使用"public class Main"
- 严格按照题目的输入输出格式
- 包含必要的导入语句
- 代码可直接运行，无需修改`

      // 🆕 使用流式调用替代批式调用
      console.log('🌊 开始流式AI调用...')
      let fullContent = ''
      
      try {
        // 创建流式AI调用
        const stream = await this.ismaqueClient.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: "你是一位资深的算法竞赛专家和编程面试官。你的任务是提供准确、高效、可直接运行的编程解决方案。请确保代码质量高、逻辑清晰、性能最优。" },
            { role: "user", content: promptText }
          ],
          max_tokens: 6000,
          temperature: 0.1,
          stream: true  // 🆕 启用流式输出
        }, { signal })

        console.log('✅ 编程题流式AI调用启动成功')

        // 🆕 处理流式数据
        const mainWindow = this.deps.getMainWindow()
        if (!mainWindow) {
          throw new Error('主窗口不可用')
        }

        // 🆕 发送流式传输开始信号
        mainWindow.webContents.send('solution-stream-chunk', {
          delta: '',
          fullContent: '',
          progress: 0,
          isComplete: false,
          chunkIndex: 0,
          streamingStarted: true  // 标识流式传输开始
        })
        console.log('🚀 流式传输开始信号已发送')

        // 🆕 流式数据处理循环
        let chunkCount = 0
        for await (const chunk of stream) {
          if (signal.aborted) {
            throw new Error('操作已取消')
          }

          const delta = chunk.choices[0]?.delta?.content || ''
          if (delta) {
            fullContent += delta
            chunkCount++
            
            // 🔧 每个数据块都发送到前端，确保真正的流式效果
            mainWindow.webContents.send('solution-stream-chunk', {
              delta: delta,
              fullContent: fullContent,
              progress: Math.min(Math.floor((fullContent.length / 2000) * 100), 95), // 基于预期长度估算进度
              isComplete: false,
              chunkIndex: chunkCount
            })
            
            // 流式数据处理
          }
        }

        console.log('✅ 编程题AI调用完成')

        // 🆕 发送完成信号
        mainWindow.webContents.send('solution-stream-chunk', {
          delta: '',
          fullContent: fullContent,
          progress: 100,
          isComplete: true
        })

      } catch (error) {
        console.error('❌ 编程题流式AI调用失败:', error)
        
        // 发送错误信号给前端
        const mainWindow = this.deps.getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send('solution-stream-error', error.message || '流式调用失败')
        }
        
        // AI调用失败，退还积分（仅在独立调用时）
        if (deductionInfo && deductionInfo.requiredPoints) {
          await this.refundCredits(operationId, deductionInfo.requiredPoints, '编程题AI调用失败')
        }
        throw error
      }

      // 🆕 流式调用完成后，解析最终内容
      if (!fullContent.trim()) {
        console.error('❌ 流式调用未收到任何内容')
        if (deductionInfo && deductionInfo.requiredPoints) {
          await this.refundCredits(operationId, deductionInfo.requiredPoints, '流式调用未收到内容')
        }
        throw new Error('AI流式调用未返回任何内容')
      }

      console.log('📝 开始解析流式响应内容')

      // 🆕 解析完整的流式响应内容
      const codeMatch = fullContent.match(/```(?:\w+)?\s*([\s\S]*?)```/)
      const code = codeMatch ? codeMatch[1].trim() : fullContent.trim()

      // 提取思路
      const thoughtsRegex = /(?:解题思路|思路|关键洞察|推理|方法)[:：]([\s\S]*?)(?:(?:代码实现|时间复杂度|复杂度分析|$))/i
      const thoughtsMatch = fullContent.match(thoughtsRegex)
      let thoughts: string[] = []

      if (thoughtsMatch && thoughtsMatch[1]) {
        const bulletPoints = thoughtsMatch[1].match(/(?:^|\n)\s*(?:[-*•]|\d+\.)\s*(.*)/g)
        if (bulletPoints) {
          thoughts = bulletPoints.map(point =>
              point.replace(/^\s*(?:[-*•]|\d+\.)\s*/, '').trim()
          ).filter(Boolean)
        } else {
          thoughts = thoughtsMatch[1].split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .filter(line => line.length > 3) // 过滤太短的行
        }
      }

      // 提取复杂度信息
      const timeComplexityPattern = /时间复杂度[:：]?\s*([^\n]+(?:\n[^\n]*详细解释[^\n]*)*?)(?=\n\s*(?:空间复杂度|$))/i
      const spaceComplexityPattern = /空间复杂度[:：]?\s*([^\n]+(?:\n[^\n]*详细解释[^\n]*)*?)(?=\n\s*(?:[A-Z]|代码要求|$))/i

      let timeComplexity = "O(n) - 线性时间复杂度"
      let spaceComplexity = "O(1) - 常数空间复杂度"

      const timeMatch = fullContent.match(timeComplexityPattern)
      if (timeMatch && timeMatch[1]) {
        timeComplexity = timeMatch[1].trim()
      }

      const spaceMatch = fullContent.match(spaceComplexityPattern)
      if (spaceMatch && spaceMatch[1]) {
        spaceComplexity = spaceMatch[1].trim()
      }

      const formattedResponse = {
        type: 'programming',
        code: code,
        thoughts: thoughts.length > 0 ? thoughts : ["基于算法分析的高效解决方案"],
        time_complexity: timeComplexity,
        space_complexity: spaceComplexity
      }

      console.log('✅ 流式编程题解析完成:', {
        codeLength: code.length,
        thoughtsCount: thoughts.length,
        hasTimeComplexity: !!timeComplexity,
        hasSpaceComplexity: !!spaceComplexity
      })

      // 🆕 AI调用成功，完成积分操作（仅在独立调用时）
      if (!parentOperationId) {
        await this.completeCreditsOperation(operationId)
        console.log('💰 编程题积分操作完成')
      } else {
        console.log('ℹ️ 跳过积分完成标记（将由父级方法处理）')
      }

      return { success: true, data: formattedResponse }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: "处理已被用户取消"
        }
      }

      console.error("AI处理错误:", error)
      return {
        success: false,
        error: error.message || "AI处理失败，请重试"
      }
    }
  }

  /**
   * 生成选择题解决方案（支持多题）
   */
  private async generateMultipleChoiceSolutions(userConfig: any, problemInfo: any, signal: AbortSignal) {
    const operationId = `mcq_${randomUUID()}`;
    let deductionInfo: {
      success: boolean;
      sufficient?: boolean;
      currentPoints?: number;
      newBalance?: number;
      requiredPoints?: number;
      message?: string
    } | null = null;
    try {
      const model = userConfig.multipleChoiceModel || userConfig.aiModel || 'claude-sonnet-4-20250514'
      deductionInfo = await this.checkAndDeductCredits(model, 'multiple_choice', operationId);

      if (!deductionInfo.success) {
        return {
          success: false,
          error: deductionInfo.message || "积分检查失败"
        }
      }

      console.log('🎯 开始生成选择题解决方案...')

      const questions = problemInfo.multiple_choice_questions || []
      console.log('📝 处理题目数量:', questions.length)

      if (questions.length === 0) {
        console.log('❌ 没有找到选择题题目')
        return {
          success: false,
          error: "没有找到选择题题目"
        }
      }

      // 构建问题文本
      const questionsText = questions.map((q: any, index: number) => `
题目${q.question_number || (index + 1)}：
${q.question_text}

选项：
${q.options.join('\n')}
`).join('\n---\n')

      const promptText = `
请分析以下选择题并给出答案：

${questionsText}

**重要要求：**
1. 必须严格按照指定格式回复
2. 答案部分必须包含所有题目的答案
3. 每个答案必须明确标注题号和选项字母

**回复格式（请严格遵循）：**

**答案：**
题目1 - A
题目2 - B
题目3 - C
(继续列出所有题目的答案...)

**解题思路：**
题目1分析：[详细分析过程]
题目2分析：[详细分析过程]
题目3分析：[详细分析过程]
(继续列出所有题目的分析...)

**整体思路：**
- 关键知识点1
- 关键知识点2
- 解题方法总结
`

      console.log('🔄 发送选择题请求到AI...')

      let solutionResponse
      try {
        solutionResponse = await this.ismaqueClient.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: "你是一位专业的选择题分析助手。仔细分析每道题目，提供准确的答案和详细的解题思路。" },
            { role: "user", content: promptText }
          ],
          max_tokens: 4000,
          temperature: 0.2
        }, { signal })

        console.log('✅ 选择题AI调用成功')
        
        // 🔧 调试：打印完整的API响应结构
        console.log('🔍 选择题API响应调试信息:')
        console.log('  - 响应类型:', typeof solutionResponse)
        console.log('  - 响应对象存在:', !!solutionResponse)
        console.log('  - choices字段存在:', !!solutionResponse?.choices)
        console.log('  - choices类型:', Array.isArray(solutionResponse?.choices) ? 'array' : typeof solutionResponse?.choices)
        console.log('  - choices长度:', solutionResponse?.choices?.length)

        // 如果响应是字符串，尝试解析为JSON
        if (typeof solutionResponse === 'string') {
          console.log('⚠️ 选择题响应是字符串格式，尝试解析JSON...')
          try {
            solutionResponse = JSON.parse(solutionResponse)
            console.log('✅ 选择题JSON解析成功')
          } catch (parseError) {
            console.error('❌ 选择题JSON解析失败:', parseError)
            if (deductionInfo.requiredPoints) {
              await this.refundCredits(operationId, deductionInfo.requiredPoints, '选择题AI响应JSON解析失败')
            }
            throw new Error('选择题AI响应格式错误：无法解析JSON响应')
          }
        }
      } catch (error) {
        console.error('❌ 选择题AI调用失败:', error)
        // AI调用失败，退还积分
        if (deductionInfo.requiredPoints) {
          await this.refundCredits(operationId, deductionInfo.requiredPoints, '选择题AI调用失败')
        }
        throw error
      }

      // 🔧 修复：安全访问API响应，防止undefined错误
      if (!solutionResponse || !solutionResponse.choices || solutionResponse.choices.length === 0) {
        console.error('❌ 选择题AI响应格式错误:', {
          hasResponse: !!solutionResponse,
          hasChoices: !!solutionResponse?.choices,
          choicesLength: solutionResponse?.choices?.length
        })
        if (deductionInfo.requiredPoints) {
          await this.refundCredits(operationId, deductionInfo.requiredPoints, '选择题AI响应格式错误')
        }
        throw new Error('选择题AI响应格式错误：缺少choices数据')
      }

      if (!solutionResponse.choices[0]?.message?.content) {
        console.error('❌ 选择题AI响应缺少内容:', solutionResponse.choices[0])
        if (deductionInfo.requiredPoints) {
          await this.refundCredits(operationId, deductionInfo.requiredPoints, '选择题AI响应缺少内容')
        }
        throw new Error('选择题AI响应格式错误：缺少message内容')
      }

      const responseContent = solutionResponse.choices[0].message.content
      console.log('✅ 选择题AI响应完成')
      console.log('='.repeat(50))

      // 解析答案
      console.log('🔍 开始解析选择题答案...')
      const answers: Array<{ question_number: string; answer: string; reasoning: string }> = []

      // 提取答案部分 - 改进的解析逻辑
      const answerMatch = responseContent.match(/答案[:：]?\s*([\s\S]*?)(?=\n\s*(?:解题思路|整体思路|$))/i)
      if (answerMatch) {
        const answerLines = answerMatch[1].split('\n').filter(line => line.trim())

        for (const line of answerLines) {
          // 支持多种答案格式的正则表达式
          const patterns = [
            /题目(\d+)\s*[-－:：]\s*([A-D])/i,
            /(\d+)\s*[-－:：]\s*([A-D])/i,
            /题(\d+)\s*[-－:：]\s*([A-D])/i,
            /第?(\d+)题?\s*[-－:：]?\s*答案?\s*[:：]?\s*([A-D])/i,
            /(\d+)\.\s*([A-D])/i
          ]

          let match = null
          for (const pattern of patterns) {
            match = line.match(pattern)
            if (match) break
          }

          if (match) {
            const questionNumber = match[1]
            const answer = match[2].toUpperCase()

            // 尝试从解题思路中提取对应的推理过程
            let reasoning = `题目${questionNumber}的解答分析`
            const reasoningPattern = new RegExp(`题目${questionNumber}[分析：:]*([^\\n]*(?:\\n(?!\\d+\\.|题目|第)[^\\n]*)*)`, 'i')
            const reasoningMatch = responseContent.match(reasoningPattern)
            if (reasoningMatch && reasoningMatch[1]) {
              reasoning = reasoningMatch[1].trim().replace(/^[：:]\s*/, '')
            }

            answers.push({
              question_number: questionNumber,
              answer: answer,
              reasoning: reasoning
            })
          }
        }
      }

      // 如果没有解析到答案，尝试备用方案：从整个响应中查找答案模式
      if (answers.length === 0) {
        console.log('⚠️ 主要解析未找到答案，尝试备用解析...')

        // 在整个响应中搜索答案模式
        const fullTextPatterns = [
          /(?:题目|第)?(\d+)(?:题)?[：:\s]*([A-D])(?:\s|$|\.)/gi,
          /(\d+)\s*[-)]\s*([A-D])/gi,
          /[（(](\d+)[）)]\s*([A-D])/gi
        ]

        for (const pattern of fullTextPatterns) {
          const matches = [...responseContent.matchAll(pattern)]
          for (const match of matches) {
            const questionNumber = match[1]
            const answer = match[2].toUpperCase()

            // 避免重复添加
            if (!answers.find(a => a.question_number === questionNumber)) {
              answers.push({
                question_number: questionNumber,
                answer: answer,
                reasoning: `从AI回复中提取的答案`
              })
            }
          }

          if (answers.length > 0) break
        }
      }

      console.log('🎯 解析到的答案数量:', answers.length)
      console.log('📋 答案详情:', answers)

      // 提取解题思路
      const thoughtsMatch = responseContent.match(/解题思路[:：]?\s*([\s\S]*?)(?=\n\s*(?:整体思路|$))/i)
      let thoughts: string[] = []

      if (thoughtsMatch && thoughtsMatch[1]) {
        thoughts = thoughtsMatch[1].split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
      }

      // 如果没有找到解题思路，尝试提取整体思路
      if (thoughts.length === 0) {
        const overallMatch = responseContent.match(/整体思路[:：]?\s*([\s\S]*?)$/i)
        if (overallMatch && overallMatch[1]) {
          thoughts = overallMatch[1].split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
        }
      }

      // 如果还是没有，使用整个响应内容
      if (thoughts.length === 0) {
        thoughts = responseContent.split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 10) // 只取前10行
      }

      const formattedResponse = {
        type: 'multiple_choice',
        answers: answers,
        thoughts: thoughts
      }

      // 🆕 AI调用成功，完成积分操作
      await this.completeCreditsOperation(operationId)
      console.log('💰 选择题积分操作完成')

      console.log('✅ 选择题解决方案生成完成')
      console.log('📊 最终响应:', JSON.stringify(formattedResponse, null, 2))

      return { success: true, data: formattedResponse }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: "处理已被用户取消"
        }
      }

      console.error("AI处理错误:", error)
      return {
        success: false,
        error: error.message || "AI处理失败，请重试"
      }
    }
  }

  /**
   * 生成多选题解决方案（使用自定义提示词）
   */
  private async generateMultipleChoiceSolutionsWithCustomPrompt(userConfig: any, problemInfo: any, signal: AbortSignal) {
    try {
      const model = userConfig.multipleChoiceModel || userConfig.aiModel || 'claude-sonnet-4-20250514'
      console.log('🎯 开始生成多选题解决方案（自定义提示词）...')

      const questions = problemInfo.multiple_choice_questions || []
      console.log('📝 处理题目数量:', questions.length)

      if (questions.length === 0) {
        console.log('❌ 没有找到选择题题目')
        return {
          success: false,
          error: "没有找到选择题题目"
        }
      }

      // 构建问题文本
      const questionsText = questions.map((q: any, index: number) => `
题目${q.question_number || (index + 1)}：
${q.question_text}

选项：
${q.options.join('\n')}
`).join('\n---\n')

      // 专门为多选题设计的提示词
      const promptText = `
你是一位专业的多选题分析专家。以下题目都是多选题，请选出所有正确答案。

${questionsText}

**关键要求：**
1. 这些题目都是多选题，每道题可能有多个正确答案
2. 必须将所有正确选项的字母连续写在一起，比如：ABC、AD、BC等
3. 不要只选择一个选项，要找出所有正确答案
4. 仔细分析每个选项的正确性，不要遗漏任何正确答案

**答案格式要求（严格按照此格式）：**
题目1 - ABC
题目2 - BD  
题目3 - ABCD
题目4 - A

**示例说明：**
- 如果题目1的A、B、C选项都正确，写成：题目1 - ABC
- 如果题目2的B、D选项正确，写成：题目2 - BD
- 如果题目3的所有选项都正确，写成：题目3 - ABCD
- 如果题目4只有A选项正确，写成：题目4 - A

现在请分析以下多选题并严格按照格式给出答案：

**答案：**
(在这里写出每道题的答案，格式：题目X - 所有正确选项字母)

**解题思路：**
(在这里写出详细的分析过程)
`

      console.log('🔄 发送多选题请求到AI...')

      let solutionResponse
      try {
        solutionResponse = await this.ismaqueClient.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: "你是一位专业的多选题分析助手。用户已确认这些都是多选题，每道题可能有多个正确答案。请严格按照要求的格式输出答案，将所有正确选项的字母连续写在一起（如ABC、BD等）。绝不能只选择一个选项，要找出所有正确答案。" },
            { role: "user", content: promptText }
          ],
          max_tokens: 4000,
          temperature: 0.1
        }, { signal })

        console.log('✅ 多选题AI调用成功')
        console.log('🔍 多选题原始响应:', JSON.stringify(solutionResponse, null, 2))
      } catch (error) {
        console.error('❌ 多选题AI调用失败:', error)
        throw error
      }

      // 🔧 修复：安全访问API响应，支持不同的响应格式
      console.log('🔍 多选题API响应调试信息:')
      console.log('  - 响应类型:', typeof solutionResponse)
      console.log('  - 响应对象存在:', !!solutionResponse)
      console.log('  - choices字段存在:', !!solutionResponse?.choices)
      console.log('  - choices类型:', Array.isArray(solutionResponse?.choices) ? 'array' : typeof solutionResponse?.choices)
      console.log('  - choices长度:', solutionResponse?.choices?.length)
      console.log('  - 完整响应结构:', Object.keys(solutionResponse || {}))

      // 如果响应是字符串，尝试解析为JSON
      if (typeof solutionResponse === 'string') {
        console.log('⚠️ 多选题响应是字符串格式，尝试解析JSON...')
        try {
          solutionResponse = JSON.parse(solutionResponse)
          console.log('✅ 多选题JSON解析成功')
        } catch (parseError) {
          console.error('❌ 多选题JSON解析失败:', parseError)
          throw new Error('多选题AI响应解析失败')
        }
      }

      // 🔧 修复：支持多种响应格式
      let responseContent = ''

      if (solutionResponse && solutionResponse.choices && solutionResponse.choices.length > 0) {
        // 标准OpenAI格式
        responseContent = solutionResponse.choices[0]?.message?.content || ''
        console.log('✅ 使用标准OpenAI响应格式')
      } else if (solutionResponse && typeof solutionResponse === 'object') {
        // 尝试其他可能的响应格式
        if (solutionResponse.content) {
          responseContent = solutionResponse.content
          console.log('✅ 使用content字段')
        } else if (solutionResponse.message) {
          responseContent = solutionResponse.message
          console.log('✅ 使用message字段')
        } else if (solutionResponse.text) {
          responseContent = solutionResponse.text
          console.log('✅ 使用text字段')
        } else if (solutionResponse.response) {
          responseContent = solutionResponse.response
          console.log('✅ 使用response字段')
        } else {
          // 如果是对象但没有找到内容字段，将整个对象转为字符串
          responseContent = JSON.stringify(solutionResponse)
          console.log('⚠️ 使用整个响应对象作为内容')
        }
      } else if (typeof solutionResponse === 'string') {
        // 直接字符串响应
        responseContent = solutionResponse
        console.log('✅ 使用字符串响应')
      }

      if (!responseContent) {
        console.error('❌ 多选题AI响应格式错误，无法提取内容:', {
          hasResponse: !!solutionResponse,
          responseType: typeof solutionResponse,
          responseKeys: Object.keys(solutionResponse || {}),
          fullResponse: solutionResponse
        })
        throw new Error('多选题AI响应格式错误：无法提取内容')
      }
      console.log('✅ 多选题AI响应完成')
      console.log('='.repeat(50))

      // 解析答案 - 支持多选题格式
      console.log('🔍 开始解析多选题答案...')
      console.log('📄 原始响应内容（用于调试）:')
      console.log('='.repeat(100))
      console.log(responseContent)
      console.log('='.repeat(100))

      const answers: Array<{ question_number: string; answer: string; reasoning: string; is_multiple: boolean }> = []

      // 提取答案部分 - 改进的解析逻辑支持多选
      const answerMatch = responseContent.match(/答案[:：]?\s*([\s\S]*?)(?=\n\s*(?:解题思路|多选题要点|整体思路|$))/i)
      console.log('🔍 答案部分匹配结果:', answerMatch ? '找到' : '未找到')

      if (answerMatch) {
        console.log('📝 提取到的答案部分:', answerMatch[1])
        const answerLines = answerMatch[1].split('\n').filter(line => line.trim())
        console.log('📋 答案行数:', answerLines.length)
        console.log('📋 答案行内容:', answerLines)

        for (const line of answerLines) {
          console.log('🔍 正在解析答案行:', line)

          // 支持多选题的正则表达式 - 扩展支持更多格式
          const patterns = [
            /题目(\d+)\s*[-－:：]\s*([A-D]+)/i,
            /(\d+)\s*[-－:：]\s*([A-D]+)/i,
            /题(\d+)\s*[-－:：]\s*([A-D]+)/i,
            /第?(\d+)题?\s*[-－:：]?\s*答案?\s*[:：]?\s*([A-D]+)/i,
            /(\d+)\.\s*([A-D]+)/i,
            // 新增更宽松的匹配模式
            /(\d+)[^\w]*([A-D]+)/i,
            /题目?\s*(\d+)[^\w]*([A-D]+)/i
          ]

          let match = null
          let matchedPattern = ''
          for (let i = 0; i < patterns.length; i++) {
            match = line.match(patterns[i])
            if (match) {
              matchedPattern = `Pattern ${i + 1}: ${patterns[i].source}`
              break
            }
          }

          if (match) {
            const questionNumber = match[1]
            const answer = match[2].toUpperCase()
            console.log(`✅ 匹配成功 - 题目${questionNumber}: ${answer} (使用${matchedPattern})`)

            // 尝试从解题思路中提取对应的推理过程
            let reasoning = `题目${questionNumber}的多选题解答分析`
            const reasoningPattern = new RegExp(`题目${questionNumber}[分析：:]*([^\\n]*(?:\\n(?!\\d+\\.|题目|第)[^\\n]*)*)`, 'i')
            const reasoningMatch = responseContent.match(reasoningPattern)
            if (reasoningMatch && reasoningMatch[1]) {
              reasoning = reasoningMatch[1].trim().replace(/^[：:]\s*/, '')
            }

            answers.push({
              question_number: questionNumber,
              answer: answer,
              reasoning: reasoning,
              is_multiple: true // 强制标记为多选题
            })
          } else {
            console.log('❌ 未匹配到答案:', line)
          }
        }
      }

      // 如果没有解析到答案，尝试备用方案
      if (answers.length === 0) {
        console.log('⚠️ 主要解析未找到答案，尝试备用解析...')

        // 在整个响应中搜索答案模式（支持多选）
        const fullTextPatterns = [
          /(?:题目|第)?(\d+)(?:题)?[：:\s]*([A-D]+)(?:\s|$|\.)/gi,
          /(\d+)\s*[-)]\s*([A-D]+)/gi,
          /[（(](\d+)[）)]\s*([A-D]+)/gi
        ]

        for (const pattern of fullTextPatterns) {
          const matches = [...responseContent.matchAll(pattern)]
          for (const match of matches) {
            const questionNumber = match[1]
            const answer = match[2].toUpperCase()

            // 避免重复添加
            if (!answers.find(a => a.question_number === questionNumber)) {
              answers.push({
                question_number: questionNumber,
                answer: answer,
                reasoning: `从AI回复中提取的多选题答案`,
                is_multiple: true
              })
            }
          }

          if (answers.length > 0) break
        }
      }

      console.log('🎯 解析到的答案数量:', answers.length)
      console.log('📋 答案详情:', answers)

      // 提取解题思路 - 重点提取对每个选项的具体分析
      let thoughts: string[] = []

      // 首先尝试提取"解题思路"部分的具体分析
      const thoughtsMatch = responseContent.match(/解题思路[:：]?\s*([\s\S]*?)(?=\n\s*(?:多选题要点|整体思路|$))/i)
      if (thoughtsMatch && thoughtsMatch[1]) {
        const thoughtsContent = thoughtsMatch[1]

        // 提取每个题目的分析
        const topicAnalyses = thoughtsContent.match(/题目\d+[分析：:]*[\s\S]*?(?=题目\d+|$)/gi)
        if (topicAnalyses && topicAnalyses.length > 0) {
          topicAnalyses.forEach(analysis => {
            // 提取选项分析
            const optionAnalyses = analysis.match(/[A-D]选项[:：][^-\n]*(?:正确|错误)[^-\n]*/gi)
            if (optionAnalyses && optionAnalyses.length > 0) {
              thoughts.push(...optionAnalyses.map(opt => opt.trim()))
            } else {
              // 如果没有找到选项分析，就提取整个题目分析
              const lines = analysis.split('\n').map(line => line.trim()).filter(Boolean)
              if (lines.length > 1) {
                thoughts.push(...lines.slice(1)) // 跳过题目标题行
              }
            }
          })
        }

        // 如果没有找到题目分析，提取所有非空行
        if (thoughts.length === 0) {
          thoughts = thoughtsContent.split('\n')
              .map(line => line.trim())
              .filter(line => line && !line.match(/^题目\d+[分析：:]*$/i))
              .filter(line => !line.match(/^[-*•]\s*认真检查|多个选项可以同时正确/i)) // 过滤掉通用提示
        }
      }

      // 如果解题思路部分没有内容，尝试从整个响应中提取选项分析
      if (thoughts.length === 0) {
        console.log('⚠️ 解题思路为空，尝试从整个响应中提取选项分析...')

        // 直接从响应中提取选项分析
        const optionAnalyses = responseContent.match(/[A-D]选项[:：][^-\n]*(?:正确|错误|因为)[^-\n]*/gi)
        if (optionAnalyses && optionAnalyses.length > 0) {
          thoughts = optionAnalyses.map(opt => opt.trim())
        }
      }

      // 如果还是没有，尝试提取包含"因为"、"由于"等解释性内容的行
      if (thoughts.length === 0) {
        console.log('⚠️ 选项分析为空，尝试提取解释性内容...')

        const explanations = responseContent.split('\n')
            .map(line => line.trim())
            .filter(line => line && (
                line.includes('因为') ||
                line.includes('由于') ||
                line.includes('所以') ||
                line.includes('正确') ||
                line.includes('错误') ||
                line.includes('提供') ||
                line.includes('确保') ||
                line.includes('机制')
            ))
            .filter(line => !line.match(/^[-*•]\s*认真检查|多个选项可以同时正确/i)) // 过滤掉通用提示

        if (explanations.length > 0) {
          thoughts = explanations.slice(0, 8) // 最多取8行解释
        }
      }

      // 最后的兜底方案：提取响应中的主要内容行
      if (thoughts.length === 0) {
        console.log('⚠️ 使用兜底方案提取思路...')
        thoughts = responseContent.split('\n')
            .map(line => line.trim())
            .filter(line => line && line.length > 10) // 过滤掉太短的行
            .filter(line => !line.match(/^(答案|解题思路|多选题要点)[:：]?$/i)) // 过滤掉标题行
            .filter(line => !line.match(/^题目\d+\s*[-－:：]\s*[A-D]+$/i)) // 过滤掉纯答案行
            .filter(line => !line.match(/^[-*•]\s*认真检查|多个选项可以同时正确/i)) // 过滤掉通用提示
            .slice(0, 6) // 最多取6行
      }

      console.log('📝 提取到的解题思路数量:', thoughts.length)
      console.log('📝 解题思路内容:', thoughts)

      const formattedResponse = {
        type: 'multiple_choice',
        answers: answers,
        thoughts: thoughts,
        is_multiple_choice_mode: true // 标识这是多选题模式
      }

      console.log('✅ 多选题解决方案生成完成')
      console.log('📊 最终响应:', JSON.stringify(formattedResponse, null, 2))

      return { success: true, data: formattedResponse }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: "多选题处理已被用户取消"
        }
      }

      console.error("多选题AI处理错误:", error)
      return {
        success: false,
        error: error.message || "多选题AI处理失败，请重试"
      }
    }
  }

  /**
   * 处理额外队列截图（调试功能）
   */
  private async processExtraQueue(userConfig: any, language: string): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    console.log('🔧 开始处理调试截图...')

    const extraScreenshotQueue = this.screenshotHelper.getExtraScreenshotQueue()

    if (!extraScreenshotQueue || extraScreenshotQueue.length === 0) {
      console.log("❌ 额外队列中没有截图")
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
      return
    }

    const existingExtraScreenshots = extraScreenshotQueue.filter(path => fs.existsSync(path))
    if (existingExtraScreenshots.length === 0) {
      console.log("❌ 额外截图文件不存在")
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
      return
    }

    mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START)

    // 初始化AbortController
    this.currentExtraProcessingAbortController = new AbortController()
    const { signal } = this.currentExtraProcessingAbortController

    try {
      // 获取所有截图（主要和额外的）
      const allPaths = [
        ...this.screenshotHelper.getScreenshotQueue(),
        ...existingExtraScreenshots
      ]

      const screenshots = await Promise.all(
          allPaths.map(async (path) => {
            try {
              if (!fs.existsSync(path)) {
                console.warn(`截图文件不存在: ${path}`)
                return null
              }

              return {
                path,
                preview: await this.screenshotHelper.getImagePreview(path),
                data: fs.readFileSync(path).toString('base64')
              }
            } catch (err) {
              console.error(`读取截图错误 ${path}:`, err)
              return null
            }
          })
      )

      const validScreenshots = screenshots.filter(Boolean)

      if (validScreenshots.length === 0) {
        throw new Error("加载调试截图数据失败")
      }

      console.log("🔧 合并截图进行调试处理:", validScreenshots.map((s) => s.path))

      const result = await this.processExtraScreenshotsWithAI(
          validScreenshots,
          userConfig,
          language,
          signal
      )

      if (result.success) {
        this.deps.setHasDebugged(true)
        mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS,
            result.data
        )
      } else {
        mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            result.error
        )
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            "调试处理已被用户取消"
        )
      } else {
        mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            error.message
        )
      }
    } finally {
      this.currentExtraProcessingAbortController = null
    }
  }

  /**
   * 使用AI处理额外截图（调试功能）
   */
  private async processExtraScreenshotsWithAI(
      screenshots: Array<{ path: string; data: string }>,
      userConfig: any,
      language: string,
      signal: AbortSignal
  ) {
    try {
      const problemInfo = this.deps.getProblemInfo()
      const mainWindow = this.deps.getMainWindow()

      if (!problemInfo) {
        throw new Error("没有可用的题目信息")
      }

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "正在处理调试截图...",
          progress: 30
        })
      }

      const imageDataList = screenshots.map(screenshot => screenshot.data)

      if (!(await this.ensureAIClient())) {
        return {
          success: false,
          error: "AI客户端初始化失败，无法处理调试截图"
        }
      }

      // 使用用户配置的编程模型进行调试截图处理
      const debuggingModel = userConfig.programmingModel || userConfig.aiModel || 'claude-sonnet-4-20250514'
      console.log('🔍 使用用户配置的模型进行调试截图处理:', debuggingModel)

      const messages = [
        {
          role: "system" as const,
          content: `你是一位编程面试助手，帮助调试和改进解决方案。分析这些包含错误信息、错误输出或测试用例的截图，并提供详细的调试帮助。

请按照以下格式提供回复：
1. 代码：修正后的完整ACM竞赛模式的${language}实现
2. 解题思路：关键修改和改进的要点列表
3. 时间复杂度：O(X)格式，并提供详细解释（至少2句话）
4. 空间复杂度：O(X)格式，并提供详细解释（至少2句话）
5. 修改说明：详细说明相比原代码进行了哪些修改和为什么需要这些修改`
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: `我正在解决这个编程题目："${problemInfo.problem_statement}"，使用${language}语言。

题目约束：
${problemInfo.constraints || "未提供具体约束条件。"}

示例输入：
${problemInfo.example_input || "未提供示例输入。"}

示例输出：
${problemInfo.example_output || "未提供示例输出。"}

我需要调试或改进我的解决方案的帮助。这里是我的代码、错误或测试用例的截图。请提供详细分析。`
            },
            ...imageDataList.map(data => ({
              type: "image_url" as const,
              image_url: { url: `data:image/png;base64,${data}` }
            }))
          ]
        }
      ]

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "正在分析代码并生成调试反馈...",
          progress: 60
        })
      }

      let debugResponse = await this.ismaqueClient.chat.completions.create({
        model: debuggingModel,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.2
      }, { signal })

      console.log('🔍 调试AI响应调试信息:')
      console.log('  - 响应类型:', typeof debugResponse)
      console.log('  - 响应对象存在:', !!debugResponse)
      console.log('  - choices字段存在:', !!debugResponse?.choices)
      console.log('  - choices类型:', Array.isArray(debugResponse?.choices) ? 'array' : typeof debugResponse?.choices)
      console.log('  - choices长度:', debugResponse?.choices?.length)

      // 如果响应是字符串，尝试解析为JSON
      if (typeof debugResponse === 'string') {
        console.log('⚠️ 调试响应是字符串格式，尝试解析JSON...')
        try {
          debugResponse = JSON.parse(debugResponse)
          console.log('✅ 调试JSON解析成功')
        } catch (parseError) {
          console.error('❌ 调试JSON解析失败:', parseError)
          throw new Error('调试AI响应格式错误：无法解析JSON响应')
        }
      }

      // 安全访问API响应，防止undefined错误
      if (!debugResponse || !debugResponse.choices || debugResponse.choices.length === 0) {
        console.error('❌ 调试AI响应格式错误:', {
          hasResponse: !!debugResponse,
          hasChoices: !!debugResponse?.choices,
          choicesLength: debugResponse?.choices?.length
        })
        throw new Error('调试AI响应格式错误：缺少choices数据')
      }

      if (!debugResponse.choices[0]?.message?.content) {
        console.error('❌ 调试AI响应缺少内容:', debugResponse.choices[0])
        throw new Error('调试AI响应格式错误：缺少message内容')
      }

      const debugContent = debugResponse.choices[0].message.content

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "调试分析完成",
          progress: 100
        })
      }

      // 解析调试响应（与生成解决方案类似的逻辑）
      const codeMatch = debugContent.match(/```(?:\w+)?\s*([\s\S]*?)```/)
      const code = codeMatch ? codeMatch[1].trim() : debugContent

      // 提取思路
      const thoughtsRegex = /(?:解题思路|思路|关键洞察|推理|方法|修改|改进)[:：]([\s\S]*?)(?:时间复杂度|$)/i
      const thoughtsMatch = debugContent.match(thoughtsRegex)
      let thoughts: string[] = []

      if (thoughtsMatch && thoughtsMatch[1]) {
        const bulletPoints = thoughtsMatch[1].match(/(?:^|\n)\s*(?:[-*•]|\d+\.)\s*(.*)/g)
        if (bulletPoints) {
          thoughts = bulletPoints.map(point =>
              point.replace(/^\s*(?:[-*•]|\d+\.)\s*/, '').trim()
          ).filter(Boolean)
        } else {
          thoughts = thoughtsMatch[1].split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
        }
      }

      // 提取复杂度信息
      const timeComplexityPattern = /时间复杂度[:：]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:空间复杂度|$))/i
      const spaceComplexityPattern = /空间复杂度[:：]?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:[A-Z]|$))/i

      let timeComplexity = "O(n) - 线性时间复杂度"
      let spaceComplexity = "O(n) - 线性空间复杂度"

      const timeMatch = debugContent.match(timeComplexityPattern)
      if (timeMatch && timeMatch[1]) {
        timeComplexity = timeMatch[1].trim()
      }

      const spaceMatch = debugContent.match(spaceComplexityPattern)
      if (spaceMatch && spaceMatch[1]) {
        spaceComplexity = spaceMatch[1].trim()
      }

      // 提取修改说明
      const modificationPattern = /(?:修改说明|修改|改进说明|变更)[:：]?([\s\S]*?)(?=\n\s*$|$)/i
      const modificationMatch = debugContent.match(modificationPattern)
      let modifications = "基于截图分析的代码修改和优化"
      if (modificationMatch && modificationMatch[1]) {
        modifications = modificationMatch[1].trim()
      }

      const response = {
        type: 'programming',
        code: code,
        thoughts: thoughts.length > 0 ? thoughts : ["基于效率和可读性的解决方案方法"],
        time_complexity: timeComplexity,
        space_complexity: spaceComplexity,
        modifications: modifications
      }

      return { success: true, data: response }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: "调试处理已被用户取消"
        }
      }

      console.error("调试处理错误:", error)
      return { success: false, error: error.message || "处理调试请求失败" }
    }
  }

  /**
   * 检查是否是认证错误
   */
  private isAuthError(error: string): boolean {
    const authErrorKeywords = ['401', 'unauthorized', 'invalid token', 'authentication failed', '认证失败', '登录失败']
    return authErrorKeywords.some(keyword => error.toLowerCase().includes(keyword.toLowerCase()))
  }

  /**
   * 识别题目类型（编程题 vs 选择题）
   */
  private async identifyQuestionType(
      imageDataList: string[],
      userConfig: any,
      signal: AbortSignal
  ): Promise<'programming' | 'multiple_choice'> {
    try {
      if (!(await this.ensureAIClient())) {
        throw new Error("AI客户端初始化失败，无法识别题目类型")
      }

      // 固定使用 gemini-2.5-flash-preview-04-17 进行截图识别
      const model = 'gemini-2.5-flash-preview-04-17'
      console.log('🔍 使用固定模型进行截图识别:', model)

      const messages = [
        {
          role: "system" as const,
          content: `分析图片中的题目类型。

**如果看到这些特征就是选择题（回答：multiple_choice）：**
- 有 A、B、C、D 选项标记
- 有 A.、B.、C.、D. 选项标记  
- 看到"下列"、"以下哪个"、"关于...说法"等表述
- 有多个选择选项排列

**如果看到这些特征就是编程题（回答：programming）：**
- 有"输入格式"、"输出格式"字样
- 有具体的输入输出示例
- 要求写代码或算法

**重要：只回答一个词 multiple_choice 或 programming，不要其他任何内容**`
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: "看图片，有A、B、C、D选项就回答multiple_choice，有输入输出格式就回答programming"
            },
            ...imageDataList.map(data => ({
              type: "image_url" as const,
              image_url: { url: `data:image/png;base64,${data}` }
            }))
          ]
        }
      ]

      const response = await this.ismaqueClient.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 20,  // 增加token数量，确保完整回复
        temperature: 0.0
      }, { signal })

      const result = response.choices[0].message.content?.trim().toLowerCase() || ''
      console.log('🔍 题目类型识别结果:', `"${result}"`)
      console.log('🔍 识别结果长度:', result.length)

      // 更精确的判断逻辑 - 增加更多判断条件
      if (result.includes('multiple_choice') || result.includes('选择题') || result.includes('choice')) {
        console.log('✅ 识别为选择题')
        return 'multiple_choice'
      } else if (result.includes('programming') || result.includes('编程题') || result.includes('program')) {
        console.log('✅ 识别为编程题')
        return 'programming'
      } else if (result === '') {
        console.log('⚠️ 识别结果为空，分析截图内容特征进行判断')
        // 如果AI返回为空，根据截图数量等特征进行简单判断
        // 选择题截图通常较少且内容相对简单
        return 'multiple_choice'  // 暂时改为默认选择题，便于测试
      } else {
        console.log('⚠️ 识别结果不明确，使用备用逻辑')
        console.log('⚠️ 原始结果内容:', JSON.stringify(result))
        return 'programming'  // 保持编程题作为最终兜底
      }

    } catch (error) {
      console.warn("题目类型识别失败，默认为编程题:", error)
      return 'programming'  // 默认情况
    }
  }

  /**
   * 根据题目类型提取题目信息
   */
  private async extractProblemInfo(
      imageDataList: string[],
      questionType: 'programming' | 'multiple_choice',
      userConfig: any,
      language: string,
      signal: AbortSignal
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!(await this.ensureAIClient())) {
        return {
          success: false,
          error: "AI客户端初始化失败，无法提取题目信息"
        }
      }

      // 固定使用 gemini-2.5-flash-preview-04-17 进行截图识别和题目信息提取
      const model = 'gemini-2.5-flash-preview-04-17'
      console.log(`🔍 使用固定模型提取${questionType === 'programming' ? '编程题' : '选择题'}信息:`, model)

      if (questionType === 'programming') {
        return await this.extractProgrammingProblem(imageDataList, model, language, signal)
      } else {
        return await this.extractMultipleChoiceProblems(imageDataList, model, signal)
      }

    } catch (error) {
      return {
        success: false,
        error: `提取题目信息失败：${error.message}`
      }
    }
  }

  /**
   * 提取编程题信息
   */
  private async extractProgrammingProblem(
      imageDataList: string[],
      model: string,
      language: string,
      signal: AbortSignal
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const messages = [
        {
          role: "system" as const,
          content: `你是一个专业的编程题目分析专家。请仔细阅读截图中的每一个字，准确提取编程题目的完整信息。

**核心要求：**
1. 必须逐字逐句地仔细阅读截图中的所有文字内容
2. 题目描述必须完整准确，不能遗漏任何重要信息
3. 必须严格按照截图中的原文提取，不要自己编造或修改
4. 如果截图模糊或文字不清楚，请在相应字段中说明"截图不清楚，无法准确识别"

**提取字段说明：**
- problem_statement: 完整的题目描述，包括问题背景、要求解决的问题等
- constraints: 所有约束条件，包括数据范围、时间限制、空间限制等
- example_input: 示例输入的具体内容
- example_output: 示例输出的具体内容

**质量要求：**
1. 题目描述必须包含足够的信息让程序员理解要解决什么问题
2. 约束条件必须包含所有数据范围和限制
3. 示例必须与题目描述完全对应
4. 不要添加任何截图中没有的信息

**输出格式：**
必须只返回纯JSON格式，不要任何额外文字或markdown标记：
{"type":"programming","problem_statement":"完整准确的题目描述","constraints":"完整的约束条件","example_input":"示例输入","example_output":"示例输出"}`
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: `请仔细分析这些编程题目截图，准确提取以下信息：

1. 完整的题目描述（不要遗漏任何细节）
2. 所有约束条件和数据范围
3. 完整的示例输入和输出

**重要提醒：**
- 必须逐字阅读截图内容，确保提取的题目描述完整且准确
- 不要根据常见算法题自行补充内容
- 严格按照截图中的原文提取，保持题目的原始表述
- 如果截图中有多个部分，请确保都被正确识别和提取

目标编程语言：${language}
请以纯JSON格式返回结果，不要任何其他文本。`
            },
            ...imageDataList.map(data => ({
              type: "image_url" as const,
              image_url: { url: `data:image/png;base64,${data}` }
            }))
          ]
        }
      ]

      const response = await this.ismaqueClient.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 6000,
        temperature: 0.0
      }, { signal })

      const responseText = response.choices[0].message.content
      // AI响应处理

      let jsonText = responseText.trim()
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

      const jsonStart = jsonText.indexOf('{')
      const jsonEnd = jsonText.lastIndexOf('}')

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonText = jsonText.substring(jsonStart, jsonEnd + 1)
      }

      const problemInfo = JSON.parse(jsonText)

      return {
        success: true,
        data: {
          type: 'programming',
          problem_statement: problemInfo.problem_statement || "无法从截图中提取题目描述",
          constraints: problemInfo.constraints || "无法从截图中提取约束条件",
          example_input: problemInfo.example_input || "无法从截图中提取示例输入",
          example_output: problemInfo.example_output || "无法从截图中提取示例输出"
        }
      }

    } catch (error) {
      console.error("解析编程题AI响应失败:", error)
      return {
        success: false,
        error: `解析编程题信息失败：${error.message}`
      }
    }
  }

  /**
   * 提取选择题信息（支持多题）
   */
  private async extractMultipleChoiceProblems(
      imageDataList: string[],
      model: string,
      signal: AbortSignal
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const messages = [
        {
          role: "system" as const,
          content: `你是一个选择题识别专家。请分析截图中的所有选择题，提取完整信息。

**重要要求：**
1. 必须只返回纯JSON格式，不要任何额外的文字、解释或markdown标记
2. JSON必须包含：type, problem_statement, multiple_choice_questions
3. type 必须设为 "multiple_choice"
4. multiple_choice_questions 是数组，包含所有识别到的选择题
5. 每个选择题包含：question_number, question_text, options
6. question_number 是题号（如"1", "2", "A", "B"等）
7. options 是选项数组（如["A. 选项A", "B. 选项B", ...]）
8. 确保返回的是有效的JSON格式

**示例输出格式：**
{
  "type": "multiple_choice",
  "problem_statement": "选择题集合",
  "multiple_choice_questions": [
    {
      "question_number": "1",
      "question_text": "第一题的题目内容",
      "options": ["A. 选项A", "B. 选项B", "C. 选项C", "D. 选项D"]
    },
    {
      "question_number": "2", 
      "question_text": "第二题的题目内容",
      "options": ["A. 选项A", "B. 选项B", "C. 选项C", "D. 选项D"]
    }
  ]
}`
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: "请识别这些截图中的所有选择题，按题号顺序提取题目和选项信息，以严格的JSON格式返回。请确保识别出所有完整的题目。"
            },
            ...imageDataList.map(data => ({
              type: "image_url" as const,
              image_url: { url: `data:image/png;base64,${data}` }
            }))
          ]
        }
      ]

      const response = await this.ismaqueClient.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 6000,
        temperature: 0.1
      }, { signal })

      const responseText = response.choices[0].message.content
      // AI响应处理

      let jsonText = responseText.trim()
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

      const jsonStart = jsonText.indexOf('{')
      const jsonEnd = jsonText.lastIndexOf('}')

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonText = jsonText.substring(jsonStart, jsonEnd + 1)
      }

      const problemInfo = JSON.parse(jsonText)

      return {
        success: true,
        data: {
          type: 'multiple_choice',
          problem_statement: problemInfo.problem_statement || "选择题集合",
          multiple_choice_questions: problemInfo.multiple_choice_questions || []
        }
      }

    } catch (error) {
      console.error("解析选择题AI响应失败:", error)
      return {
        success: false,
        error: `解析选择题信息失败：${error.message}`
      }
    }
  }

  /**
   * 取消所有进行中的请求
   */
  public cancelOngoingRequests(): void {
    let wasCancelled = false

    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
      wasCancelled = true
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
      wasCancelled = true
    }

    this.deps.setHasDebugged(false)
    this.deps.setProblemInfo(null)

    const mainWindow = this.deps.getMainWindow()
    if (wasCancelled && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
    }
  }

  // 🆕 积分管理辅助方法

  /**
   * 检查积分是否足够
   */
  private async checkCredits(modelName: string, questionType: 'programming' | 'multiple_choice'): Promise<{
    sufficient: boolean;
    currentCredits: number;
    requiredCredits: number;
    error?: string;
  }> {
    try {
      const mainWindow = this.deps.getMainWindow()
      if (!mainWindow) {
        return { sufficient: false, currentCredits: 0, requiredCredits: 0, error: '主窗口不可用' }
      }

      const result = await mainWindow.webContents.executeJavaScript(`
        window.electronAPI.creditsCheck({ modelName: '${modelName}', questionType: '${questionType}' })
      `)

      if (result.success) {
        return {
          sufficient: result.sufficient,
          currentCredits: result.currentCredits,
          requiredCredits: result.requiredCredits
        }
      } else {
        return { sufficient: false, currentCredits: 0, requiredCredits: 0, error: result.error }
      }
    } catch (error) {
      console.error('检查积分失败:', error)
      return { sufficient: false, currentCredits: 0, requiredCredits: 0, error: error.message }
    }
  }

  /**
   * 扣除积分
   */
  private async deductCredits(modelName: string, questionType: 'programming' | 'multiple_choice'): Promise<{
    success: boolean;
    operationId?: string;
    deductedAmount?: number;
    error?: string;
  }> {
    try {
      const mainWindow = this.deps.getMainWindow()
      if (!mainWindow) {
        return { success: false, error: '主窗口不可用' }
      }

      const operationId = `ai_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const result = await mainWindow.webContents.executeJavaScript(`
        window.electronAPI.creditsDeduct({ 
          modelName: '${modelName}', 
          questionType: '${questionType}',
          operationId: '${operationId}'
        })
      `)

      if (result.success) {
        // 记录待处理的积分操作，以便失败时退款
        this.pendingCreditOperations.set(operationId, {
          modelName,
          questionType,
          amount: result.deductedAmount,
          transactionId: result.transactionId
        })

        return {
          success: true,
          operationId: result.operationId,
          deductedAmount: result.deductedAmount
        }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('扣除积分失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 退还积分（AI调用失败时）
   */
  private async refundCredits(operationId: string, amount: number, reason: string) {
    const token = simpleAuthManager.getToken();
    if (!token) return; // 如果没有token，无法退款
    const BASE_URL = 'http://159.75.174.234:3004';
    await fetch(`${BASE_URL}/api/client/credits/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': token },
      body: JSON.stringify({ operationId, amount, reason }),
    });
  }

  /**
   * 完成积分操作（AI调用成功时）
   */
  private async completeCreditsOperation(operationId: string): Promise<void> {
    try {
      console.log('🎯 完成积分操作:', operationId)
      console.log('📋 当前pendingCreditOperations大小:', this.pendingCreditOperations.size)
      console.log('📋 当前pendingCreditOperations keys:', Array.from(this.pendingCreditOperations.keys()))
      
      // 从待处理操作中获取交易ID
      const operation = this.pendingCreditOperations.get(operationId)
      console.log('🔍 找到的操作记录:', operation)
      
      if (!operation?.transactionId) {
        console.warn('⚠️ 未找到操作记录或交易ID:', operationId)
        console.warn('⚠️ 完整操作列表keys:', Array.from(this.pendingCreditOperations.keys()))
        console.warn('⚠️ 操作记录详情:', operation)
        return
      }

      const sessionId = simpleAuthManager.getToken()
      if (!sessionId) {
        console.error('❌ 无法获取会话ID，无法更新操作结束时间')
        return
      }

      console.log('🔄 更新结束时间，交易ID:', operation.transactionId)

      const BASE_URL = 'http://159.75.174.234:3004'
      const response = await fetch(`${BASE_URL}/api/client/credits/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        body: JSON.stringify({ transactionId: operation.transactionId })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ 更新操作结束时间失败:', response.status, errorText)
        return
      }

      const result = await response.json()
      console.log('✅ 结束时间更新成功')

    } catch (error) {
      console.error('❌ 更新操作结束时间时发生错误:', error)
    } finally {
      // 移除待处理的操作记录，表示操作处理完成（无论成功与否）
      this.pendingCreditOperations.delete(operationId)
      console.log('✅ 积分操作处理完成')
    }
  }

  /**
   * 🆕 获取用户积分余额(带缓存)
   */
  private async getUserCredits(forceRefresh = false): Promise<number | null> {
    // 如果有缓存且未过期，直接返回缓存数据
    const now = Date.now()
    if (!forceRefresh && this.userCredits !== null && (now - this.lastCreditsFetchTime) < this.CREDITS_CACHE_TTL) {
      return this.userCredits
    }

    try {
      const token = simpleAuthManager.getToken()
      if (!token) return null

      const BASE_URL = 'http://159.75.174.234:3004'
      const response = await fetch(`${BASE_URL}/api/client/credits`, {
        method: 'GET',
        headers: {
          'X-Session-Id': token,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        // 更新缓存
        this.userCredits = data.credits
        this.lastCreditsFetchTime = now
        return data.credits
      }
      return null
    } catch (error) {
      console.error('获取积分失败:', error)
      return null
    }
  }

  /**
   * 🆕 检查并扣除积分（使用合并API，一次网络请求完成）
   */
  private async checkAndDeductCredits(
      modelName: string,
      questionType: 'multiple_choice' | 'programming',
      operationId: string
  ): Promise<{
    success: boolean;
    sufficient?: boolean;
    currentPoints?: number;
    newBalance?: number;
    requiredPoints?: number;
    transactionId?: number;
    message?: string
  }> {
    try {
      const token = simpleAuthManager.getToken()
      if (!token) {
        return { success: false, message: '未登录，无法获取积分' }
      }

      console.time('credits-check-and-deduct-api')
      const BASE_URL = 'http://159.75.174.234:3004'
      const url = `${BASE_URL}/api/client/credits/check-and-deduct`
      const requestBody = {
        modelName,
        questionType,
        operationId
      }
      
      console.log('🔗 调用积分API:', url)
      console.log('📤 请求体:', requestBody)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Session-Id': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      console.timeEnd('credits-check-and-deduct-api')

      console.log('📥 响应状态:', response.status, response.statusText)
      const data = await response.json()
      console.log('📥 原始响应数据:', data)

      // 更新本地缓存
      if (data.success && data.newBalance !== undefined) {
        this.userCredits = data.newBalance
        this.lastCreditsFetchTime = Date.now()
      }

      // 如果扣除成功且有transactionId，存储操作记录
      if (data.success && data.transactionId) {
        this.pendingCreditOperations.set(operationId, {
          modelName,
          questionType,
          amount: data.deductedAmount || 0,
          transactionId: data.transactionId
        });
        console.log('💰 保存transactionId:', data.transactionId, '到操作:', operationId);
      }

      return {
        success: data.success,
        sufficient: data.sufficient,
        currentPoints: data.currentPoints,
        newBalance: data.newBalance,
        requiredPoints: data.requiredPoints,
        transactionId: data.transactionId,
        message: data.message
      }
    } catch (error) {
      console.error('检查并扣除积分失败:', error)
      return { success: false, message: '检查并扣除积分失败' }
    }
  }

  /**
   * 处理选择题搜索
   */
  public async processMultipleChoiceSearch(window: BrowserWindow, params: {
    screenshot_path: string
    image_data_url: string
    language: string
  }) {
    try {
      if (!await simpleAuthManager.isAuthenticated()) {
        window.webContents.send('multiple-choice-search-error', { error: '请先登录' })
        return
      }

      // 图片存在性检查
      if (!fs.existsSync(params.screenshot_path)) {
        window.webContents.send('multiple-choice-search-error', { error: '截图文件不存在' })
        return
      }

      const operationId = randomUUID()
      window.webContents.send('processing-start', { type: 'multiple_choice' })
      this.currentProcessingAbortController = new AbortController()

      // 模型名称 - 使用默认值
      const modelName = 'gpt-4o'

      // 🆕 使用合并的API进行积分检查和扣除
      const creditResult = await this.checkAndDeductCredits(
          modelName,
          'multiple_choice',
          operationId
      )

      if (!creditResult.success || !creditResult.sufficient) {
        window.webContents.send('multiple-choice-search-error', {
          error: creditResult.message || '积分检查失败',
          credits: creditResult.currentPoints || 0,
          requiredCredits: creditResult.requiredPoints || 0
        })
        return
      }

      // 积分检查通过，继续处理
      window.webContents.send('processing-credits-check-passed', {
        credits: creditResult.newBalance || 0
      })

      // 调用多选题AI处理，传递operationId
      await this.processScreenshotsAsMultipleChoice(operationId)
    } catch (error) {
      console.error("选择题搜索处理错误:", error)
      window.webContents.send('multiple-choice-search-error', { error: '处理失败:' + error.message })
    }
  }

  /**
   * 处理编程题搜索
   */
  public async processProgrammingSearch(window: BrowserWindow, params: {
    screenshot_path: string
    image_data_url: string
    language: string
  }) {
    try {
      if (!await simpleAuthManager.isAuthenticated()) {
        window.webContents.send('programming-search-error', { error: '请先登录' })
        return
      }

      // 图片存在性检查
      if (!fs.existsSync(params.screenshot_path)) {
        window.webContents.send('programming-search-error', { error: '截图文件不存在' })
        return
      }

      const operationId = randomUUID()
      window.webContents.send('processing-start', { type: 'programming' })
      this.currentProcessingAbortController = new AbortController()

      // 模型名称 - 使用默认值
      const modelName = 'gpt-4o'

      // 🆕 使用合并的API进行积分检查和扣除
      const creditResult = await this.checkAndDeductCredits(
          modelName,
          'programming',
          operationId
      )

      if (!creditResult.success || !creditResult.sufficient) {
        window.webContents.send('programming-search-error', {
          error: creditResult.message || '积分检查失败',
          credits: creditResult.currentPoints || 0,
          requiredCredits: creditResult.requiredPoints || 0
        })
        return
      }

      // 积分检查通过，继续处理
      window.webContents.send('processing-credits-check-passed', {
        credits: creditResult.newBalance || 0
      })

      // ... [现有的处理逻辑]
    } catch (error) {
      console.error("编程题搜索处理错误:", error)
      window.webContents.send('programming-search-error', { error: '处理失败:' + error.message })
    }
  }
} 