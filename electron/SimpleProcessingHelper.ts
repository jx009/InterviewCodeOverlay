// SimpleProcessingHelper.ts - Cursor式AI处理助手
import fs from "node:fs"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import { BrowserWindow } from "electron"
import { OpenAI } from "openai"
import { simpleAuthManager } from "./SimpleAuthManager"
import { configHelper } from "./ConfigHelper"

// 统一的API密钥 - 用户无需配置
const ISMAQUE_API_KEY = "sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP"

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

  // AbortControllers for API requests
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(deps: IProcessingHelperDeps) {
    this.deps = deps
    this.screenshotHelper = deps.getScreenshotHelper()
    
    // Initialize AI client
    this.initializeAIClient()
  }
  
  /**
   * Initialize the AI client with fixed API key
   */
  private initializeAIClient(): void {
    try {
      this.ismaqueClient = new OpenAI({ 
        apiKey: ISMAQUE_API_KEY,
        baseURL: "https://ismaque.org/v1",
        maxRetries: 2
      })
      console.log("✅ Ismaque.org API客户端初始化成功")
    } catch (error) {
      console.error("❌ AI客户端初始化失败:", error)
      this.ismaqueClient = null
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
    const isAuthenticated = await simpleAuthManager.isAuthenticated()
    if (!isAuthenticated) {
      console.log('❌ 用户未认证，必须登录')
      await this.showLoginDialog()
      return
    }

    // Step 2: 获取用户和配置
    const user = simpleAuthManager.getCurrentUser()
    const userConfig = simpleAuthManager.getUserConfig()
    
    if (!user || !userConfig) {
      console.log('❌ 用户信息或配置获取失败，需要重新登录')
      await this.showLoginDialog()
      return
    }

    console.log(`✅ 用户认证成功: ${user.username}`)
    console.log(`📋 使用配置: AI模型=${userConfig.aiModel}, 语言=${userConfig.language}`)

    // Step 3: 获取客户端语言设置（优先级最高）
    const clientLanguage = await this.getClientLanguage()
    const finalLanguage = clientLanguage || userConfig.language || 'python'

    // 保存客户端语言设置
    if (clientLanguage) {
      this.saveClientLanguage(clientLanguage)
    }

    console.log(`🎯 最终使用语言: ${finalLanguage}`)

    // Step 4: 执行AI处理
    const view = this.deps.getView()
    if (view === "queue") {
      await this.processMainQueue(userConfig, finalLanguage)
    } else {
      await this.processExtraQueue(userConfig, finalLanguage)
    }
  }



  /**
   * 获取客户端语言设置
   */
  private async getClientLanguage(): Promise<string> {
    try {
      const mainWindow = this.deps.getMainWindow()
      if (!mainWindow) return ''

      await this.waitForInitialization(mainWindow)
      const language = await mainWindow.webContents.executeJavaScript(
        "window.__LANGUAGE__"
      )

      if (typeof language === "string" && language) {
        console.log('📱 客户端语言设置:', language)
        return language
      }
      
      return ''
    } catch (error) {
      console.error("获取客户端语言失败:", error)
      return ''
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
    throw new Error("App failed to initialize after 5 seconds")
  }

  /**
   * 保存客户端语言设置（简化版）
   */
  private saveClientLanguage(language: string): void {
    try {
      configHelper.updateClientSettings({ lastLanguage: language })
      console.log(`📝 客户端语言设置已保存: ${language}`)
    } catch (error) {
      console.warn('保存客户端语言设置失败:', error)
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
        result.data
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
   * 使用AI处理截图（简化版本）
   */
  private async processScreenshotsWithAI(
    screenshots: Array<{ path: string; data: string }>,
    userConfig: any,
    language: string,
    signal: AbortSignal
  ) {
    try {
      const mainWindow = this.deps.getMainWindow()
      
      if (!this.ismaqueClient) {
        this.initializeAIClient()
        if (!this.ismaqueClient) {
          return {
            success: false,
            error: "AI客户端初始化失败，请重启应用"
          }
        }
      }

      // Step 1: 提取题目信息
      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "正在从截图中分析题目...",
          progress: 20
        })
      }

      const imageDataList = screenshots.map(screenshot => screenshot.data)
      const extractionModel = userConfig.aiModel || 'claude-3-5-sonnet-20241022'

      const messages = [
        {
          role: "system" as const, 
          content: "你是一个编程题目解释助手。请严格按照要求分析编程题目的截图，提取所有相关信息。\n\n重要要求：\n1. 必须只返回纯JSON格式，不要任何额外的文字、解释或markdown标记\n2. JSON必须包含以下字段：problem_statement, constraints, example_input, example_output\n3. 如果某个字段无法从截图中获取，请设置为空字符串\n4. 确保返回的是有效的JSON格式\n\n示例输出格式：\n{\"problem_statement\":\"题目描述\",\"constraints\":\"约束条件\",\"example_input\":\"示例输入\",\"example_output\":\"示例输出\"}"
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const, 
              text: `从这些截图中提取编程题目详情、输入描述、输出描述以及示例，以严格的JSON格式返回。我们将使用${language}语言来解决这个问题。请确保返回的是有效的JSON格式，不要包含任何其他文本。`
            },
            ...imageDataList.map(data => ({
              type: "image_url" as const,
              image_url: { url: `data:image/png;base64,${data}` }
            }))
          ]
        }
      ]

      const extractionResponse = await this.ismaqueClient.chat.completions.create({
        model: extractionModel,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.1
      }, { signal })

      // 解析题目信息
      let problemInfo
      try {
        const responseText = extractionResponse.choices[0].message.content
        console.log("AI提取响应:", responseText)
        
        let jsonText = responseText.trim()
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        
        const jsonStart = jsonText.indexOf('{')
        const jsonEnd = jsonText.lastIndexOf('}')
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonText = jsonText.substring(jsonStart, jsonEnd + 1)
        }
        
        problemInfo = JSON.parse(jsonText)
        
        problemInfo = {
          problem_statement: problemInfo.problem_statement || "无法从截图中提取题目描述",
          constraints: problemInfo.constraints || "无法从截图中提取约束条件",
          example_input: problemInfo.example_input || "无法从截图中提取示例输入", 
          example_output: problemInfo.example_output || "无法从截图中提取示例输出"
        }
        
        console.log("✅ 题目信息提取成功:", problemInfo)
        
      } catch (error) {
        console.error("解析AI响应失败:", error)
        return {
          success: false,
          error: `解析题目信息失败：${error.message}`
        }
      }

      // Step 2: 生成解决方案
      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "正在生成解决方案...",
          progress: 60
        })
      }

      // 存储题目信息
      this.deps.setProblemInfo(problemInfo)

      // 发送题目提取成功事件
      if (mainWindow) {
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
          problemInfo
        )
      }

      const solutionsResult = await this.generateSolutions(userConfig, language, problemInfo, signal)
      
      if (solutionsResult.success) {
        // 清除额外截图队列
        this.screenshotHelper.clearExtraScreenshotQueue()
        
        if (mainWindow) {
          mainWindow.webContents.send("processing-status", {
            message: "解决方案生成成功",
            progress: 100
          })
        }
        
        return { success: true, data: solutionsResult.data }
      } else {
        throw new Error(solutionsResult.error || "生成解决方案失败")
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
  private async generateSolutions(userConfig: any, language: string, problemInfo: any, signal: AbortSignal) {
    try {
      if (!this.ismaqueClient) {
        return {
          success: false,
          error: "AI客户端未初始化"
        }
      }

      const solutionModel = userConfig.aiModel || 'claude-3-5-sonnet-20241022'

      const promptText = `
为以下编程题目生成详细的解决方案：

题目描述：
${problemInfo.problem_statement}

约束条件：
${problemInfo.constraints || "未提供具体约束条件。"}

示例输入：
${problemInfo.example_input || "未提供示例输入。"}

示例输出：
${problemInfo.example_output || "未提供示例输出。"}

编程语言：${language}

请按照以下格式提供回复：
1. 代码：一个完整的ACM竞赛模式的${language}实现
2. 解题思路：关键洞察和方法推理的要点列表
3. 时间复杂度：O(X)格式，并提供详细解释（至少2句话）
4. 空间复杂度：O(X)格式，并提供详细解释（至少2句话）

**重要的代码格式要求：**
- 必须生成完整的ACM竞赛编程模式代码
- 对于Java语言，必须使用 "public class Main" 作为主类名
- 必须使用标准输入读取所有数据，不要使用预定义的变量或硬编码的测试数据
- 输入处理必须严格按照题目描述的输入格式来实现
- 代码必须是完整的、可以直接复制粘贴到在线判题系统运行的格式
- 包含适当的导入语句和必要的库引用
`

      const solutionResponse = await this.ismaqueClient.chat.completions.create({
        model: solutionModel,
        messages: [
          { role: "system", content: "你是一位专业的编程面试助手。提供清晰、最优的解决方案和详细解释。" },
          { role: "user", content: promptText }
        ],
        max_tokens: 4000,
        temperature: 0.2
      }, { signal })

      const responseContent = solutionResponse.choices[0].message.content
      
      // 解析响应内容
      const codeMatch = responseContent.match(/```(?:\w+)?\s*([\s\S]*?)```/)
      const code = codeMatch ? codeMatch[1].trim() : responseContent
      
      // 提取思路
      const thoughtsRegex = /(?:解题思路|思路|关键洞察|推理|方法)[:：]([\s\S]*?)(?:时间复杂度|$)/i
      const thoughtsMatch = responseContent.match(thoughtsRegex)
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
      
      let timeComplexity = "O(n) - 线性时间复杂度，因为我们只需要遍历数组一次。"
      let spaceComplexity = "O(n) - 线性空间复杂度，因为我们在哈希表中存储元素。"
      
      const timeMatch = responseContent.match(timeComplexityPattern)
      if (timeMatch && timeMatch[1]) {
        timeComplexity = timeMatch[1].trim()
      }
      
      const spaceMatch = responseContent.match(spaceComplexityPattern)
      if (spaceMatch && spaceMatch[1]) {
        spaceComplexity = spaceMatch[1].trim()
      }

      const formattedResponse = {
        code: code,
        thoughts: thoughts.length > 0 ? thoughts : ["基于效率和可读性的解决方案方法"],
        time_complexity: timeComplexity,
        space_complexity: spaceComplexity
      }

      return { success: true, data: formattedResponse }
      
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
      
      if (!this.ismaqueClient) {
        return {
          success: false,
          error: "AI客户端未初始化"
        }
      }
      
      const debuggingModel = userConfig.aiModel || 'claude-3-5-sonnet-20241022'
      
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

      const debugResponse = await this.ismaqueClient.chat.completions.create({
        model: debuggingModel,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.2
      }, { signal })
      
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
} 