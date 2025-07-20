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

// 统一的API密钥 - 用户无需配置
const ISMAQUE_API_KEY = "sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP"

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

  // 积分管理相关
  private pendingCreditOperations: Map<string, { modelName: string; questionType: string; amount: number }> = new Map()
  
  // 🆕 积分缓存
  private userCredits: number | null = null
  private lastCreditsFetchTime: number = 0
  private CREDITS_CACHE_TTL = 60000 // 1分钟缓存时间
  private creditModelsCache: Map<string, number> = new Map() // 缓存模型积分配置

  constructor(deps: IProcessingHelperDeps) {
    this.deps = deps
    this.screenshotHelper = deps.getScreenshotHelper()
    
    // Initialize AI client
    this.initializeAIClient()
  }

  /**
   * 初始化AI客户端
   */
  private initializeAIClient(): void {
    try {
      this.ismaqueClient = new OpenAI({
        apiKey: ISMAQUE_API_KEY,
        baseURL: 'https://api.ismaque.com/api/v1'
      })
      console.log('✅ AI客户端初始化成功')
    } catch (error) {
      console.error('❌ AI客户端初始化失败:', error)
      this.ismaqueClient = null
    }
  }

  /**
   * 处理屏幕截图队列
   */
  public async processScreenshots(): Promise<void> {
    try {
      const mainWindow = this.deps.getMainWindow()
      if (!mainWindow) return

      // 检查认证状态
      const isLoggedIn = await simpleAuthManager.isAuthenticated()
      if (!isLoggedIn) {
        await this.showLoginDialog()
        return
      }

      // 等待初始化完成
      await this.waitForInitialization(mainWindow)

      // 加载用户配置
      const userConfig = await configHelper.getUserConfig()
      
      // 获取客户端语言
      const language = await this.getClientLanguage()
      
      // 处理主队列
      await this.processMainQueue(userConfig, language)
      
      // 处理额外队列
      await this.processExtraQueue(userConfig, language)
    } catch (error) {
      console.error('处理屏幕截图队列时出错:', error)
    }
  }

  // ... [其他辅助方法]

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

      const BASE_URL = configHelper.getBackendURL() || 'http://localhost:3001'
      const response = await fetch(`${BASE_URL}/api/client/credits/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Session-Id': token
        }
      })

      const data = await response.json()
      
      if (data.success) {
        // 更新缓存
        this.userCredits = data.points
        this.lastCreditsFetchTime = now
        return data.points
      }
      return null
    } catch (error) {
      console.error('获取积分失败:', error)
      return null
    }
  }

  /**
   * 积分检查和扣除的逻辑 - 优化版，使用合并API
   */
  private async checkAndDeductCredits(model: string, type: 'programming' | 'multiple_choice', operationId: string): Promise<{
    success: boolean;
    requiredCredits?: number;
    newCredits?: number;
    error?: string;
  }> {
    try {
      // 1. 获取认证令牌
      const token = simpleAuthManager.getToken()
      if (!token) {
        return { 
          success: false,
          error: 'User not authenticated for credits check' 
        };
      }

      // 2. 确定基础URL
      const BASE_URL = configHelper.getBackendURL() || 'http://localhost:3001'
      console.log(`🔍 积分检查和扣除: ${model}, ${type}, ${operationId}`);
      console.time('credits-check-and-deduct-api')

      // 3. 调用合并的API端点 - 一次请求完成检查和扣除
      const response = await fetch(`${BASE_URL}/api/client/credits/check-and-deduct`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Session-Id': token,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          modelName: model, 
          questionType: type, 
          operationId 
        })
      })
      console.timeEnd('credits-check-and-deduct-api')
      
      const result = await response.json()
      console.log('💰 积分检查和扣除结果:', result);

      // 4. 处理响应
      if (!response.ok || !result.success) {
        return { 
          success: false, 
          error: result.message || '积分检查和扣除失败' 
        };
      }
      
      // 5. 更新积分缓存
      if (result.newBalance !== undefined) {
        this.userCredits = result.newBalance
        this.lastCreditsFetchTime = Date.now()
      }
      
      // 6. 记录待处理的积分操作，以便失败时退款
      if (result.deductedAmount) {
        this.pendingCreditOperations.set(operationId, {
          modelName: model,
          questionType: type,
          amount: result.deductedAmount
        });
      }
      
      // 7. 返回处理结果
      return { 
        success: true, 
        requiredCredits: result.deductedAmount,
        newCredits: result.newBalance
      };
    } catch (error) {
      console.error('积分检查和扣除失败:', error);
      return {
        success: false,
        error: error.message || '积分系统连接失败'
      };
    }
  }

  /**
   * 退还积分（AI调用失败时）
   */
  private async refundCredits(operationId: string, amount: number, reason: string) {
    const token = simpleAuthManager.getToken();
    if (!token) return; // 如果没有token，无法退款
    const BASE_URL = configHelper.getBackendURL() || 'http://localhost:3001';
    await fetch(`${BASE_URL}/api/client/credits/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': token },
        body: JSON.stringify({ operationId, amount, reason }),
    });
    
    // 更新缓存 - 强制刷新
    await this.getUserCredits(true);
  }

  /**
   * 完成积分操作（AI调用成功时）
   */
  private async completeCreditsOperation(operationId: string): Promise<void> {
    // 移除待处理的操作记录，表示操作成功完成
    this.pendingCreditOperations.delete(operationId)
    console.log('✅ 积分操作完成:', operationId)
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
      
      // 模型名称
      const modelConfig = await configHelper.getUserAIConfig()
      const modelName = modelConfig?.multipleChoiceModel || 'gpt-4o'
      
      // 使用合并的API进行积分检查和扣除
      const creditResult = await this.checkAndDeductCredits(
        modelName,
        'multiple_choice',
        operationId
      )

      if (!creditResult.success) {
        window.webContents.send('multiple-choice-search-error', { 
          error: creditResult.error || '积分检查失败',
          credits: 0,
          requiredCredits: creditResult.requiredCredits || 0
        })
        return
      }

      // 积分检查通过，继续处理
      window.webContents.send('processing-credits-check-passed', { 
        credits: creditResult.newCredits || 0
      })

      // ... [现有的处理逻辑]
      window.webContents.send('processing-status', { 
        message: '选择题处理中...',
        progress: 30
      })

      // 模拟处理成功
      setTimeout(() => {
        window.webContents.send('multiple-choice-search-result', { 
          success: true,
          result: '选择题已处理完成'
        })
        this.completeCreditsOperation(operationId)
      }, 2000)

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
      
      // 模型名称
      const modelConfig = await configHelper.getUserAIConfig()
      const modelName = modelConfig?.programmingModel || 'gpt-4o'
      
      // 使用合并的API进行积分检查和扣除
      const creditResult = await this.checkAndDeductCredits(
        modelName,
        'programming',
        operationId
      )

      if (!creditResult.success) {
        window.webContents.send('programming-search-error', { 
          error: creditResult.error || '积分检查失败',
          credits: 0,
          requiredCredits: creditResult.requiredCredits || 0
        })
        return
      }

      // 积分检查通过，继续处理
      window.webContents.send('processing-credits-check-passed', { 
        credits: creditResult.newCredits || 0
      })

      // ... [现有的处理逻辑]
      window.webContents.send('processing-status', { 
        message: '编程题处理中...',
        progress: 30
      })

      // 模拟处理成功
      setTimeout(() => {
        window.webContents.send('programming-search-result', { 
          success: true,
          result: '编程题已处理完成'
        })
        this.completeCreditsOperation(operationId)
      }, 2000)

    } catch (error) {
      console.error("编程题搜索处理错误:", error)
      window.webContents.send('programming-search-error', { error: '处理失败:' + error.message })
    }
  }
} 