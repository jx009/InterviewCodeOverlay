// 微信支付配置验证工具
import { getWechatPayV2Config, validateWechatPayV2Config } from '../config/wechat-v2-config';

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config?: any;
}

/**
 * 验证微信支付配置
 */
export function validatePaymentConfig(): ConfigValidationResult {
  const result: ConfigValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    console.log('🔍 开始验证微信支付V2配置...');
    
    // 检查环境变量
    const envVars = [
      'WECHAT_PAY_V2_APP_ID',
      'WECHAT_PAY_V2_MCH_ID', 
      'WECHAT_PAY_V2_API_KEY',
      'WECHAT_PAY_V2_NOTIFY_URL'
    ];

    const missingVars = envVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      result.errors.push(`缺少必需的环境变量: ${missingVars.join(', ')}`);
    }

    // 检查备用环境变量
    const backupVars = [
      'WECHAT_PAY_APP_ID',
      'WECHAT_PAY_MCH_ID',
      'WECHAT_PAY_API_KEY',
      'WECHAT_PAY_NOTIFY_URL'
    ];

    const hasBackupVars = backupVars.some(varName => process.env[varName]);
    if (missingVars.length > 0 && hasBackupVars) {
      result.warnings.push('正在使用备用环境变量名，建议使用标准的 WECHAT_PAY_V2_ 前缀');
    }

    // 尝试加载配置
    const config = getWechatPayV2Config();
    result.config = {
      appId: config.appId ? `${config.appId.substring(0, 8)}...` : '未配置',
      mchId: config.mchId ? `${config.mchId.substring(0, 8)}...` : '未配置',
      apiKey: config.apiKey ? '已配置' : '未配置',
      notifyUrl: config.notifyUrl,
      signType: config.signType,
      environment: config.environment
    };

    // 验证配置格式
    const validation = validateWechatPayV2Config(config);
    if (!validation.valid) {
      result.errors.push(...validation.errors);
    }

    // 检查网络连接相关配置
    if (!process.env.BASE_URL && !config.notifyUrl) {
      result.errors.push('缺少 BASE_URL 环境变量，无法生成回调URL');
    }

    // 生产环境特殊检查
    if (config.environment === 'production') {
      if (!config.notifyUrl.startsWith('https://')) {
        result.errors.push('生产环境必须使用 HTTPS 回调URL');
      }
      
      if (config.signType === 'MD5') {
        result.warnings.push('生产环境建议使用 HMAC-SHA256 签名算法');
      }
    }

    result.valid = result.errors.length === 0;

  } catch (error: any) {
    result.valid = false;
    result.errors.push(`配置验证失败: ${error.message}`);
  }

  return result;
}

/**
 * 打印配置验证结果
 */
export function printValidationResult(result: ConfigValidationResult): void {
  console.log('\n' + '='.repeat(50));
  console.log('📋 微信支付配置验证结果');
  console.log('='.repeat(50));

  if (result.valid) {
    console.log('✅ 配置验证通过');
  } else {
    console.log('❌ 配置验证失败');
  }

  if (result.config) {
    console.log('\n📊 配置信息:');
    console.log(`   应用ID: ${result.config.appId}`);
    console.log(`   商户号: ${result.config.mchId}`);
    console.log(`   API密钥: ${result.config.apiKey}`);
    console.log(`   回调URL: ${result.config.notifyUrl}`);
    console.log(`   签名类型: ${result.config.signType}`);
    console.log(`   环境: ${result.config.environment}`);
  }

  if (result.errors.length > 0) {
    console.log('\n❌ 错误信息:');
    result.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️ 警告信息:');
    result.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }

  console.log('\n' + '='.repeat(50));

  if (!result.valid) {
    console.log('\n💡 修复建议:');
    console.log('1. 检查环境变量是否正确设置');
    console.log('2. 确认微信支付商户平台配置');
    console.log('3. 验证API密钥是否正确');
    console.log('4. 检查回调URL是否可访问');
    console.log('5. 确认应用ID和商户号是否匹配');
  }
}

/**
 * 生成环境变量配置示例
 */
export function generateEnvExample(): string {
  return `
# 微信支付V2配置示例
WECHAT_PAY_V2_APP_ID=wx1234567890abcdef
WECHAT_PAY_V2_MCH_ID=1234567890
WECHAT_PAY_V2_API_KEY=your_32_character_api_key_here
WECHAT_PAY_V2_NOTIFY_URL=https://yourdomain.com/api/payment/notify/wechat
WECHAT_PAY_V2_SIGN_TYPE=MD5
BASE_URL=https://yourdomain.com
NODE_ENV=development
`;
}

/**
 * 检查网络连接
 */
export async function checkNetworkConnection(): Promise<boolean> {
  try {
    const axios = require('axios');
    const response = await axios.get('https://api.mch.weixin.qq.com', {
      timeout: 5000,
      validateStatus: () => true  // 接受所有状态码
    });
    
    console.log('🌐 网络连接检查: 微信支付API可访问');
    return true;
  } catch (error: any) {
    console.error('❌ 网络连接检查失败:', error.message);
    return false;
  }
}

/**
 * 完整的配置检查
 */
export async function performFullConfigCheck(): Promise<ConfigValidationResult> {
  console.log('🔍 开始完整配置检查...\n');
  
  // 1. 验证配置
  const result = validatePaymentConfig();
  printValidationResult(result);
  
  // 2. 检查网络连接
  console.log('🌐 检查网络连接...');
  const networkOk = await checkNetworkConnection();
  if (!networkOk) {
    result.warnings.push('网络连接检查失败，请检查网络设置');
  }
  
  // 3. 生成配置示例
  if (!result.valid) {
    console.log('\n📝 环境变量配置示例:');
    console.log(generateEnvExample());
  }
  
  return result;
} 