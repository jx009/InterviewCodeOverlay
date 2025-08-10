import { PrismaClient } from '@prisma/client';
import os from 'os';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  database: {
    connected: boolean;
    connectionCount?: number;
  };
  application: {
    uptime: number;
    version: string;
    environment: string;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'warning' | 'critical';
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    email: 'up' | 'down';
  };
  metrics: SystemMetrics;
  issues: string[];
}

export class MonitoringService {
  private static instance: MonitoringService;
  private metricsHistory: SystemMetrics[] = [];
  private readonly maxHistorySize = 100; // 保留最近100条记录

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * 获取当前系统指标
   */
  async getCurrentMetrics(): Promise<SystemMetrics> {
    const cpuUsage = await this.getCpuUsage();
    const memoryInfo = this.getMemoryInfo();
    const diskInfo = await this.getDiskInfo();
    const dbStatus = await this.getDatabaseStatus();

    const metrics: SystemMetrics = {
      timestamp: new Date(),
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg()
      },
      memory: memoryInfo,
      disk: diskInfo,
      database: dbStatus,
      application: {
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // 添加到历史记录
    this.addToHistory(metrics);

    return metrics;
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<HealthCheck> {
    const metrics = await this.getCurrentMetrics();
    const issues: string[] = [];
    
    // 检查数据库连接
    const dbStatus = await this.checkDatabaseHealth();
    
    // 检查Redis连接
    const redisStatus = await this.checkRedisHealth();
    
    // 检查邮件服务
    const emailStatus = await this.checkEmailHealth();

    // 分析系统指标，识别问题
    if (metrics.memory.usage > 0.9) {
      issues.push('内存使用率超过90%');
    }
    
    if (metrics.cpu.usage > 0.8) {
      issues.push('CPU使用率超过80%');
    }
    
    if (metrics.disk.usage > 0.9) {
      issues.push('磁盘使用率超过90%');
    }

    if (!dbStatus) {
      issues.push('数据库连接异常');
    }

    if (!redisStatus) {
      issues.push('Redis连接异常');
    }

    // 确定整体健康状态
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.some(issue => 
        issue.includes('数据库') || issue.includes('Redis')
      ) ? 'critical' : 'warning';
    }

    return {
      status,
      services: {
        database: dbStatus ? 'up' : 'down',
        redis: redisStatus ? 'up' : 'down',
        email: emailStatus ? 'up' : 'down'
      },
      metrics,
      issues
    };
  }

  /**
   * 获取指标历史记录
   */
  getMetricsHistory(limit: number = 50): SystemMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * 获取系统使用统计
   */
  async getUsageStatistics() {
    try {
      // 获取用户活动统计（简化查询，避免表名和字段名问题）
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({
        where: { isActive: true }
      });
      
      // 获取最近一周注册的用户
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const newUsersThisWeek = await prisma.user.count({
        where: {
          createdAt: {
            gte: oneWeekAgo
          }
        }
      });

      return {
        users: { 
          totalUsers, 
          activeUsers, 
          newUsersThisWeek 
        },
        sessions: { activeSessions: 0 }, // 暂时设为0，因为没有sessions表
        timestamp: new Date()
      };
    } catch (error) {
      console.error('获取使用统计失败:', error);
      return {
        users: { totalUsers: 0, activeUsers: 0, newUsersThisWeek: 0 },
        sessions: { activeSessions: 0 },
        timestamp: new Date()
      };
    }
  }

  /**
   * 记录错误日志
   */
  async logError(error: Error, context?: any) {
    const errorLog = {
      timestamp: new Date(),
      message: error.message,
      stack: error.stack,
      context: context ? JSON.stringify(context) : null
    };

    console.error('系统错误:', errorLog);
    
    // 这里可以扩展为写入数据库或外部日志系统
    // await this.saveErrorToDatabase(errorLog);
  }

  /**
   * 获取CPU使用率
   */
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();

      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = process.hrtime(startTime);
        
        const totalTime = currentTime[0] * 1000000 + currentTime[1] / 1000;
        const totalUsage = currentUsage.user + currentUsage.system;
        
        const cpuPercent = (totalUsage / totalTime) * 100;
        resolve(Math.min(cpuPercent, 100));
      }, 100);
    });
  }

  /**
   * 获取内存信息
   */
  private getMemoryInfo() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      usage: usedMemory / totalMemory
    };
  }

  /**
   * 获取磁盘信息
   */
  private async getDiskInfo() {
    try {
      const stats = await fs.promises.statfs(process.cwd());
      const total = stats.blocks * stats.bsize;
      const free = stats.bavail * stats.bsize;
      const used = total - free;

      return {
        total,
        used,
        free,
        usage: used / total
      };
    } catch (error) {
      // 如果无法获取磁盘信息，返回默认值
      return {
        total: 0,
        used: 0,
        free: 0,
        usage: 0
      };
    }
  }

  /**
   * 检查数据库状态
   */
  private async getDatabaseStatus() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { connected: true };
    } catch (error) {
      return { connected: false };
    }
  }

  /**
   * 检查数据库健康状态
   */
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查Redis健康状态
   */
  private async checkRedisHealth(): Promise<boolean> {
    try {
      // 这里应该检查Redis连接
      // 由于我们没有Redis客户端实例，暂时返回true
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查邮件服务健康状态
   */
  private async checkEmailHealth(): Promise<boolean> {
    try {
      // 这里应该检查邮件服务配置
      // 暂时返回true
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(metrics: SystemMetrics) {
    this.metricsHistory.push(metrics);
    
    // 保持历史记录在限制范围内
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }
} 