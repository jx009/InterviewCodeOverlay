// SimpleAuthManager.ts - Cursor式认证管理器
import { BrowserWindow, shell } from 'electron'
import { EventEmitter } from 'events'
import axios, { AxiosInstance } from 'axios'
import { configHelper } from './ConfigHelper'

interface User {
  id: string
  username: string
  email: string
  createdAt: string
}

interface UserConfig {
  aiModel: string
  programmingModel?: string  // 编程题模型
  multipleChoiceModel?: string  // 选择题模型
  language: string
  theme: 'light' | 'dark' | 'system'
  shortcuts: {
    takeScreenshot: string
    openQueue: string
    openSettings: string
  }
  display: {
    opacity: number
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    autoHide: boolean
    hideDelay: number
  }
  processing: {
    autoProcess: boolean
    saveScreenshots: boolean
    compressionLevel: number
  }
}

/**
 * 简化的认证管理器 - 采用Cursor式设计
 * 核心原则：
 * 1. 单一认证源（统一token）
 * 2. 简单的状态管理（已登录/未登录）
 * 3. 直接的OAuth流程
 */
export class SimpleAuthManager extends EventEmitter {
  private token: string | null = null
  private user: User | null = null
  private userConfig: UserConfig | null = null
  private apiBaseUrl: string
  private apiClient: AxiosInstance
  private configCacheExpiry: number = 0 // 配置缓存过期时间

  constructor(apiBaseUrl: string = 'http://localhost:3001') {
    super()
    this.apiBaseUrl = apiBaseUrl
    
    // 创建API客户端
    this.apiClient = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // 启动时加载本地token
    this.loadStoredToken()
  }

  /**
   * 核心方法1：登录
   * 简单直接的OAuth流程（改进用户体验）
   */
  public async login(): Promise<boolean> {
    try {
      console.log('🔐 开始OAuth登录流程...')
      this.emit('login-progress', { step: 'starting', message: '正在启动登录...' })
      
      // 检查服务器连接
      this.emit('login-progress', { step: 'checking-server', message: '正在检查服务器连接...' })
      const serverOnline = await this.checkServerConnection()
      if (!serverOnline) {
        throw new Error('无法连接到服务器，请确保网络连接正常')
      }

      // 打开OAuth登录窗口
      this.emit('login-progress', { step: 'opening-browser', message: '正在打开登录页面...' })
      const token = await this.openOAuthWindow()
      console.log('🔑 OAuth窗口返回结果:', token ? `token长度${token.length}` : 'null')
      
      if (!token) {
        this.emit('login-cancelled')
        throw new Error('登录被取消')
      }

      // 保存token并获取用户信息
      this.emit('login-progress', { step: 'saving-token', message: '正在保存登录信息...' })
      console.log('🔑 开始保存token到内存和本地...')
      this.token = token
      console.log('🔑 Token已保存到内存')
      this.saveToken(token)
      this.setupApiClient()
      console.log('🔑 API客户端已设置认证头')

      // 获取用户信息
      this.emit('login-progress', { step: 'fetching-user', message: '正在获取用户信息...' })
      await this.fetchUserInfo()
      
      // 获取用户配置
      this.emit('login-progress', { step: 'fetching-config', message: '正在同步用户配置...' })
      await this.fetchUserConfig()

      console.log(`✅ 登录成功: ${this.user?.username}`)
      this.emit('login-success', { 
        user: this.user,
        message: `欢迎回来，${this.user?.username}！`
      })
      this.emit('authenticated', this.user)
      return true

    } catch (error: any) {
      const friendlyMessage = this.getFriendlyErrorMessage(error.message)
      console.error('❌ 登录失败:', friendlyMessage)
      this.clearAuthData()
      this.emit('login-error', { 
        error: friendlyMessage,
        technical: error.message 
      })
      this.emit('authentication-error', error)
      return false
    }
  }

