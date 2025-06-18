"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configHelper = exports.ConfigHelper = void 0;
// ConfigHelper.ts - 简化版本（仅用于本地存储）
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("electron");
const events_1 = require("events");
class ConfigHelper extends events_1.EventEmitter {
    constructor() {
        super();
        this.defaultConfig = {
            authToken: null,
            clientSettings: {
                windowPosition: undefined,
                windowSize: undefined,
                lastLanguage: 'python'
            }
        };
        // Use the app's user data directory to store the config
        try {
            this.configPath = node_path_1.default.join(electron_1.app.getPath('userData'), 'config.json');
            console.log('Config path:', this.configPath);
        }
        catch (err) {
            console.warn('Could not access user data path, using fallback');
            this.configPath = node_path_1.default.join(process.cwd(), 'config.json');
        }
        // Ensure the initial config file exists
        this.ensureConfigExists();
    }
    /**
     * Ensure config file exists
     */
    ensureConfigExists() {
        try {
            if (!node_fs_1.default.existsSync(this.configPath)) {
                this.saveConfig(this.defaultConfig);
            }
        }
        catch (error) {
            console.error('Error ensuring config exists:', error);
        }
    }
    /**
     * 加载配置（简化版）
     */
    loadConfig() {
        try {
            if (node_fs_1.default.existsSync(this.configPath)) {
                const configData = node_fs_1.default.readFileSync(this.configPath, 'utf8');
                const config = JSON.parse(configData);
                return {
                    ...this.defaultConfig,
                    ...config
                };
            }
            // If no config exists, create a default one
            this.saveConfig(this.defaultConfig);
            return this.defaultConfig;
        }
        catch (err) {
            console.error("Error loading config:", err);
            return this.defaultConfig;
        }
    }
    /**
     * 保存配置
     */
    saveConfig(config) {
        try {
            node_fs_1.default.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            console.log('Config saved successfully');
        }
        catch (error) {
            console.error('Error saving config:', error);
        }
    }
    /**
     * 更新配置
     */
    updateConfig(updates) {
        try {
            const currentConfig = this.loadConfig();
            const newConfig = { ...currentConfig, ...updates };
            this.saveConfig(newConfig);
            this.emit('config-updated', newConfig);
            return newConfig;
        }
        catch (error) {
            console.error('Error updating config:', error);
            return this.defaultConfig;
        }
    }
    /**
     * 获取认证token
     */
    getAuthToken() {
        const config = this.loadConfig();
        return config.authToken || null;
    }
    /**
     * 设置认证token
     */
    setAuthToken(token) {
        this.updateConfig({ authToken: token });
    }
    /**
     * 获取客户端设置
     */
    getClientSettings() {
        const config = this.loadConfig();
        return config.clientSettings || {};
    }
    /**
     * 更新客户端设置
     */
    updateClientSettings(settings) {
        const config = this.loadConfig();
        this.updateConfig({
            clientSettings: {
                ...config.clientSettings,
                ...settings
            }
        });
    }
}
exports.ConfigHelper = ConfigHelper;
// Export a singleton instance
exports.configHelper = new ConfigHelper();
