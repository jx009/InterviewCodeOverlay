const { PrismaClient } = require('@prisma/client');

class InviteConfigService {
  constructor() {
    this.prisma = new PrismaClient();
    this.configCache = new Map();
    this.cacheExpiry = 0;
    this.CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 获取配置值（带缓存）
   */
  async getConfig(configKey) {
    console.log('🔧 获取邀请配置:', configKey);

    // 检查缓存
    if (this.isCacheValid() && this.configCache.has(configKey)) {
      const cachedValue = this.configCache.get(configKey);
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
  async getAllConfigs() {
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
  async updateConfig(configKey, configValue) {
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
  async updateConfigs(configs) {
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
  async getRegisterReward(isTrafficAgent) {
    const configKey = 'REGISTER_REWARD';
    return await this.getConfig(configKey);
  }

  /**
   * 根据用户角色获取充值积分奖励比例
   */
  async getRechargeCommission(isTrafficAgent) {
    const configKey = 'RECHARGE_COMMISSION_RATE';
    return await this.getConfig(configKey);
  }

  /**
   * 获取流量手现金佣金比例
   */
  async getMoneyCommission() {
    return await this.getConfig('MONEY_COMMISSION_RATE');
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.configCache.clear();
    this.cacheExpiry = 0;
    console.log('🗑️ 邀请配置缓存已清除');
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid() {
    return Date.now() < this.cacheExpiry;
  }

  /**
   * 获取默认配置值
   */
  getDefaultValue(configKey) {
    const defaults = {
      'REGISTER_REWARD': 30,
      'RECHARGE_COMMISSION_RATE': 10,  // 10%
      'MONEY_COMMISSION_RATE': 20      // 20%
    };

    return defaults[configKey] || 0;
  }
}

module.exports = { InviteConfigService };