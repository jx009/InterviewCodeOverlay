import fs from 'fs';
import path from 'path';

// 日志级别枚举
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// 日志记录接口
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  category?: string;
  userId?: number;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// 日志配置接口
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  maxFileSize: number;
  maxFiles: number;
  enableRotation: boolean;
  format: 'json' | 'text';
}

// 生产级别日志记录器
export class Logger {
  private config: LoggerConfig;
  private logDir: string;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      logDir: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      enableRotation: true,
      format: 'json',
      ...config
    };

    this.logDir = this.config.logDir;
    this.ensureLogDirectory();
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('创建日志目录失败:', error);
    }
  }

  /**
   * 获取日志文件路径
   */
  private getLogFilePath(level: string): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${level}-${date}.log`);
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify(entry) + '\n';
    } else {
      const { timestamp, level, category, message, userId, sessionId, ip } = entry;
      const prefix = `[${timestamp}] [${level}]`;
      const context = [
        category && `[${category}]`,
        userId && `[User:${userId}]`,
        sessionId && `[Session:${sessionId.substring(0, 8)}...]`,
        ip && `[IP:${ip}]`
      ].filter(Boolean).join(' ');
      
      return `${prefix} ${context} ${message}\n`;
    }
  }

  /**
   * 写入日志文件
   */
  private async writeToFile(level: string, entry: LogEntry): Promise<void> {
    if (!this.config.enableFile) return;

    try {
      const filePath = this.getLogFilePath(level);
      const logData = this.formatLogEntry(entry);

      // 检查文件大小并轮转
      if (this.config.enableRotation) {
        await this.rotateLogFileIfNeeded(filePath);
      }

      fs.appendFileSync(filePath, logData);
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  /**
   * 日志文件轮转
   */
  private async rotateLogFileIfNeeded(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) return;

      const stats = fs.statSync(filePath);
      if (stats.size < this.config.maxFileSize) return;

      // 轮转日志文件
      const dir = path.dirname(filePath);
      const filename = path.basename(filePath, '.log');
      
      // 删除最老的日志文件
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const oldFile = path.join(dir, `${filename}.${i}.log`);
        const newFile = path.join(dir, `${filename}.${i + 1}.log`);
        
        if (fs.existsSync(oldFile)) {
          if (i === this.config.maxFiles - 1) {
            fs.unlinkSync(oldFile);
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // 轮转当前文件
      const firstRotatedFile = path.join(dir, `${filename}.1.log`);
      fs.renameSync(filePath, firstRotatedFile);

    } catch (error) {
      console.error('日志文件轮转失败:', error);
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(level: string, message: string, metadata?: any): void {
    if (!this.config.enableConsole) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;

    switch (level) {
      case 'DEBUG':
        console.debug(`🔍 ${prefix}`, message, metadata || '');
        break;
      case 'INFO':
        console.log(`ℹ️ ${prefix}`, message, metadata || '');
        break;
      case 'WARN':
        console.warn(`⚠️ ${prefix}`, message, metadata || '');
        break;
      case 'ERROR':
        console.error(`❌ ${prefix}`, message, metadata || '');
        break;
      case 'FATAL':
        console.error(`💀 ${prefix}`, message, metadata || '');
        break;
      default:
        console.log(`${prefix}`, message, metadata || '');
    }
  }

  /**
   * 核心日志记录方法
   */
  private async log(
    level: LogLevel,
    levelName: string,
    message: string,
    context?: {
      category?: string;
      userId?: number;
      sessionId?: string;
      ip?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
      error?: Error;
    }
  ): Promise<void> {
    // 检查日志级别
    if (level < this.config.level) return;

    const timestamp = new Date().toISOString();
    
    const logEntry: LogEntry = {
      timestamp,
      level: levelName,
      message,
      ...context
    };

    // 处理错误对象
    if (context?.error) {
      logEntry.error = {
        name: context.error.name,
        message: context.error.message,
        stack: context.error.stack
      };
    }

    // 输出到控制台
    this.logToConsole(levelName, message, context?.metadata);

    // 写入文件
    await this.writeToFile(levelName, logEntry);
  }

  /**
   * Debug级别日志
   */
  async debug(message: string, context?: {
    category?: string;
    userId?: number;
    sessionId?: string;
    ip?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  /**
   * Info级别日志
   */
  async info(message: string, context?: {
    category?: string;
    userId?: number;
    sessionId?: string;
    ip?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log(LogLevel.INFO, 'INFO', message, context);
  }

  /**
   * Warning级别日志
   */
  async warn(message: string, context?: {
    category?: string;
    userId?: number;
    sessionId?: string;
    ip?: string;
    metadata?: Record<string, any>;
    error?: Error;
  }): Promise<void> {
    await this.log(LogLevel.WARN, 'WARN', message, context);
  }

  /**
   * Error级别日志
   */
  async error(message: string, context?: {
    category?: string;
    userId?: number;
    sessionId?: string;
    ip?: string;
    metadata?: Record<string, any>;
    error?: Error;
  }): Promise<void> {
    await this.log(LogLevel.ERROR, 'ERROR', message, context);
  }

  /**
   * Fatal级别日志
   */
  async fatal(message: string, context?: {
    category?: string;
    userId?: number;
    sessionId?: string;
    ip?: string;
    metadata?: Record<string, any>;
    error?: Error;
  }): Promise<void> {
    await this.log(LogLevel.FATAL, 'FATAL', message, context);
  }

  /**
   * 支付相关日志
   */
  async payment(message: string, context?: {
    userId?: number;
    orderNo?: string;
    amount?: number;
    paymentMethod?: string;
    status?: string;
    metadata?: Record<string, any>;
    error?: Error;
  }): Promise<void> {
    await this.log(LogLevel.INFO, 'PAYMENT', message, {
      category: 'payment',
      ...context
    });
  }

  /**
   * 认证相关日志
   */
  async auth(message: string, context?: {
    userId?: number;
    email?: string;
    action?: string;
    ip?: string;
    userAgent?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
    error?: Error;
  }): Promise<void> {
    await this.log(LogLevel.INFO, 'AUTH', message, {
      category: 'auth',
      ...context
    });
  }

  /**
   * API访问日志
   */
  async api(message: string, context?: {
    method?: string;
    url?: string;
    statusCode?: number;
    responseTime?: number;
    userId?: number;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log(LogLevel.INFO, 'API', message, {
      category: 'api',
      ...context
    });
  }

  /**
   * 数据库操作日志
   */
  async database(message: string, context?: {
    operation?: string;
    table?: string;
    duration?: number;
    userId?: number;
    metadata?: Record<string, any>;
    error?: Error;
  }): Promise<void> {
    await this.log(LogLevel.DEBUG, 'DATABASE', message, {
      category: 'database',
      ...context
    });
  }

  /**
   * 安全相关日志
   */
  async security(message: string, context?: {
    level?: 'low' | 'medium' | 'high' | 'critical';
    userId?: number;
    ip?: string;
    userAgent?: string;
    action?: string;
    metadata?: Record<string, any>;
    error?: Error;
  }): Promise<void> {
    const logLevel = context?.level === 'critical' ? LogLevel.FATAL :
                    context?.level === 'high' ? LogLevel.ERROR :
                    context?.level === 'medium' ? LogLevel.WARN :
                    LogLevel.INFO;

    await this.log(logLevel, 'SECURITY', message, {
      category: 'security',
      ...context
    });
  }
}

// 默认日志记录器实例
const defaultConfig: Partial<LoggerConfig> = {
  level: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG :
         process.env.LOG_LEVEL === 'warn' ? LogLevel.WARN :
         process.env.LOG_LEVEL === 'error' ? LogLevel.ERROR :
         LogLevel.INFO,
  enableConsole: process.env.NODE_ENV !== 'production',
  enableFile: true,
  format: process.env.LOG_FORMAT === 'text' ? 'text' : 'json'
};

export const logger = new Logger(defaultConfig);

// 导出工厂函数
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
} 