  /**
   * 将技术错误转换为用户友好的消息
   */
  private getFriendlyErrorMessage(technicalError: string): string {
    if (technicalError.includes('服务器连接失败') || technicalError.includes('ECONNREFUSED')) {
      return '无法连接到服务器，请检查网络连接或稍后重试'
    }
    if (technicalError.includes('登录被取消')) {
      return '登录已取消'
    }
    if (technicalError.includes('token') || technicalError.includes('401')) {
      return '登录验证失败，请重新登录'
    }
    if (technicalError.includes('timeout') || technicalError.includes('超时')) {
      return '登录超时，请检查网络连接后重试'
    }
    if (technicalError.includes('用户信息') || technicalError.includes('配置')) {
      return '登录成功但获取用户信息失败，请重试'
    }
    
    // 默认友好消息
    return '登录失败，请稍后重试'
  }

  /**
   * 🆕 核心方法2：登出（适配增强认证）
   */
  public async logout(): Promise<void> {
    try {
      console.log('🚪 正在登出...')
      
      // 🆕 通知服务器登出（使用增强认证API）
      if (this.token) {
        try {
          await this.apiClient.post('/api/logout')
        } catch (error) {
          console.warn('服务器登出请求失败，但继续本地登出')
        }
      }

      // 清除本地数据
      this.clearAuthData()
      
      console.log('✅ 登出成功')
      this.emit('logged-out')
    } catch (error) {
      console.error('❌ 登出失败:', error)
    }
  }

  /**
   * 核心方法3：检查认证状态
   * 增强逻辑：验证token并确保用户信息和配置都已加载
   */
  public async isAuthenticated(): Promise<boolean> {
    console.log('🔐 开始检查认证状态...')
    
    // 没有token，肯定未认证
    if (!this.token) {
      console.log('❌ 没有token，未认证')
      return false
    }

    console.log('✅ 找到token，开始验证...')
    
    // 有token，验证其有效性
    try {
      await this.verifyToken()
      console.log('✅ Token验证成功')
      
      // 确保用户信息已加载
      if (!this.user) {
        console.log('📋 Token有效但用户信息未加载，开始获取...')
        await this.fetchUserInfo()
      }
      
      // 确保用户配置已加载
      if (!this.userConfig) {
        console.log('📋 Token有效但用户配置未加载，开始获取...')
        await this.fetchUserConfig()
      }
      
      console.log('✅ 认证状态验证成功')
      return true
    } catch (error) {
      console.error('❌ Token验证失败，需要重新登录:', error.message)
      this.clearAuthData()
      return false
    }
  }

  /**
   * 获取当前用户
   */
  public getCurrentUser(): User | null {
    return this.user
  }

  /**
   * 获取用户配置
   */
  public getUserConfig(): UserConfig | null {
    return this.userConfig
  }

  /**
   * 刷新用户配置（带缓存机制）
   */
  public async refreshUserConfig(forceRefresh: boolean = false): Promise<UserConfig | null> {
    if (!this.token || !this.user) {
      console.log('❌ 无法刷新配置：缺少token或用户信息')
      return null
    }

    // 检查缓存是否有效（5分钟缓存）
    const now = Date.now()
    const cacheAge = now - this.configCacheExpiry
    const cacheValid = cacheAge < 5 * 60 * 1000
    
    console.log(`📋 配置缓存状态检查:`)
    console.log(`  - 强制刷新: ${forceRefresh}`)
    console.log(`  - 缓存年龄: ${Math.round(cacheAge / 1000)}秒`)
    console.log(`  - 缓存有效: ${cacheValid}`)
    console.log(`  - 当前有配置: ${!!this.userConfig}`)
    
    if (!forceRefresh && cacheValid && this.userConfig) {
      console.log('📋 使用缓存的用户配置')
      console.log(`📋 缓存配置详情: multipleChoiceModel=${this.userConfig.multipleChoiceModel}`)
      return this.userConfig
    }

    console.log(`🔄 开始${forceRefresh ? '强制' : '自动'}刷新配置...`)
    try {
      await this.fetchUserConfig()
      this.configCacheExpiry = now
      console.log('✅ 配置已刷新并缓存')
      console.log(`📋 新配置详情: multipleChoiceModel=${this.userConfig?.multipleChoiceModel}`)
      return this.userConfig
    } catch (error) {
      console.error('❌ 刷新用户配置失败:', error)
      // 如果刷新失败但有缓存，返回缓存
      if (this.userConfig) {
        console.log('📋 刷新失败，使用缓存配置')
        return this.userConfig
      }
      return null
    }
  }

