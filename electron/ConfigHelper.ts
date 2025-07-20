// ConfigHelper.ts - 简化版本（仅用于本地存储）
import fs from "node:fs"
import path from "node:path"
import { app } from "electron"
import { EventEmitter } from "events"

interface Config {
  // 简化配置：只保留本地存储需要的字段
  authToken?: string | null; // 认证token
  clientSettings?: {
    // 客户端特定设置
    windowPosition?: { x: number; y: number };
    windowSize?: { width: number; height: number };
    lastLanguage?: string; // 最后使用的语言
  }
}

export class ConfigHelper extends EventEmitter {
  private configPath: string;
  private defaultConfig: Config = {
    authToken: null,
    clientSettings: {
      windowPosition: undefined,
      windowSize: undefined,
      lastLanguage: 'python'
    }
  };

  constructor() {
    super();
    // Use the app's user data directory to store the config
    try {
      this.configPath = path.join(app.getPath('userData'), 'config.json');
      console.log('Config path:', this.configPath);
    } catch (err) {
      console.warn('Could not access user data path, using fallback');
      this.configPath = path.join(process.cwd(), 'config.json');
    }
    
    // Ensure the initial config file exists
    this.ensureConfigExists();
  }

  /**
   * Ensure config file exists
   */
  private ensureConfigExists(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.saveConfig(this.defaultConfig);
      }
    } catch (error) {
      console.error('Error ensuring config exists:', error);
    }
  }

  /**
   * 加载配置（简化版）
   */
  public loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        return {
          ...this.defaultConfig,
          ...config
        };
      }
      
      // If no config exists, create a default one
      this.saveConfig(this.defaultConfig);
      return this.defaultConfig;
    } catch (err) {
      console.error("Error loading config:", err);
      return this.defaultConfig;
    }
  }

  /**
   * 保存配置
   */
  public saveConfig(config: Config): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log('Config saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<Config>): Config {
    try {
      const currentConfig = this.loadConfig();
      const newConfig = { ...currentConfig, ...updates };
      this.saveConfig(newConfig);
      this.emit('config-updated', newConfig);
      return newConfig;
    } catch (error) {
      console.error('Error updating config:', error);
      return this.defaultConfig;
    }
  }

  /**
   * 获取认证token
   */
  public getAuthToken(): string | null {
    const config = this.loadConfig();
    return config.authToken || null;
  }

  /**
   * 设置认证token
   */
  public setAuthToken(token: string | null): void {
    this.updateConfig({ authToken: token });
  }

  /**
   * 获取客户端设置
   */
  public getClientSettings(): any {
    const config = this.loadConfig();
    return config.clientSettings || {};
  }

  /**
   * 更新客户端设置
   */
  public updateClientSettings(settings: any): void {
    const config = this.loadConfig();
    this.updateConfig({
      clientSettings: {
        ...config.clientSettings,
        ...settings
      }
    });
  }
}

// Export a singleton instance
export const configHelper = new ConfigHelper();
