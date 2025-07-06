// 支付通用配置
import { WechatPayConfig, AlipayConfig } from '../../types/payment';

// 支付业务配置
export const PAYMENT_CONFIG = {
  // 订单配置
  ORDER: {
    EXPIRE_MINUTES: parseInt(process.env.PAYMENT_ORDER_EXPIRE_MINUTES || '15'), // 订单过期时间(分钟)
    PREFIX: 'PAY', // 订单号前缀
    MIN_AMOUNT: parseFloat(process.env.PAYMENT_MIN_AMOUNT || '1'), // 最小支付金额(元)
    MAX_AMOUNT: parseFloat(process.env.PAYMENT_MAX_AMOUNT || '1000'), // 最大支付金额(元)
  },

  // 积分配置
  POINTS: {
    MIN_RECHARGE: parseInt(process.env.PAYMENT_MIN_POINTS || '10'), // 最小充值积分
    MAX_RECHARGE: parseInt(process.env.PAYMENT_MAX_POINTS || '10000'), // 最大充值积分
    EXCHANGE_RATE: parseFloat(process.env.PAYMENT_POINTS_RATE || '10'), // 积分兑换比例 (1元=10积分)
  },

  // 回调配置
  NOTIFY: {
    MAX_RETRY: parseInt(process.env.PAYMENT_NOTIFY_MAX_RETRY || '3'), // 最大重试次数
    RETRY_INTERVALS: [1, 3, 5], // 重试间隔(分钟)
    TIMEOUT: parseInt(process.env.PAYMENT_NOTIFY_TIMEOUT || '30'), // 回调超时时间(秒)
  },

  // 环境配置
  ENVIRONMENT: (process.env.NODE_ENV === 'production') ? 'production' : 'sandbox',

  // 支持的支付方式
  SUPPORTED_METHODS: ['WECHAT_PAY'] as const,

  // 默认套餐配置
  DEFAULT_PACKAGES: [
    {
      name: '基础套餐',
      amount: 10,
      points: 100,
      bonusPoints: 0,
      description: '适合轻度使用',
      sortOrder: 1,
      tags: '["新手推荐"]'
    },
    {
      name: '标准套餐',
      amount: 30,
      points: 300,
      bonusPoints: 30,
      description: '性价比之选',
      sortOrder: 2,
      tags: '["热门"]',
      isRecommended: true
    },
    {
      name: '高级套餐',
      amount: 50,
      points: 500,
      bonusPoints: 100,
      description: '适合重度使用',
      sortOrder: 3,
      tags: '["超值"]'
    },
    {
      name: '旗舰套餐',
      amount: 100,
      points: 1000,
      bonusPoints: 300,
      description: '最优惠的选择',
      sortOrder: 4,
      tags: '["最划算"]'
    }
  ]
};

// 获取微信支付配置
export function getWechatPayConfig(): WechatPayConfig {
  const requiredEnvs = [
    'WECHAT_PAY_APP_ID',
    'WECHAT_PAY_MCH_ID',
    'WECHAT_PAY_API_KEY',
    'WECHAT_PAY_API_V3_KEY',
    'WECHAT_PAY_CERT_PATH',
    'WECHAT_PAY_KEY_PATH',
    'WECHAT_PAY_SERIAL_NO'
  ];

  // 在开发环境下，如果缺少微信支付配置，返回默认配置
  if (process.env.NODE_ENV === 'development') {
    for (const env of requiredEnvs) {
      if (!process.env[env]) {
        console.warn(`⚠️  开发环境缺少微信支付配置 ${env}，使用默认配置`);
        return {
          appId: process.env.WECHAT_PAY_APP_ID || 'dev_app_id',
          mchId: process.env.WECHAT_PAY_MCH_ID || 'dev_mch_id',
          apiKey: process.env.WECHAT_PAY_API_KEY || 'dev_api_key',
          apiV3Key: process.env.WECHAT_PAY_API_V3_KEY || 'dev_api_v3_key',
          certPath: process.env.WECHAT_PAY_CERT_PATH || '/dev/null',
          keyPath: process.env.WECHAT_PAY_KEY_PATH || '/dev/null',
          serialNo: process.env.WECHAT_PAY_SERIAL_NO || 'dev_serial_no',
          notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || `${process.env.BASE_URL || 'http://localhost:3001'}/api/payment/notify/wechat`,
          environment: PAYMENT_CONFIG.ENVIRONMENT as 'sandbox' | 'production'
        };
      }
    }
  }

  // 生产环境仍然要求所有配置
  for (const env of requiredEnvs) {
    if (!process.env[env]) {
      throw new Error(`Missing required environment variable: ${env}`);
    }
  }

  return {
    appId: process.env.WECHAT_PAY_APP_ID!,
    mchId: process.env.WECHAT_PAY_MCH_ID!,
    apiKey: process.env.WECHAT_PAY_API_KEY!,
    apiV3Key: process.env.WECHAT_PAY_API_V3_KEY!,
    certPath: process.env.WECHAT_PAY_CERT_PATH!,
    keyPath: process.env.WECHAT_PAY_KEY_PATH!,
    serialNo: process.env.WECHAT_PAY_SERIAL_NO!,
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || `${process.env.BASE_URL}/api/payment/notify/wechat`,
    environment: PAYMENT_CONFIG.ENVIRONMENT as 'sandbox' | 'production'
  };
}