  /**
   * 检查服务器连接（兼容性方法）
   */
  public async checkConnection(): Promise<boolean> {
    return await this.checkServerConnection()
  }

  /**
   * 初始化认证（在应用启动时调用）
   */
  public async initializeAuth(): Promise<boolean> {
    console.log('🚀 初始化认证管理器...')
    
    try {
      // 1. 重新加载token（包括检查共享会话）
      this.loadStoredToken()
      
      // 2. 如果有token，验证其有效性
      if (this.token) {
        const isValid = await this.isAuthenticated()
        if (isValid) {
          console.log('✅ 认证初始化成功')
          return true
        }
      }
      
      // 3. 如果本地没有有效token，尝试从后端检查共享会话
      console.log('🔍 本地无有效token，检查后端共享会话...')
      const hasWebSession = await this.checkWebSession()
      
      if (hasWebSession) {
        console.log('✅ 发现Web端会话，重新加载token')
        this.loadStoredToken()
        return await this.isAuthenticated()
      }
      
      console.log('❌ 没有找到有效的认证会话')
      return false
      
    } catch (error) {
      console.error('❌ 认证初始化失败:', error)
      return false
    }
  }

  /**
   * 🆕 检查Web端会话状态（适配增强认证）
   */
  private async checkWebSession(): Promise<boolean> {
    try {
      // 🆕 增强认证没有专门的会话检查API，直接检查共享会话文件
      console.log('🔍 检查共享会话文件...')
      this.loadTokenFromSharedSession()
      
      if (this.token) {
        console.log('✅ 从共享会话文件找到sessionId')
        return true
      } else {
        console.log('❌ 共享会话文件中没有sessionId')
        return false
      }
    } catch (error) {
      console.error('❌ 检查Web会话失败:', error)
      return false
    }
  }

  /**
   * 打开Web登录（兼容性方法）
   */
  public async openWebLogin(): Promise<void> {
    await this.login()
  }

  /**
   * 处理认证回调（兼容性方法）
   */
  public handleAuthCallback(url: string): void {
    // 这个方法在新的实现中不需要，因为我们在OAuth窗口中直接处理回调
    console.log('Auth callback received:', url)
    // 可以在这里添加额外的回调处理逻辑
  }

  // ==================== 私有方法 ====================

  /**
   * 加载本地存储的token
   */
  private loadStoredToken(): void {
    try {
      console.log('📋 尝试加载本地token...')
      
      // 1. 首先尝试从配置文件加载token
      const config = configHelper.loadConfig()
      console.log('📋 配置文件内容:', JSON.stringify(config, null, 2))
      
      if (config.authToken) {
        this.token = config.authToken
        this.setupApiClient()
        console.log('📋 已从配置文件加载token，长度:', this.token.length)
        console.log('📋 Token前缀:', this.token.substring(0, 20) + '...')
        return
      }
      
      console.log('📋 配置文件中没有authToken，尝试检查共享会话文件...')
      
      // 2. 如果配置文件没有token，尝试从shared-session.json加载
      this.loadTokenFromSharedSession()
      
    } catch (error) {
      console.error('❌ 加载本地token失败:', error)
    }
  }

