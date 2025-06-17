"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webAuthManager = exports.WebAuthManager = void 0;
const electron_1 = require("electron");
const events_1 = require("events");
const axios_1 = __importDefault(require("axios"));
const ConfigHelper_1 = require("./ConfigHelper");
class WebAuthManager extends events_1.EventEmitter {
    constructor(apiBaseUrl = 'http://localhost:3001') {
        super();
        this.tokens = null;
        this.user = null;
        this.userConfig = null;
        this.authWindow = null;
        this.apiBaseUrl = apiBaseUrl;
        this.setupApiClient();
        this.loadStoredTokens();
    }
    /**
     * 设置API客户端
     */
    setupApiClient() {
        this.apiClient = axios_1.default.create({
            baseURL: `${this.apiBaseUrl}/api`,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // 请求拦截器 - 添加JWT token
        this.apiClient.interceptors.request.use((config) => {
            if (this.tokens?.accessToken) {
                config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;
            }
            return config;
        }, (error) => Promise.reject(error));
        // 响应拦截器 - 处理token刷新
        this.apiClient.interceptors.response.use((response) => response, async (error) => {
            const originalRequest = error.config;
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                try {
                    if (this.tokens?.refreshToken) {
                        await this.refreshAccessToken();
                        originalRequest.headers.Authorization = `Bearer ${this.tokens?.accessToken}`;
                        return this.apiClient(originalRequest);
                    }
                }
                catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    this.clearAuthentication();
                    this.emit('auth-required');
                }
            }
            return Promise.reject(error);
        });
    }
    /**
     * 从本地存储加载token
     */
    loadStoredTokens() {
        try {
            const config = ConfigHelper_1.configHelper.loadConfig();
            if (config.webAuthTokens) {
                this.tokens = config.webAuthTokens;
                this.verifyTokens();
            }
        }
        catch (error) {
            console.error('Failed to load stored tokens:', error);
        }
    }
    /**
     * 保存token到本地存储
     */
    saveTokens(tokens) {
        try {
            this.tokens = tokens;
            ConfigHelper_1.configHelper.updateConfig({ webAuthTokens: tokens });
        }
        catch (error) {
            console.error('Failed to save tokens:', error);
        }
    }
    /**
     * 验证token有效性
     */
    async verifyTokens() {
        if (!this.tokens)
            return false;
        try {
            const response = await this.apiClient.get('/auth/me');
            this.user = response.data;
            this.emit('authenticated', this.user);
            return true;
        }
        catch (error) {
            console.error('Token verification failed:', error);
            this.clearAuthentication();
            return false;
        }
    }
    /**
     * 刷新访问token
     */
    async refreshAccessToken() {
        if (!this.tokens?.refreshToken) {
            throw new Error('No refresh token available');
        }
        try {
            const response = await axios_1.default.post(`${this.apiBaseUrl}/api/auth/refresh`, {
                refreshToken: this.tokens.refreshToken,
            });
            const { accessToken } = response.data;
            this.tokens.accessToken = accessToken;
            this.saveTokens(this.tokens);
            console.log('Token refreshed successfully');
        }
        catch (error) {
            console.error('Token refresh failed:', error);
            throw error;
        }
    }
    /**
     * 清除认证信息
     */
    clearAuthentication() {
        this.tokens = null;
        this.user = null;
        this.userConfig = null;
        ConfigHelper_1.configHelper.updateConfig({ webAuthTokens: null });
        this.emit('authentication-cleared');
    }
    /**
     * 检查用户是否已认证
     */
    async isAuthenticated() {
        if (!this.tokens)
            return false;
        return await this.verifyTokens();
    }
    /**
     * 获取当前用户信息
     */
    getCurrentUser() {
        return this.user;
    }
    /**
     * 打开Web登录窗口
     */
    async openWebLogin() {
        try {
            // 检查Web服务器是否运行
            await this.checkWebServerStatus();
            // 直接打开系统默认浏览器
            const loginUrl = `${this.apiBaseUrl.replace('3001', '3000')}/login?client=electron`;
            await electron_1.shell.openExternal(loginUrl);
            console.log('Opened web login in system browser');
            this.emit('web-login-opened');
        }
        catch (error) {
            console.error('Failed to open web login:', error);
            this.emit('web-login-error', error);
        }
    }
    /**
     * 检查Web服务器状态
     */
    async checkWebServerStatus() {
        try {
            const response = await axios_1.default.get(`${this.apiBaseUrl}/api/health`, {
                timeout: 5000,
            });
            if (response.data.status !== 'ok') {
                throw new Error('Web server is not responding correctly');
            }
        }
        catch (error) {
            console.error('Web server check failed:', error);
            throw new Error('Web服务器未运行，请先启动Web配置中心');
        }
    }
    /**
     * 处理认证回调
     */
    async handleAuthCallback(callbackData) {
        try {
            // 解析回调数据
            const url = new URL(callbackData);
            const params = new URLSearchParams(url.search);
            const accessToken = params.get('accessToken');
            const refreshToken = params.get('refreshToken');
            if (!accessToken || !refreshToken) {
                throw new Error('Invalid callback data');
            }
            // 保存tokens
            this.saveTokens({ accessToken, refreshToken });
            // 验证并获取用户信息
            await this.verifyTokens();
            // 同步配置
            await this.syncUserConfig();
            console.log('Authentication callback handled successfully');
            this.emit('authentication-success', this.user);
        }
        catch (error) {
            console.error('Failed to handle auth callback:', error);
            this.emit('authentication-error', error);
        }
    }
    /**
     * 同步用户配置
     */
    async syncUserConfig() {
        if (!this.tokens) {
            throw new Error('Not authenticated');
        }
        try {
            const response = await this.apiClient.get('/config');
            this.userConfig = response.data;
            // 将Web配置同步到本地配置
            this.syncConfigToLocal(this.userConfig);
            this.emit('config-synced', this.userConfig);
            return this.userConfig;
        }
        catch (error) {
            console.error('Failed to sync user config:', error);
            this.emit('config-sync-error', error);
            return null;
        }
    }
    /**
     * 将Web配置同步到本地ConfigHelper
     */
    syncConfigToLocal(webConfig) {
        try {
            // 映射Web配置到本地配置格式
            const localConfig = {
                // AI模型映射
                apiProvider: this.mapAiModelToProvider(webConfig.aiModel),
                extractionModel: webConfig.aiModel,
                solutionModel: webConfig.aiModel,
                debuggingModel: webConfig.aiModel,
                // 其他配置
                language: webConfig.language,
                opacity: webConfig.display.opacity,
                showCopyButton: true,
                // 新增Web相关配置
                webConfig: webConfig,
            };
            ConfigHelper_1.configHelper.updateConfig(localConfig);
            console.log('Local config updated from web:', localConfig);
        }
        catch (error) {
            console.error('Failed to sync config to local:', error);
        }
    }
    /**
     * 映射AI模型到提供商
     */
    mapAiModelToProvider(aiModel) {
        if (aiModel.includes('claude'))
            return 'anthropic';
        if (aiModel.includes('gemini'))
            return 'gemini';
        if (aiModel.includes('gpt') || aiModel.includes('o3'))
            return 'openai';
        return 'openai'; // 默认
    }
    /**
     * 更新Web配置
     */
    async updateWebConfig(configUpdates) {
        if (!this.tokens) {
            throw new Error('Not authenticated');
        }
        try {
            const response = await this.apiClient.put('/config', configUpdates);
            this.userConfig = response.data;
            // 同步到本地
            this.syncConfigToLocal(this.userConfig);
            this.emit('config-updated', this.userConfig);
            return this.userConfig;
        }
        catch (error) {
            console.error('Failed to update web config:', error);
            this.emit('config-update-error', error);
            return null;
        }
    }
    /**
     * 获取可用的AI模型
     */
    async getAvailableAIModels() {
        try {
            const response = await this.apiClient.get('/config/models');
            return response.data;
        }
        catch (error) {
            console.error('Failed to get AI models:', error);
            return [];
        }
    }
    /**
     * 获取可用的编程语言
     */
    async getAvailableLanguages() {
        try {
            const response = await this.apiClient.get('/config/languages');
            return response.data;
        }
        catch (error) {
            console.error('Failed to get languages:', error);
            return [];
        }
    }
    /**
     * 登出
     */
    async logout() {
        try {
            if (this.tokens) {
                await this.apiClient.post('/auth/logout');
            }
        }
        catch (error) {
            console.error('Logout API call failed:', error);
        }
        finally {
            this.clearAuthentication();
            this.emit('logged-out');
        }
    }
    /**
     * 获取当前用户配置
     */
    getUserConfig() {
        return this.userConfig;
    }
    /**
     * 检查Web服务器连接状态
     */
    async checkConnection() {
        try {
            await this.checkWebServerStatus();
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.WebAuthManager = WebAuthManager;
// 导出单例实例
exports.webAuthManager = new WebAuthManager();
