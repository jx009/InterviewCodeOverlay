"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleAuthManager = exports.SimpleAuthManager = void 0;
// SimpleAuthManager.ts - Cursor式认证管理器
const electron_1 = require("electron");
const events_1 = require("events");
const axios_1 = __importDefault(require("axios"));
const ConfigHelper_1 = require("./ConfigHelper");
/**
 * 简化的认证管理器 - 采用Cursor式设计
 * 核心原则：
 * 1. 单一认证源（统一token）
 * 2. 简单的状态管理（已登录/未登录）
 * 3. 直接的OAuth流程
 */
class SimpleAuthManager extends events_1.EventEmitter {
    constructor(apiBaseUrl = 'http://localhost:3001') {
        super();
        this.token = null;
        this.user = null;
        this.userConfig = null;
        this.configCacheExpiry = 0; // 配置缓存过期时间
        this.apiBaseUrl = apiBaseUrl;
        // 创建API客户端
        this.apiClient = axios_1.default.create({
            baseURL: this.apiBaseUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // 启动时加载本地token
        this.loadStoredToken();
    }
    /**
     * 核心方法1：登录
     * 简单直接的OAuth流程（改进用户体验）
     */
    async login() {
        try {
            console.log('🔐 开始OAuth登录流程...');
            this.emit('login-progress', { step: 'starting', message: '正在启动登录...' });
            // 检查服务器连接
            this.emit('login-progress', { step: 'checking-server', message: '正在检查服务器连接...' });
            const serverOnline = await this.checkServerConnection();
            if (!serverOnline) {
                throw new Error('无法连接到服务器，请确保网络连接正常');
            }
            // 打开OAuth登录窗口
            this.emit('login-progress', { step: 'opening-browser', message: '正在打开登录页面...' });
            const token = await this.openOAuthWindow();
            console.log('🔑 OAuth窗口返回结果:', token ? `token长度${token.length}` : 'null');
            if (!token) {
                this.emit('login-cancelled');
                throw new Error('登录被取消');
            }
            // 保存token并获取用户信息
            this.emit('login-progress', { step: 'saving-token', message: '正在保存登录信息...' });
            console.log('🔑 开始保存token到内存和本地...');
            this.token = token;
            console.log('🔑 Token已保存到内存');
            this.saveToken(token);
            this.setupApiClient();
            console.log('🔑 API客户端已设置认证头');
            // 获取用户信息
            this.emit('login-progress', { step: 'fetching-user', message: '正在获取用户信息...' });
            await this.fetchUserInfo();
            // 获取用户配置
            this.emit('login-progress', { step: 'fetching-config', message: '正在同步用户配置...' });
            await this.fetchUserConfig();
            console.log(`✅ 登录成功: ${this.user?.username}`);
            this.emit('login-success', {
                user: this.user,
                message: `欢迎回来，${this.user?.username}！`
            });
            this.emit('authenticated', this.user);
            return true;
        }
        catch (error) {
            const friendlyMessage = this.getFriendlyErrorMessage(error.message);
            console.error('❌ 登录失败:', friendlyMessage);
            this.clearAuthData();
            this.emit('login-error', {
                error: friendlyMessage,
                technical: error.message
            });
            this.emit('authentication-error', error);
            return false;
        }
    }
    /**
     * 将技术错误转换为用户友好的消息
     */
    getFriendlyErrorMessage(technicalError) {
        if (technicalError.includes('服务器连接失败') || technicalError.includes('ECONNREFUSED')) {
            return '无法连接到服务器，请检查网络连接或稍后重试';
        }
        if (technicalError.includes('登录被取消')) {
            return '登录已取消';
        }
        if (technicalError.includes('token') || technicalError.includes('401')) {
            return '登录验证失败，请重新登录';
        }
        if (technicalError.includes('timeout') || technicalError.includes('超时')) {
            return '登录超时，请检查网络连接后重试';
        }
        if (technicalError.includes('用户信息') || technicalError.includes('配置')) {
            return '登录成功但获取用户信息失败，请重试';
        }
        // 默认友好消息
        return '登录失败，请稍后重试';
    }
    /**
     * 核心方法2：登出
     */
    async logout() {
        try {
            console.log('🚪 正在登出...');
            // 通知服务器登出（如果有token）
            if (this.token) {
                try {
                    await this.apiClient.post('/api/auth/logout');
                }
                catch (error) {
                    console.warn('服务器登出请求失败，但继续本地登出');
                }
            }
            // 清除本地数据
            this.clearAuthData();
            console.log('✅ 登出成功');
            this.emit('logged-out');
        }
        catch (error) {
            console.error('❌ 登出失败:', error);
        }
    }
    /**
     * 核心方法3：检查认证状态
     * 增强逻辑：验证token并确保用户信息和配置都已加载
     */
    async isAuthenticated() {
        console.log('🔐 开始检查认证状态...');
        // 没有token，肯定未认证
        if (!this.token) {
            console.log('❌ 没有token，未认证');
            return false;
        }
        console.log('✅ 找到token，开始验证...');
        // 有token，验证其有效性
        try {
            await this.verifyToken();
            console.log('✅ Token验证成功');
            // 确保用户信息已加载
            if (!this.user) {
                console.log('📋 Token有效但用户信息未加载，开始获取...');
                await this.fetchUserInfo();
            }
            // 确保用户配置已加载
            if (!this.userConfig) {
                console.log('📋 Token有效但用户配置未加载，开始获取...');
                await this.fetchUserConfig();
            }
            console.log('✅ 认证状态验证成功');
            return true;
        }
        catch (error) {
            console.error('❌ Token验证失败，需要重新登录:', error.message);
            this.clearAuthData();
            return false;
        }
    }
    /**
     * 获取当前用户
     */
    getCurrentUser() {
        return this.user;
    }
    /**
     * 获取用户配置
     */
    getUserConfig() {
        return this.userConfig;
    }
    /**
     * 刷新用户配置（带缓存机制）
     */
    async refreshUserConfig(forceRefresh = false) {
        if (!this.token || !this.user) {
            console.log('❌ 无法刷新配置：缺少token或用户信息');
            return null;
        }
        // 检查缓存是否有效（5分钟缓存）
        const now = Date.now();
        const cacheAge = now - this.configCacheExpiry;
        const cacheValid = cacheAge < 5 * 60 * 1000;
        console.log(`📋 配置缓存状态检查:`);
        console.log(`  - 强制刷新: ${forceRefresh}`);
        console.log(`  - 缓存年龄: ${Math.round(cacheAge / 1000)}秒`);
        console.log(`  - 缓存有效: ${cacheValid}`);
        console.log(`  - 当前有配置: ${!!this.userConfig}`);
        if (!forceRefresh && cacheValid && this.userConfig) {
            console.log('📋 使用缓存的用户配置');
            console.log(`📋 缓存配置详情: multipleChoiceModel=${this.userConfig.multipleChoiceModel}`);
            return this.userConfig;
        }
        console.log(`🔄 开始${forceRefresh ? '强制' : '自动'}刷新配置...`);
        try {
            await this.fetchUserConfig();
            this.configCacheExpiry = now;
            console.log('✅ 配置已刷新并缓存');
            console.log(`📋 新配置详情: multipleChoiceModel=${this.userConfig?.multipleChoiceModel}`);
            return this.userConfig;
        }
        catch (error) {
            console.error('❌ 刷新用户配置失败:', error);
            // 如果刷新失败但有缓存，返回缓存
            if (this.userConfig) {
                console.log('📋 刷新失败，使用缓存配置');
                return this.userConfig;
            }
            return null;
        }
    }
    /**
     * 检查服务器连接（兼容性方法）
     */
    async checkConnection() {
        return await this.checkServerConnection();
    }
    /**
     * 初始化认证（在应用启动时调用）
     */
    async initializeAuth() {
        console.log('🚀 初始化认证管理器...');
        try {
            // 1. 重新加载token（包括检查共享会话）
            this.loadStoredToken();
            // 2. 如果有token，验证其有效性
            if (this.token) {
                const isValid = await this.isAuthenticated();
                if (isValid) {
                    console.log('✅ 认证初始化成功');
                    return true;
                }
            }
            // 3. 如果本地没有有效token，尝试从后端检查共享会话
            console.log('🔍 本地无有效token，检查后端共享会话...');
            const hasWebSession = await this.checkWebSession();
            if (hasWebSession) {
                console.log('✅ 发现Web端会话，重新加载token');
                this.loadStoredToken();
                return await this.isAuthenticated();
            }
            console.log('❌ 没有找到有效的认证会话');
            return false;
        }
        catch (error) {
            console.error('❌ 认证初始化失败:', error);
            return false;
        }
    }
    /**
     * 检查Web端会话状态
     */
    async checkWebSession() {
        try {
            const response = await this.apiClient.get('/api/auth/web-session-status');
            if (response.data.hasActiveSession) {
                console.log('✅ 检测到活跃的Web会话:', response.data.user.username);
                return true;
            }
            else {
                console.log('❌ 没有活跃的Web会话');
                return false;
            }
        }
        catch (error) {
            console.error('❌ 检查Web会话失败:', error);
            return false;
        }
    }
    /**
     * 打开Web登录（兼容性方法）
     */
    async openWebLogin() {
        await this.login();
    }
    /**
     * 处理认证回调（兼容性方法）
     */
    handleAuthCallback(url) {
        // 这个方法在新的实现中不需要，因为我们在OAuth窗口中直接处理回调
        console.log('Auth callback received:', url);
        // 可以在这里添加额外的回调处理逻辑
    }
    // ==================== 私有方法 ====================
    /**
     * 加载本地存储的token
     */
    loadStoredToken() {
        try {
            console.log('📋 尝试加载本地token...');
            // 1. 首先尝试从配置文件加载token
            const config = ConfigHelper_1.configHelper.loadConfig();
            console.log('📋 配置文件内容:', JSON.stringify(config, null, 2));
            if (config.authToken) {
                this.token = config.authToken;
                this.setupApiClient();
                console.log('📋 已从配置文件加载token，长度:', this.token.length);
                console.log('📋 Token前缀:', this.token.substring(0, 20) + '...');
                return;
            }
            console.log('📋 配置文件中没有authToken，尝试检查共享会话文件...');
            // 2. 如果配置文件没有token，尝试从shared-session.json加载
            this.loadTokenFromSharedSession();
        }
        catch (error) {
            console.error('❌ 加载本地token失败:', error);
        }
    }
    /**
     * 从共享会话文件加载token
     */
    loadTokenFromSharedSession() {
        try {
            const fs = require('fs');
            const path = require('path');
            // shared-session.json应该在应用根目录
            const sharedSessionPath = path.join(process.cwd(), 'shared-session.json');
            console.log('🔍 检查共享会话文件:', sharedSessionPath);
            if (!fs.existsSync(sharedSessionPath)) {
                console.log('📋 未找到共享会话文件');
                return;
            }
            const sharedSessionData = fs.readFileSync(sharedSessionPath, 'utf8');
            const sharedSession = JSON.parse(sharedSessionData);
            console.log('📋 找到共享会话文件:', {
                user: sharedSession.user?.username,
                expiresAt: sharedSession.expiresAt
            });
            // 检查会话是否过期
            const now = new Date();
            const expiresAt = new Date(sharedSession.expiresAt);
            if (now > expiresAt) {
                console.log('⏰ 共享会话已过期，删除文件');
                fs.unlinkSync(sharedSessionPath);
                return;
            }
            // 如果会话有效，使用其中的token
            if (sharedSession.accessToken) {
                this.token = sharedSession.accessToken;
                this.user = sharedSession.user;
                this.setupApiClient();
                // 将token保存到本地配置以备下次使用
                ConfigHelper_1.configHelper.updateConfig({ authToken: this.token });
                console.log('✅ 从共享会话成功加载token');
                console.log('👤 用户:', this.user?.username);
                console.log('📋 Token长度:', this.token.length);
                console.log('📋 Token前缀:', this.token.substring(0, 20) + '...');
                // 触发认证成功事件
                this.emit('authenticated', this.user);
            }
            else {
                console.log('❌ 共享会话文件中没有accessToken');
            }
        }
        catch (error) {
            console.error('❌ 从共享会话加载token失败:', error);
        }
    }
    /**
     * 保存token到本地
     */
    saveToken(token) {
        try {
            console.log('💾 开始保存token到本地...');
            console.log('💾 Token长度:', token.length);
            console.log('💾 Token前缀:', token.substring(0, 20) + '...');
            ConfigHelper_1.configHelper.updateConfig({ authToken: token });
            // 验证保存是否成功
            const savedConfig = ConfigHelper_1.configHelper.loadConfig();
            if (savedConfig.authToken === token) {
                console.log('✅ Token保存成功并验证');
            }
            else {
                console.log('❌ Token保存验证失败');
                console.log('  - 期望:', token.substring(0, 20) + '...');
                console.log('  - 实际:', savedConfig.authToken ? savedConfig.authToken.substring(0, 20) + '...' : 'null');
            }
        }
        catch (error) {
            console.error('❌ 保存token失败:', error);
        }
    }
    /**
     * 设置API客户端的认证头
     */
    setupApiClient() {
        if (this.token) {
            this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        }
    }
    /**
     * 验证token有效性
     */
    async verifyToken() {
        if (!this.token) {
            throw new Error('没有token');
        }
        console.log('🔍 开始验证token...');
        console.log('🔑 Token长度:', this.token.length);
        console.log('🔑 Token前缀:', this.token.substring(0, 20) + '...');
        console.log('🌐 API地址:', `${this.apiBaseUrl}/api/auth/me`);
        console.log('📤 请求头:', this.apiClient.defaults.headers.common['Authorization']);
        try {
            const response = await this.apiClient.get('/api/auth/me');
            console.log('📥 响应状态:', response.status);
            console.log('📥 响应数据:', response.data);
            if (response.data && response.data.id) {
                this.user = response.data;
                console.log('✅ Token验证成功');
            }
            else {
                console.log('❌ 响应数据格式不正确:', response.data);
                throw new Error('Token验证失败 - 响应数据无效');
            }
        }
        catch (error) {
            console.log('❌ Token验证请求失败:');
            console.log('  - 错误类型:', error.constructor.name);
            console.log('  - 错误消息:', error.message);
            if (error.response) {
                console.log('  - 响应状态:', error.response.status);
                console.log('  - 响应数据:', error.response.data);
                // 如果是401错误，尝试刷新token
                if (error.response.status === 401) {
                    console.log('🔄 Token可能已过期，尝试刷新...');
                    const refreshResult = await this.tryRefreshToken();
                    if (refreshResult) {
                        console.log('✅ Token刷新成功，重新验证...');
                        // 递归调用验证，但限制递归次数
                        if (!this.verifyToken.name.includes('_retry')) {
                            const retryVerify = this.verifyToken.bind(this);
                            Object.defineProperty(retryVerify, 'name', { value: 'verifyToken_retry' });
                            return await retryVerify();
                        }
                    }
                }
            }
            else if (error.request) {
                console.log('  - 请求失败，无响应');
                console.log('  - 请求详情:', error.request);
            }
            throw new Error(`Token验证失败: ${error.message}`);
        }
    }
    /**
     * 尝试刷新Token
     */
    async tryRefreshToken() {
        try {
            // 从shared-session.json获取refreshToken
            const fs = require('fs');
            const path = require('path');
            const sharedSessionPath = path.join(process.cwd(), 'shared-session.json');
            if (!fs.existsSync(sharedSessionPath)) {
                console.log('❌ 没有找到共享会话文件，无法刷新token');
                return false;
            }
            const sharedSession = JSON.parse(fs.readFileSync(sharedSessionPath, 'utf8'));
            if (!sharedSession.refreshToken) {
                console.log('❌ 共享会话中没有refreshToken');
                return false;
            }
            console.log('🔄 使用refreshToken刷新访问token...');
            const response = await this.apiClient.post('/api/auth/refresh', {
                refreshToken: sharedSession.refreshToken
            });
            if (response.data && response.data.token) {
                console.log('✅ Token刷新成功');
                this.token = response.data.token;
                this.setupApiClient();
                this.saveToken(this.token);
                // 更新shared-session.json
                sharedSession.accessToken = this.token;
                fs.writeFileSync(sharedSessionPath, JSON.stringify(sharedSession, null, 2));
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('❌ Token刷新失败:', error);
            return false;
        }
    }
    /**
     * 获取用户信息
     */
    async fetchUserInfo() {
        const response = await this.apiClient.get('/api/auth/me');
        if (response.data && response.data.id) {
            this.user = response.data;
            console.log(`📋 获取用户信息: ${this.user.username}`);
        }
        else {
            throw new Error('获取用户信息失败');
        }
    }
    /**
     * 获取用户配置（修复版本 - 使用正确的API路由）
     */
    async fetchUserConfig() {
        if (!this.user) {
            throw new Error('没有用户信息');
        }
        console.log('📋 正在从后端获取用户配置...');
        console.log('🌐 请求URL:', `${this.apiBaseUrl}/api/config`);
        try {
            // 使用简化的配置API路由
            const response = await this.apiClient.get('/api/config');
            console.log('📥 后端配置响应状态:', response.status);
            console.log('📥 后端返回的原始配置数据:', JSON.stringify(response.data, null, 2));
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
                };
                console.log('✅ 用户配置构建成功:');
                console.log(`  - aiModel: ${this.userConfig.aiModel}`);
                console.log(`  - programmingModel: ${this.userConfig.programmingModel}`);
                console.log(`  - multipleChoiceModel: ${this.userConfig.multipleChoiceModel}`);
                console.log(`  - language: ${this.userConfig.language}`);
            }
            else {
                throw new Error('API返回空数据');
            }
        }
        catch (error) {
            console.error('❌ 获取用户配置失败:', error);
            // 如果配置获取失败，创建默认配置
            console.log('🔧 使用默认配置...');
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
            };
            console.log('✅ 已设置默认用户配置');
        }
    }
    /**
     * 打开OAuth登录窗口
     */
    async openOAuthWindow() {
        return new Promise((resolve, reject) => {
            // 创建登录窗口
            const authWindow = new electron_1.BrowserWindow({
                width: 500,
                height: 700,
                show: true,
                modal: false, // 改为非模态，避免阻塞主窗口
                alwaysOnTop: true, // 保持在最前面
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });
            // 登录URL
            const loginUrl = `${this.apiBaseUrl.replace('3001', '3000')}/login?mode=oauth&client=electron`;
            console.log('🌐 打开登录窗口:', loginUrl);
            authWindow.loadURL(loginUrl);
            // 设置超时处理（30秒）
            const timeoutId = setTimeout(() => {
                if (!authWindow.isDestroyed()) {
                    authWindow.close();
                    reject(new Error('登录超时，请重试'));
                }
            }, 30000);
            // 监听URL变化，捕获回调
            const handleNavigation = (event, navigationUrl) => {
                this.handleOAuthCallback(navigationUrl, authWindow, resolve, reject, timeoutId);
            };
            authWindow.webContents.on('will-navigate', handleNavigation);
            authWindow.webContents.on('did-navigate', handleNavigation);
            // 窗口关闭时取消登录
            authWindow.on('closed', () => {
                clearTimeout(timeoutId);
                if (!resolve.toString().includes('called')) { // 简单检查是否已经resolved
                    console.log('🚪 登录窗口被用户关闭');
                    this.emit('login-cancelled');
                    reject(new Error('登录被取消'));
                }
            });
            // 监听窗口焦点，确保用户能看到登录窗口
            authWindow.on('ready-to-show', () => {
                authWindow.show();
                authWindow.focus();
            });
        });
    }
    /**
     * 处理OAuth回调（内部方法）
     */
    handleOAuthCallback(url, authWindow, resolve, reject, timeoutId) {
        // 检查是否是成功回调
        if (url.includes('/auth/success')) {
            try {
                const urlObj = new URL(url);
                const token = urlObj.searchParams.get('token');
                if (token) {
                    console.log('✅ OAuth登录成功，获取到token');
                    if (timeoutId)
                        clearTimeout(timeoutId);
                    authWindow.close();
                    // 登录成功后，立即尝试刷新共享会话状态
                    setTimeout(() => {
                        console.log('🔄 登录成功，刷新共享会话状态...');
                        this.loadTokenFromSharedSession();
                    }, 1000);
                    resolve(token);
                }
                else {
                    throw new Error('回调URL中没有token');
                }
            }
            catch (error) {
                console.error('解析OAuth回调失败:', error);
                if (timeoutId)
                    clearTimeout(timeoutId);
                authWindow.close();
                reject(new Error('OAuth回调解析失败'));
            }
        }
        // 检查是否是失败回调
        else if (url.includes('/auth/error')) {
            console.error('OAuth登录失败');
            if (timeoutId)
                clearTimeout(timeoutId);
            authWindow.close();
            reject(new Error('OAuth登录失败'));
        }
    }
    /**
     * 检查服务器连接
     */
    async checkServerConnection() {
        try {
            const response = await axios_1.default.get(`${this.apiBaseUrl}/api/health`, { timeout: 5000 });
            return response.status === 200;
        }
        catch (error) {
            console.error('服务器连接检查失败:', error);
            return false;
        }
    }
    /**
     * 清除认证数据
     */
    clearAuthData() {
        this.token = null;
        this.user = null;
        this.userConfig = null;
        // 清除API客户端认证头
        delete this.apiClient.defaults.headers.common['Authorization'];
        // 清除本地存储
        ConfigHelper_1.configHelper.updateConfig({ authToken: null });
        console.log('🗑️ 认证数据已清除');
    }
}
exports.SimpleAuthManager = SimpleAuthManager;
// 导出单例
exports.simpleAuthManager = new SimpleAuthManager();