  /**
   * 从共享会话文件加载token
   */
  private loadTokenFromSharedSession(): void {
    try {
      const fs = require('fs')
      const path = require('path')
      
      // 🆕 修复路径问题：shared-session.json在项目根目录
      // 尝试多个可能的路径
      const possiblePaths = [
        path.join(process.cwd(), 'shared-session.json'),
        path.join(__dirname, '..', 'shared-session.json'),
        path.join(__dirname, '..', '..', 'shared-session.json'),
        path.join(process.resourcesPath || '', '..', 'shared-session.json')
      ]
      
      let sharedSessionPath: string | null = null
      for (const possiblePath of possiblePaths) {
        console.log('🔍 检查路径:', possiblePath)
        if (fs.existsSync(possiblePath)) {
          sharedSessionPath = possiblePath
          console.log('✅ 找到共享会话文件:', sharedSessionPath)
          break
        }
      }
      
      console.log('🔍 最终使用的共享会话文件路径:', sharedSessionPath)
      
      if (!sharedSessionPath) {
        console.log('📋 未找到共享会话文件')
        return
      }
      
      const sharedSessionData = fs.readFileSync(sharedSessionPath, 'utf8')
      const sharedSession = JSON.parse(sharedSessionData)
      console.log('📋 找到共享会话文件:', {
        user: sharedSession.user?.username,
        expiresAt: sharedSession.expiresAt
      })
      
      // 检查会话是否过期
      const now = new Date()
      const expiresAt = new Date(sharedSession.expiresAt)
      
      if (now > expiresAt) {
        console.log('⏰ 共享会话已过期，删除文件')
        fs.unlinkSync(sharedSessionPath)
        return
      }
      
      // 🆕 增强认证使用sessionId而不是accessToken
      if (sharedSession.sessionId) {
        this.token = sharedSession.sessionId
        this.user = sharedSession.user
        this.setupApiClient()
        
        // 将sessionId保存到本地配置以备下次使用
        configHelper.updateConfig({ authToken: this.token })
        
        console.log('✅ 从共享会话成功加载sessionId')
        console.log('👤 用户:', this.user?.username)
        console.log('📋 SessionId长度:', this.token.length)
        console.log('📋 SessionId前缀:', this.token.substring(0, 10) + '...')
        
        // 触发认证成功事件
        this.emit('authenticated', this.user)
      } else {
        console.log('❌ 共享会话文件中没有sessionId')
        // 🆕 为了兼容性，也检查旧的accessToken字段
        if (sharedSession.accessToken) {
          console.log('⚠️ 发现旧的accessToken，但增强认证需要sessionId')
        }
      }
      
    } catch (error) {
      console.error('❌ 从共享会话加载token失败:', error)
    }
  }

  /**
   * 保存token到本地
   */
  private saveToken(token: string): void {
    try {
      console.log('💾 开始保存token到本地...')
      console.log('💾 Token长度:', token.length)
      console.log('💾 Token前缀:', token.substring(0, 20) + '...')
      
      configHelper.updateConfig({ authToken: token })
      
      // 验证保存是否成功
      const savedConfig = configHelper.loadConfig()
      if (savedConfig.authToken === token) {
        console.log('✅ Token保存成功并验证')
      } else {
        console.log('❌ Token保存验证失败')
        console.log('  - 期望:', token.substring(0, 20) + '...')
        console.log('  - 实际:', savedConfig.authToken ? savedConfig.authToken.substring(0, 20) + '...' : 'null')
      }
    } catch (error) {
      console.error('❌ 保存token失败:', error)
    }
  }

  /**
   * 🆕 设置API客户端的认证头（适配增强认证）
   */
  private setupApiClient(): void {
    if (this.token) {
      // 🆕 增强认证使用X-Session-Id头而不是Authorization
      this.apiClient.defaults.headers.common['X-Session-Id'] = this.token
      delete this.apiClient.defaults.headers.common['Authorization'] // 清除传统认证头
    }
  }

