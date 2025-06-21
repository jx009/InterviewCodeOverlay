import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 配置接口定义
interface MySQLConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  charset: string;
  collation: string;
  timezone: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  reconnect: boolean;
  ssl: boolean;
}

interface RedisConfig {
  host: string;
  port: number;
  password: string;
  database: number;
  keyPrefix: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
}

interface SessionConfig {
  secret: string;
  expiresIn: number;
  refreshExpiresIn: number;
  cookieName: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: string;
  verification: {
    codeLength: number;
    expiresMinutes: number;
    template: string;
  };
}

interface SecurityConfig {
  bcryptRounds: number;
  jwtSecret: string;
  jwtRefreshSecret: string;
  passwordMinLength: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
}

interface AppConfig {
  name: string;
  version: string;
  environment: string;
  debug: boolean;
  logLevel: string;
}

export interface DatabaseConfig {
  mysql: MySQLConfig;
  redis: RedisConfig;
  session: SessionConfig;
  email: EmailConfig;
  security: SecurityConfig;
  app: AppConfig;
}

class ConfigLoader {
  private config: DatabaseConfig | null = null;
  private configPath: string;

  constructor() {
    this.configPath = this.findConfigFile();
  }

  private findConfigFile(): string {
    const possiblePaths = [
      path.join(process.cwd(), 'config', 'database-config.json'),
      path.join(process.cwd(), 'backend', 'config', 'database-config.json'),
      path.join(__dirname, '..', '..', 'config', 'database-config.json'),
      path.join(process.cwd(), 'database-config.json'),
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        console.log(`✅ 找到配置文件: ${configPath}`);
        return configPath;
      }
    }

    // 如果找不到配置文件，尝试创建一个默认的
    const defaultPath = path.join(process.cwd(), 'config', 'database-config.json');
    const examplePath = path.join(process.cwd(), 'config', 'database-config.example.json');
    
    if (fs.existsSync(examplePath)) {
      const exampleContent = fs.readFileSync(examplePath, 'utf8');
      const configDir = path.dirname(defaultPath);
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(defaultPath, exampleContent);
      console.log(`✅ 已创建默认配置文件: ${defaultPath}`);
      console.log(`⚠️ 请修改配置文件中的数据库连接信息`);
      return defaultPath;
    }

    throw new Error('未找到数据库配置文件，请创建 config/database-config.json');
  }

  public loadConfig(): DatabaseConfig {
    if (this.config) {
      return this.config;
    }

    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      const rawConfig = JSON.parse(configContent);
      
      // 使用环境变量覆盖配置（如果存在）
      this.config = this.mergeWithEnvironment(rawConfig);
      
      // 验证配置
      this.validateConfig(this.config);
      
      console.log(`✅ 配置加载成功 (环境: ${this.config.app.environment})`);
      return this.config;
    } catch (error) {
      console.error('❌ 配置加载失败:', error);
      throw error;
    }
  }

  private mergeWithEnvironment(config: any): DatabaseConfig {
    // 环境变量优先级高于配置文件
    if (process.env.DATABASE_URL) {
      const dbUrl = this.parseDatabaseUrl(process.env.DATABASE_URL);
      config.mysql = { ...config.mysql, ...dbUrl };
    }

    if (process.env.REDIS_URL) {
      const redisUrl = this.parseRedisUrl(process.env.REDIS_URL);
      config.redis = { ...config.redis, ...redisUrl };
    }

    // 其他环境变量覆盖
    const envMappings = {
      'JWT_SECRET': 'security.jwtSecret',
      'JWT_REFRESH_SECRET': 'security.jwtRefreshSecret',
      'SMTP_HOST': 'email.smtp.host',
      'SMTP_PORT': 'email.smtp.port',
      'SMTP_USER': 'email.smtp.auth.user',
      'SMTP_PASS': 'email.smtp.auth.pass',
      'EMAIL_FROM': 'email.from',
      'NODE_ENV': 'app.environment'
    };

    for (const [envKey, configPath] of Object.entries(envMappings)) {
      const envValue = process.env[envKey];
      if (envValue) {
        this.setNestedProperty(config, configPath, envValue);
      }
    }

    return config;
  }

  private parseDatabaseUrl(url: string): Partial<MySQLConfig> {
    const matches = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!matches) {
      throw new Error('Invalid DATABASE_URL format');
    }

    return {
      username: matches[1],
      password: matches[2],
      host: matches[3],
      port: parseInt(matches[4]),
      database: matches[5]
    };
  }

  private parseRedisUrl(url: string): Partial<RedisConfig> {
    const matches = url.match(/redis:\/\/(?:([^:]*):([^@]*)@)?([^:]+):(\d+)(?:\/(\d+))?/);
    if (!matches) {
      throw new Error('Invalid REDIS_URL format');
    }

    return {
      host: matches[3],
      port: parseInt(matches[4]),
      password: matches[2] || '',
      database: matches[5] ? parseInt(matches[5]) : 0
    };
  }

  private setNestedProperty(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private validateConfig(config: DatabaseConfig): void {
    // 验证必要的配置项
    const requiredFields = [
      'mysql.host',
      'mysql.username',
      'mysql.password',
      'mysql.database',
      'redis.host',
      'security.jwtSecret'
    ];

    for (const field of requiredFields) {
      const value = this.getNestedProperty(config, field);
      if (!value) {
        throw new Error(`缺少必要的配置项: ${field}`);
      }
    }

    // 验证端口号
    if (config.mysql.port < 1 || config.mysql.port > 65535) {
      throw new Error('MySQL端口号无效');
    }

    if (config.redis.port < 1 || config.redis.port > 65535) {
      throw new Error('Redis端口号无效');
    }

    console.log('✅ 配置验证通过');
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  public reloadConfig(): DatabaseConfig {
    this.config = null;
    return this.loadConfig();
  }

  public getConfig(): DatabaseConfig | null {
    return this.config;
  }

  public getMySQLConnectionString(): string {
    const config = this.loadConfig();
    return `mysql://${config.mysql.username}:${config.mysql.password}@${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`;
  }

  public getRedisConnectionString(): string {
    const config = this.loadConfig();
    const auth = config.redis.password ? `:${config.redis.password}@` : '';
    const db = config.redis.database !== 0 ? `/${config.redis.database}` : '';
    return `redis://${auth}${config.redis.host}:${config.redis.port}${db}`;
  }
}

// 创建单例实例
const configLoader = new ConfigLoader();

// 导出配置加载器和配置对象
export default configLoader;
export const dbConfig = configLoader.loadConfig(); 