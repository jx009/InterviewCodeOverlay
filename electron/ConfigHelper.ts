// ConfigHelper.ts
import fs from "node:fs"
import path from "node:path"
import { app } from "electron"
import { EventEmitter } from "events"

interface Config {
  apiProvider: "openai" | "gemini" | "anthropic";  // API provider selection
  extractionModel: string;
  solutionModel: string;
  debuggingModel: string;
  language: string;
  opacity: number;
  showCopyButton?: boolean; // 是否显示复制按钮
}

export class ConfigHelper extends EventEmitter {
  private configPath: string;
  private defaultConfig: Config = {
    apiProvider: "openai", // 默认使用OpenAI
    extractionModel: "gpt-4o", // 默认使用GPT-4o
    solutionModel: "gpt-4o",
    debuggingModel: "gpt-4o",
    language: "python",
    opacity: 1.0,
    showCopyButton: true // 默认显示复制按钮
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
   * Validate and sanitize model selection to ensure only allowed models are used
   */
  private sanitizeModelSelection(model: string, provider: "openai" | "gemini" | "anthropic"): string {
    if (provider === "openai") {
      // OpenAI models supported by ismaque.org
      const allowedModels = ['o4-mini-high', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'];
      if (!allowedModels.includes(model)) {
        console.warn(`Invalid OpenAI model specified: ${model}. Using default model: gpt-4o`);
        return 'gpt-4o';
      }
      return model;
    } else if (provider === "gemini")  {
      // Gemini models supported by ismaque.org
      const allowedModels = ['gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-pro'];
      if (!allowedModels.includes(model)) {
        console.warn(`Invalid Gemini model specified: ${model}. Using default model: gemini-2.0-flash`);
        return 'gemini-2.0-flash';
      }
      return model;
    }  else if (provider === "anthropic") {
      // Claude models supported by ismaque.org
      const allowedModels = ['claude-3-7-sonnet-thinking', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'];
      if (!allowedModels.includes(model)) {
        console.warn(`Invalid Anthropic model specified: ${model}. Using default model: claude-3-7-sonnet-20250219`);
        return 'claude-3-7-sonnet-thinking';
      }
      return model;
    }
    // Default fallback
    return model;
  }

  public loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        
        // Ensure apiProvider is a valid value
        if (config.apiProvider !== "openai" && config.apiProvider !== "gemini"  && config.apiProvider !== "anthropic") {
          config.apiProvider = "openai"; // 默认使用OpenAI
        }
        
        // Sanitize model selections to ensure only allowed models are used
        if (config.extractionModel) {
          config.extractionModel = this.sanitizeModelSelection(config.extractionModel, config.apiProvider);
        }
        if (config.solutionModel) {
          config.solutionModel = this.sanitizeModelSelection(config.solutionModel, config.apiProvider);
        }
        if (config.debuggingModel) {
          config.debuggingModel = this.sanitizeModelSelection(config.debuggingModel, config.apiProvider);
        }
        
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
   * Save configuration to disk
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
   * Update specific configuration values
   */
  public updateConfig(updates: Partial<Config>): Config {
    try {
      const currentConfig = this.loadConfig();
      let provider = updates.apiProvider || currentConfig.apiProvider;
      
      // If provider is changing, reset models to the default for that provider
      if (updates.apiProvider && updates.apiProvider !== currentConfig.apiProvider) {
        if (updates.apiProvider === "openai") {
          updates.extractionModel = "gpt-4o";
          updates.solutionModel = "gpt-4o";
          updates.debuggingModel = "gpt-4o";
        } else if (updates.apiProvider === "anthropic") {
          updates.extractionModel = "claude-3-7-sonnet-20250219";
          updates.solutionModel = "claude-3-7-sonnet-20250219";
          updates.debuggingModel = "claude-3-7-sonnet-20250219";
        } else {
          updates.extractionModel = "gemini-2.0-flash";
          updates.solutionModel = "gemini-2.0-flash";
          updates.debuggingModel = "gemini-2.0-flash";
        }
      }
      
      // Sanitize model selections in the updates
      if (updates.extractionModel) {
        updates.extractionModel = this.sanitizeModelSelection(updates.extractionModel, provider);
      }
      if (updates.solutionModel) {
        updates.solutionModel = this.sanitizeModelSelection(updates.solutionModel, provider);
      }
      if (updates.debuggingModel) {
        updates.debuggingModel = this.sanitizeModelSelection(updates.debuggingModel, provider);
      }
      
      const newConfig = { ...currentConfig, ...updates };
      this.saveConfig(newConfig);
      
      // Only emit update event for changes other than opacity
      // This prevents re-initializing the AI client when only opacity changes
      if (updates.apiProvider !== undefined || 
          updates.extractionModel !== undefined || updates.solutionModel !== undefined || 
          updates.debuggingModel !== undefined || updates.language !== undefined) {
        this.emit('config-updated', newConfig);
      }
      
      return newConfig;
    } catch (error) {
      console.error('Error updating config:', error);
      return this.defaultConfig;
    }
  }
  
  /**
   * Get the API provider
   */
  public getApiProvider(): "openai" | "gemini" | "anthropic" {
    const config = this.loadConfig();
    return config.apiProvider;
  }
  
  /**
   * Set the API provider
   */
  public setApiProvider(provider: "openai" | "gemini" | "anthropic"): void {
    this.updateConfig({ apiProvider: provider });
  }
  
  /**
   * Get the preferred programming language
   */
  public getLanguage(): string {
    const config = this.loadConfig();
    return config.language || "python";
  }
  
  /**
   * Set the programming language
   */
  public setLanguage(language: string): void {
    this.updateConfig({ language });
  }
  
  /**
   * Get available models for the current provider
   */
  public getAvailableModels(provider: "openai" | "gemini" | "anthropic"): string[] {
    switch (provider) {
      case "openai":
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'];
      case "gemini":
        return ['gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-pro'];
      case "anthropic":
        return ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'];
      default:
        return ['gpt-4o'];
    }
  }

  /**
   * Get the stored opacity value
   */
  public getOpacity(): number {
    const config = this.loadConfig();
    return config.opacity !== undefined ? config.opacity : 1.0;
  }

  /**
   * Set the window opacity value
   */
  public setOpacity(opacity: number): void {
    // Ensure opacity is between 0.1 and 1.0
    const validOpacity = Math.min(1.0, Math.max(0.1, opacity));
    this.updateConfig({ opacity: validOpacity });
  }  
}

// Export a singleton instance
export const configHelper = new ConfigHelper();