  /**
   * 🆕 验证sessionId有效性（适配增强认证）
   */
  private async verifyToken(): Promise<void> {
    if (!this.token) {
      throw new Error('没有sessionId')
    }

    console.log('🔍 开始验证sessionId...')
    console.log('🔑 SessionId长度:', this.token.length)
    console.log('🔑 SessionId前缀:', this.token.substring(0, 10) + '...')
    console.log('🌐 API地址:', `${this.apiBaseUrl}/api/session_status`)
    console.log('📤 请求头:', this.apiClient.defaults.headers.common['X-Session-Id'])

    try {
      const response = await this.apiClient.get('/api/session_status')
      console.log('📥 响应状态:', response.status)
      console.log('📥 响应数据:', response.data)
      
      if (response.data && response.data.success && response.data.user) {
        this.user = response.data.user
        console.log('✅ SessionId验证成功')
      } else {
        console.log('❌ 响应数据格式不正确:', response.data)
        throw new Error('SessionId验证失败 - 响应数据无效')
      }
    } catch (error: any) {
      console.log('❌ SessionId验证请求失败:')
      console.log('  - 错误类型:', error.constructor.name)
      console.log('  - 错误消息:', error.message)
      if (error.response) {
        console.log('  - 响应状态:', error.response.status)
        console.log('  - 响应数据:', error.response.data)
        
        // 🆕 增强认证不支持刷新，401错误直接清除认证
        if (error.response.status === 401) {
          console.log('🔄 SessionId已过期，需要重新登录')
          this.clearAuthData()
        }
      } else if (error.request) {
        console.log('  - 请求失败，无响应')
        console.log('  - 请求详情:', error.request)
      }
      throw new Error(`SessionId验证失败: ${error.message}`)
    }
  }

  /**
   * 🆕 增强认证不支持刷新，此方法已废弃
   */
  private async tryRefreshToken(): Promise<boolean> {
    console.log('🚫 增强认证不支持token刷新，需要重新登录')
    return false
  }

  /**
   * 🆕 获取用户信息（适配增强认证）
   */
  private async fetchUserInfo(): Promise<void> {
    const response = await this.apiClient.get('/api/session_status')
    if (response.data && response.data.success && response.data.user) {
      this.user = response.data.user
      console.log(`📋 获取用户信息: ${this.user.username}`)
    } else {
      throw new Error('获取用户信息失败')
    }
  }