// 获取支付宝配置
export function getAlipayConfig(): AlipayConfig {
  const requiredEnvs = [
    'ALIPAY_APP_ID',
    'ALIPAY_PRIVATE_KEY',
    'ALIPAY_PUBLIC_KEY'
  ];

  for (const env of requiredEnvs) {
    if (!process.env[env]) {
      throw new Error(`Missing required environment variable: ${env}`);
    }
  }

  return {
    appId: process.env.ALIPAY_APP_ID!,
    privateKey: process.env.ALIPAY_PRIVATE_KEY!,
    publicKey: process.env.ALIPAY_PUBLIC_KEY!,
    notifyUrl: process.env.ALIPAY_NOTIFY_URL || `${process.env.BASE_URL}/api/payment/notify/alipay`,
    environment: PAYMENT_CONFIG.ENVIRONMENT as 'sandbox' | 'production'
  };
}

// 生成订单号
export function generateOrderNo(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${PAYMENT_CONFIG.ORDER.PREFIX}${timestamp}${random}`;
}

// 生成商户订单号
export function generateOutTradeNo(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${PAYMENT_CONFIG.ORDER.PREFIX}_${timestamp}_${random}`;
}

// 计算订单过期时间
export function calculateExpireTime(): Date {
  const now = new Date();
  return new Date(now.getTime() + PAYMENT_CONFIG.ORDER.EXPIRE_MINUTES * 60 * 1000);
}

// 验证支付金额
export function validateAmount(amount: number): { valid: boolean; message?: string } {
  if (amount < PAYMENT_CONFIG.ORDER.MIN_AMOUNT) {
    return {
      valid: false,
      message: `支付金额不能少于${PAYMENT_CONFIG.ORDER.MIN_AMOUNT}元`
    };
  }

  if (amount > PAYMENT_CONFIG.ORDER.MAX_AMOUNT) {
    return {
      valid: false,
      message: `支付金额不能超过${PAYMENT_CONFIG.ORDER.MAX_AMOUNT}元`
    };
  }

  return { valid: true };
}

// 计算积分数量
export function calculatePoints(amount: number): number {
  return Math.floor(amount * PAYMENT_CONFIG.POINTS.EXCHANGE_RATE);
}

// 验证积分数量
export function validatePoints(points: number): { valid: boolean; message?: string } {
  if (points < PAYMENT_CONFIG.POINTS.MIN_RECHARGE) {
    return {
      valid: false,
      message: `充值积分不能少于${PAYMENT_CONFIG.POINTS.MIN_RECHARGE}`
    };
  }

  if (points > PAYMENT_CONFIG.POINTS.MAX_RECHARGE) {
    return {
      valid: false,
      message: `充值积分不能超过${PAYMENT_CONFIG.POINTS.MAX_RECHARGE}`
    };
  }

  return { valid: true };
} 