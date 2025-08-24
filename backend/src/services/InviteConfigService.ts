import { PrismaClient } from '@prisma/client';

export interface InviteConfigData {
  id: number;
  configKey: string;
  configValue: number;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class InviteConfigService {
  private prisma: PrismaClient;
  private configCache: Map<string, number> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * 获取配置值（带缓存）
   */
  async getConfig(configKey: string): Promise<number> {
    console.log('🔧 获取邀请配置:', configKey);

    // 检查缓存
    if (this.isCacheValid() && this.configCache.has(configKey)) {
      const cachedValue = this.configCache.get(configKey)!;
      console.log('📦 使用缓存配置:', { configKey, value: cachedValue });
      return cachedValue;
    }

    // 从数据库获取
    const config = await this.prisma.inviteConfig.findUnique({
      where: { 
        configKey,
        isActive: true 
      }
    });

    if (!config) {
      console.warn('⚠️ 配置不存在，使用默认值:', configKey);
      return this.getDefaultValue(configKey);
    }

    const value = Number(config.configValue);
    this.configCache.set(configKey, value);
    this.cacheExpiry = Date.now() + this.CACHE_TTL;

    console.log('✅ 配置获取成功:', { configKey, value });
    return value;
  }

  /**
   * 获取所有配置
   */
  async getAllConfigs(): Promise<InviteConfigData[]> {
    console.log('🔧 获取所有邀请配置');

    const configs = await this.prisma.inviteConfig.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' }
    });

    return configs.map(config => ({
      ...config,
      configValue: Number(config.configValue)
    }));
  }

  /**
   * 更新配置值（管理员专用）
   */
  async updateConfig(configKey: string, configValue: number): Promise<void> {
    console.log('🔧 更新邀请配置:', { configKey, configValue });

    await this.prisma.inviteConfig.upsert({
      where: { configKey },
      update: { 
        configValue,
        updatedAt: new Date()
      },
      create: {
        configKey,
        configValue,
        description: `动态配置 - ${configKey}`,
        isActive: true
      }
    });

    // 清除缓存
    this.configCache.delete(configKey);
    console.log('✅ 配置更新成功:', { configKey, configValue });
  }

  /**
   * 批量更新配置
   */
  async updateConfigs(configs: { configKey: string; configValue: number }[]): Promise<void> {
    console.log('🔧 批量更新邀请配置:', configs.length);

    for (const config of configs) {
      await this.updateConfig(config.configKey, config.configValue);
    }

    // 清除所有缓存
    this.clearCache();
    console.log('✅ 批量配置更新成功');
  }

  /**
   * 根据用户角色获取注册奖励配置
   */
  async getRegisterReward(isTrafficAgent: boolean): Promise<number> {
    const configKey = isTrafficAgent ? 'traffic_register_reward' : 'default_register_reward';
    return await this.getConfig(configKey);
  }

  /**
   * 根据用户角色获取充值积分奖励比例
   */
  async getRechargeCommission(isTrafficAgent: boolean): Promise<number> {
    const configKey = isTrafficAgent ? 'traffic_recharge_commission' : 'default_recharge_commission';
    return await this.getConfig(configKey);
  }

  /**
   * 获取流量手现金佣金比例
   */
  async getMoneyCommission(): Promise<number> {
    return await this.getConfig('traffic_money_commission');
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.configCache.clear();
    this.cacheExpiry = 0;
    console.log('🗑️ 邀请配置缓存已清除');
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    return Date.now() < this.cacheExpiry;
  }

  /**
   * 获取默认配置值
   */
  private getDefaultValue(configKey: string): number {
    const defaults: { [key: string]: number } = {
      'default_register_reward': 30,
      'default_recharge_commission': 0.10,
      'traffic_register_reward': 30,
      'traffic_recharge_commission': 0.10,
      'traffic_money_commission': 0.20
    };

    return defaults[configKey] || 0;
  }
}