  /**
   * 获取用户配置（修复版本 - 使用正确的API路由）
   */
  private async fetchUserConfig(): Promise<void> {
    if (!this.user) {
      throw new Error('没有用户信息')
    }

    console.log('📋 正在从后端获取用户配置...')
    console.log('🌐 请求URL:', `${this.apiBaseUrl}/api/config`)
    
    try {
      // 使用简化的配置API路由
      const response = await this.apiClient.get('/api/config')
      
      console.log('📥 后端配置响应状态:', response.status)
      console.log('📥 后端返回的原始配置数据:', JSON.stringify(response.data, null, 2))
      
      if (response.data) {
        // 根据后端返回的数据结构适配，支持新的模型字段
        this.userConfig = {
          // 兼容新旧模型字段
          aiModel: response.data.aiModel || response.data.programmingModel || 'claude-3-5-sonnet-20241022',
          programmingModel: response.data.programmingModel || response.data.aiModel || 'claude-3-5-sonnet-20241022',
          multipleChoiceModel: response.data.multipleChoiceModel || response.data.aiModel || 'claude-3-5-sonnet-20241022',
          language: response.data.language || 'python',
          theme: response.data.theme || 'system',
          shortcuts: response.data.shortcuts || {
            takeScreenshot: 'Ctrl+Shift+S',
            openQueue: 'Ctrl+Shift+Q',
            openSettings: 'Ctrl+Shift+,'
          },
          display: response.data.display || {
            opacity: response.data.opacity || 1.0,
            position: 'top-right',
            autoHide: false,
            hideDelay: 3000
          },
          processing: response.data.processing || {
            autoProcess: false,
            saveScreenshots: true,
            compressionLevel: 80
          }
        }
        
        console.log('✅ 用户配置构建成功:')
        console.log(`  - aiModel: ${this.userConfig.aiModel}`)
        console.log(`  - programmingModel: ${this.userConfig.programmingModel}`)
        console.log(`  - multipleChoiceModel: ${this.userConfig.multipleChoiceModel}`)
        console.log(`  - language: ${this.userConfig.language}`)
      } else {
        throw new Error('API返回空数据')
      }
    } catch (error: any) {
      console.error('❌ 获取用户配置失败:', error)
      
      // 如果配置获取失败，创建默认配置
      console.log('🔧 使用默认配置...')
      this.userConfig = {
        aiModel: 'claude-3-5-sonnet-20241022',
        programmingModel: 'claude-3-5-sonnet-20241022',
        multipleChoiceModel: 'claude-3-5-sonnet-20241022',
        language: 'python',
        theme: 'system',
        shortcuts: {
          takeScreenshot: 'Ctrl+Shift+S',
          openQueue: 'Ctrl+Shift+Q',
          openSettings: 'Ctrl+Shift+,'
        },
        display: {
          opacity: 1.0,
          position: 'top-right',
          autoHide: false,
          hideDelay: 3000
        },
        processing: {
          autoProcess: false,
          saveScreenshots: true,
          compressionLevel: 80
        }
      }
      
      console.log('✅ 已设置默认用户配置')
    }
  }

