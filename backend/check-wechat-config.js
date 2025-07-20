#!/usr/bin/env node

/**
 * 微信支付配置检查脚本
 * 用于验证微信支付配置是否正确设置
 */

const fs = require('fs');
const path = require('path');

// 检查环境变量
function checkEnvironmentVariables() {
  console.log('🔍 检查环境变量配置...\n');
  
  const requiredVars = [
    'WECHAT_PAY_V2_APP_ID',
    'WECHAT_PAY_V2_MCH_ID',
    'WECHAT_PAY_V2_API_KEY',
    'WECHAT_PAY_V2_NOTIFY_URL'
  ];
  
  const backupVars = [
    'WECHAT_PAY_APP_ID',
    'WECHAT_PAY_MCH_ID',
    'WECHAT_PAY_API_KEY',
    'WECHAT_PAY_NOTIFY_URL'
  ];
  
  const missingVars = [];
  const foundVars = [];
  
  // 检查主要环境变量
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      foundVars.push(varName);
    } else {
      missingVars.push(varName);
    }
  });
  
  // 如果主要变量缺失，检查备用变量
  if (missingVars.length > 0) {
    console.log('⚠️ 主要环境变量缺失，检查备用变量...\n');
    
    backupVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`✅ 找到备用变量: ${varName}`);
      }
    });
  }
  
  // 显示结果
  if (foundVars.length > 0) {
    console.log('✅ 已配置的环境变量:');
    foundVars.forEach(varName => {
      const value = process.env[varName];
      const maskedValue = varName.includes('API_KEY') ? 
        '***' : 
        (value.length > 10 ? `${value.substring(0, 8)}...` : value);
      console.log(`   ${varName}: ${maskedValue}`);
    });
    console.log();
  }
  
  if (missingVars.length > 0) {
    console.log('❌ 缺失的环境变量:');
    missingVars.forEach(varName => {
      console.log(`   ${varName}`);
    });
    console.log();
  }
  
  return missingVars.length === 0;
}

// 验证配置格式
function validateConfigFormat() {
  console.log('🔍 验证配置格式...\n');
  
  const appId = process.env.WECHAT_PAY_V2_APP_ID || process.env.WECHAT_PAY_APP_ID;
  const mchId = process.env.WECHAT_PAY_V2_MCH_ID || process.env.WECHAT_PAY_MCH_ID;
  const apiKey = process.env.WECHAT_PAY_V2_API_KEY || process.env.WECHAT_PAY_API_KEY;
  const notifyUrl = process.env.WECHAT_PAY_V2_NOTIFY_URL || process.env.WECHAT_PAY_NOTIFY_URL;
  
  let valid = true;
  
  // 验证 APP ID
  if (appId) {
    if (!/^wx[a-zA-Z0-9]{16}$/.test(appId)) {
      console.log('❌ APP ID 格式错误: 应为wx开头的18位字符');
      valid = false;
    } else {
      console.log('✅ APP ID 格式正确');
    }
  }
  
  // 验证商户号
  if (mchId) {
    if (!/^\d{8,10}$/.test(mchId)) {
      console.log('❌ 商户号格式错误: 应为8-10位数字');
      valid = false;
    } else {
      console.log('✅ 商户号格式正确');
    }
  }
  
  // 验证 API Key
  if (apiKey) {
    if (apiKey.length !== 32) {
      console.log('❌ API Key 长度错误: 应为32位字符');
      valid = false;
    } else {
      console.log('✅ API Key 长度正确');
    }
  }
  
  // 验证回调URL
  if (notifyUrl) {
    if (!/^https?:\/\//.test(notifyUrl)) {
      console.log('❌ 回调URL格式错误: 应为完整的HTTP/HTTPS URL');
      valid = false;
    } else {
      console.log('✅ 回调URL格式正确');
    }
  }
  
  console.log();
  return valid;
}

// 检查网络连接
async function checkNetworkConnection() {
  console.log('🌐 检查网络连接...\n');
  
  try {
    const https = require('https');
    const url = require('url');
    
    return new Promise((resolve) => {
      const parsed = url.parse('https://api.mch.weixin.qq.com');
      
      const req = https.request({
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.path,
        method: 'GET',
        timeout: 5000
      }, (res) => {
        console.log('✅ 网络连接正常: 微信支付API可访问');
        resolve(true);
      });
      
      req.on('error', (error) => {
        console.log('❌ 网络连接失败:', error.message);
        resolve(false);
      });
      
      req.on('timeout', () => {
        console.log('❌ 网络连接超时');
        resolve(false);
      });
      
      req.end();
    });
    
  } catch (error) {
    console.log('❌ 网络连接检查异常:', error.message);
    return false;
  }
}

// 生成配置示例
function generateConfigExample() {
  console.log('📝 环境变量配置示例:\n');
  
  const example = `
# 微信支付V2配置
WECHAT_PAY_V2_APP_ID=wx1234567890abcdef
WECHAT_PAY_V2_MCH_ID=1234567890
WECHAT_PAY_V2_API_KEY=your_32_character_api_key_here
WECHAT_PAY_V2_NOTIFY_URL=https://yourdomain.com/api/payment/notify/wechat
WECHAT_PAY_V2_SIGN_TYPE=MD5

# 基础配置
BASE_URL=https://yourdomain.com
NODE_ENV=development
`;
  
  console.log(example);
  
  // 检查是否存在.env文件
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    console.log('💡 提示: 已找到.env文件，请检查其中的配置是否正确');
  } else {
    console.log('💡 提示: 未找到.env文件，请创建.env文件并添加上述配置');
  }
}

// 主函数
async function main() {
  console.log('🚀 微信支付配置检查工具\n');
  console.log('=' * 50);
  
  // 1. 检查环境变量
  const envOk = checkEnvironmentVariables();
  
  // 2. 验证配置格式
  const formatOk = validateConfigFormat();
  
  // 3. 检查网络连接
  const networkOk = await checkNetworkConnection();
  
  // 4. 显示结果
  console.log('=' * 50);
  console.log('📋 检查结果汇总:\n');
  
  console.log(`环境变量配置: ${envOk ? '✅ 通过' : '❌ 失败'}`);
  console.log(`配置格式验证: ${formatOk ? '✅ 通过' : '❌ 失败'}`);
  console.log(`网络连接检查: ${networkOk ? '✅ 通过' : '❌ 失败'}`);
  
  const allOk = envOk && formatOk && networkOk;
  
  if (allOk) {
    console.log('\n🎉 所有检查都通过！微信支付配置正确。');
  } else {
    console.log('\n⚠️ 存在配置问题，请根据上述提示进行修复。');
    
    // 5. 生成配置示例
    generateConfigExample();
    
    console.log('\n💡 修复建议:');
    console.log('1. 检查.env文件是否存在并正确配置');
    console.log('2. 确认微信支付商户平台设置');
    console.log('3. 验证API密钥是否正确');
    console.log('4. 检查网络连接和防火墙设置');
    console.log('5. 确认域名和回调URL设置');
  }
  
  console.log('\n' + '=' * 50);
  
  // 返回退出码
  process.exit(allOk ? 0 : 1);
}

// 运行检查
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkEnvironmentVariables, validateConfigFormat, checkNetworkConnection }; 