  /**
   * 打开OAuth登录窗口
   */
  private async openOAuthWindow(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      // 创建登录窗口
      const authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: true,
        modal: false, // 改为非模态，避免阻塞主窗口
        alwaysOnTop: true, // 保持在最前面
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      // 登录URL - 指向后端提供的登录页面
      const loginUrl = `${this.apiBaseUrl}/login?mode=oauth&client=electron`
      
      console.log('🌐 打开登录窗口:', loginUrl)
      authWindow.loadURL(loginUrl)

      // 设置超时处理（30秒）
      const timeoutId = setTimeout(() => {
        if (!authWindow.isDestroyed()) {
          authWindow.close()
          reject(new Error('登录超时，请重试'))
        }
      }, 30000)

      // 监听URL变化，捕获回调
      const handleNavigation = (event: any, navigationUrl: string) => {
        this.handleOAuthCallback(navigationUrl, authWindow, resolve, reject, timeoutId)
      }

      authWindow.webContents.on('will-navigate', handleNavigation)
      authWindow.webContents.on('did-navigate', handleNavigation)
      
      // 🆕 定期检查localStorage中的sessionId（每500ms检查一次）
      const checkSessionInterval = setInterval(() => {
        if (authWindow.isDestroyed()) {
          clearInterval(checkSessionInterval)
          return
        }
        
        authWindow.webContents.executeJavaScript(`
          localStorage.getItem('sessionId')
        `).then((sessionId) => {
          if (sessionId) {
            console.log('✅ 定期检查发现登录成功，获取到sessionId')
            clearInterval(checkSessionInterval)
            if (timeoutId) clearTimeout(timeoutId)
            authWindow.close()
            resolve(sessionId)
          }
        }).catch((error) => {
          // 忽略执行JavaScript的错误，可能是页面还没加载完成
        })
      }, 500)

      // 窗口关闭时取消登录
      authWindow.on('closed', () => {
        clearInterval(checkSessionInterval)
        clearTimeout(timeoutId)
        if (!resolve.toString().includes('called')) { // 简单检查是否已经resolved
          console.log('🚪 登录窗口被用户关闭')
          this.emit('login-cancelled')
          reject(new Error('登录被取消'))
        }
      })

      // 监听窗口焦点，确保用户能看到登录窗口
      authWindow.on('ready-to-show', () => {
        authWindow.show()
        authWindow.focus()
      })
    })
  }

  /**
   * 🆕 处理OAuth回调（适配增强认证）
   */
  private handleOAuthCallback(
    url: string, 
    authWindow: BrowserWindow, 
    resolve: (token: string | null) => void, 
    reject: (error: Error) => void,
    timeoutId?: NodeJS.Timeout
  ): void {
    console.log('🔍 检查URL:', url)
    
    // 🆕 检查是否登录成功（检查多种可能的成功标志）
    const isLoginSuccess = url.includes('localhost:3000') && !url.includes('/login');
    const isBackendSuccess = url.includes('localhost:3001') && !url.includes('/login');
    
    if (isLoginSuccess || isBackendSuccess) {
      console.log('✅ 检测到登录成功，页面URL:', url)
      
      // 从localStorage获取sessionId
      authWindow.webContents.executeJavaScript(`
        localStorage.getItem('sessionId')
      `).then((sessionId) => {
        if (sessionId) {
          console.log('✅ 从Web端获取到sessionId')
          if (timeoutId) clearTimeout(timeoutId)
          authWindow.close()
          resolve(sessionId)
        } else {
          console.log('❌ 未能从Web端获取sessionId，尝试等待...')
          // 等待一下再重试
          setTimeout(() => {
            authWindow.webContents.executeJavaScript(`
              localStorage.getItem('sessionId')
            `).then((retrySessionId) => {
              if (retrySessionId) {
                console.log('✅ 重试成功，获取到sessionId')
                if (timeoutId) clearTimeout(timeoutId)
                authWindow.close()
                resolve(retrySessionId)
              } else {
                console.log('❌ 重试失败，无法获取sessionId')
                if (timeoutId) clearTimeout(timeoutId)
                authWindow.close()
                reject(new Error('无法获取登录会话'))
              }
            }).catch((error) => {
              console.error('❌ 重试获取sessionId失败:', error)
              if (timeoutId) clearTimeout(timeoutId)
              authWindow.close()
              reject(new Error('获取登录会话失败'))
            })
          }, 2000)
        }
      }).catch((error) => {
        console.error('❌ 获取sessionId失败:', error)
        if (timeoutId) clearTimeout(timeoutId)
        authWindow.close()
        reject(new Error('获取登录会话失败'))
      })
    }
    // 检查是否是登录错误页面
    else if (url.includes('/login') && url.includes('error')) {
      console.error('❌ OAuth登录失败')
      if (timeoutId) clearTimeout(timeoutId)
      authWindow.close()
      reject(new Error('OAuth登录失败'))
    }
  }

  /**
   * 检查服务器连接
   */
  private async checkServerConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/api/health`, { timeout: 5000 })
      return response.status === 200
    } catch (error) {
      console.error('服务器连接检查失败:', error)
      return false
    }
  }

  /**
   * 🆕 清除认证数据（适配增强认证）
   */
  private clearAuthData(): void {
    this.token = null
    this.user = null
    this.userConfig = null
    
    // 🆕 清除增强认证的API客户端认证头
    delete this.apiClient.defaults.headers.common['Authorization']
    delete this.apiClient.defaults.headers.common['X-Session-Id']
    
    // 清除本地存储
    configHelper.updateConfig({ authToken: null })
    
    // 🆕 清除共享会话文件
    try {
      const path = require('path')
      const fs = require('fs')
      const sharedSessionPath = path.join(__dirname, '..', 'shared-session.json')
      
      if (fs.existsSync(sharedSessionPath)) {
        fs.unlinkSync(sharedSessionPath)
        console.log('🗑️ 共享会话文件已删除')
      }
    } catch (error) {
      console.warn('⚠️ 清除共享会话文件失败:', error)
    }
    
    console.log('🗑️ 认证数据已清除')
  }
}

// 导出单例
export const simpleAuthManager = new SimpleAuthManager() 