#!/usr/bin/env node

/**
 * 微信支付问题调试脚本
 * 用于详细诊断微信支付通信问题
 */

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const xml2js = require('xml2js');

// 调试配置
const DEBUG_CONFIG = {
  useMinimalParams: true,  // 使用最少的参数进行测试
  logRawResponse: true,    // 记录原始响应
  validateXML: true,       // 验证XML格式
  testAmount: 1           // 测试金额（分）
};

/**
 * 生成随机字符串
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成MD5签名
 */
function generateMD5Sign(params, apiKey) {
  console.log('🔐 开始生成MD5签名...');
  
  // 1. 过滤空值和sign字段
  const filteredParams = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '' && key !== 'sign') {
      filteredParams[key] = String(params[key]);
    }
  });
  
  console.log('📋 过滤后的参数:', filteredParams);
  
  // 2. 按键名排序
  const sortedKeys = Object.keys(filteredParams).sort();
  
  // 3. 拼接字符串
  const stringA = sortedKeys.map(key => `${key}=${filteredParams[key]}`).join('&');
  const stringSignTemp = `${stringA}&key=${apiKey}`;
  
  console.log('🔗 签名字符串:', stringSignTemp);
  
  // 4. 生成MD5签名
  const sign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
  
  console.log('✅ 生成的签名:', sign);
  
  return sign;
}

/**
 * 对象转XML
 */
function objectToXml(obj) {
  console.log('📄 转换对象到XML:', obj);
  
  const xml = ['<xml>'];
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== null && value !== undefined) {
      xml.push(`<${key}>${value}</${key}>`);
    }
  });
  xml.push('</xml>');
  
  const xmlString = xml.join('');
  console.log('📄 生成的XML:', xmlString);
  
  return xmlString;
}

/**
 * XML转对象
 */
function xmlToObject(xmlString) {
  console.log('🔍 解析XML响应...');
  console.log('📄 原始XML:', xmlString);
  
  try {
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
      trim: true
    });
    
    let result;
    parser.parseString(xmlString, (err, parsed) => {
      if (err) {
        console.error('❌ XML解析失败:', err);
        throw err;
      }
      result = parsed.xml || parsed;
    });
    
    console.log('✅ 解析结果:', JSON.stringify(result, null, 2));
    return result;
    
  } catch (error) {
    console.error('❌ XML解析异常:', error);
    return {
      return_code: 'FAIL',
      return_msg: `XML解析失败: ${error.message}`,
      raw_response: xmlString
    };
  }
}

/**
 * 检查环境变量
 */
function checkEnvironment() {
  console.log('🔍 检查环境变量...\n');
  
  const requiredVars = [
    'WECHAT_PAY_V2_APP_ID',
    'WECHAT_PAY_V2_MCH_ID',
    'WECHAT_PAY_V2_API_KEY'
  ];
  
  const backupVars = [
    'WECHAT_PAY_APP_ID',
    'WECHAT_PAY_MCH_ID',
    'WECHAT_PAY_API_KEY'
  ];
  
  const config = {};
  
  // 检查主要变量
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      const key = varName.replace('WECHAT_PAY_V2_', '').toLowerCase();
      config[key] = process.env[varName];
      console.log(`✅ ${varName}: 已配置`);
    }
  });
  
  // 检查备用变量
  backupVars.forEach(varName => {
    const key = varName.replace('WECHAT_PAY_', '').toLowerCase();
    if (!config[key] && process.env[varName]) {
      config[key] = process.env[varName];
      console.log(`✅ ${varName}: 已配置 (备用)`);
    }
  });
  
  // 验证配置
  const missing = [];
  if (!config.app_id) missing.push('APP_ID');
  if (!config.mch_id) missing.push('MCH_ID');
  if (!config.api_key) missing.push('API_KEY');
  
  if (missing.length > 0) {
    console.error('❌ 缺少必需的环境变量:', missing.join(', '));
    return null;
  }
  
  console.log('\n✅ 环境变量检查通过');
  console.log('📊 配置信息:', {
    app_id: config.app_id ? `${config.app_id.substring(0, 8)}...` : '未配置',
    mch_id: config.mch_id ? `${config.mch_id.substring(0, 8)}...` : '未配置',
    api_key: config.api_key ? '已配置' : '未配置'
  });
  
  return config;
}

/**
 * 测试微信支付统一下单API
 */
async function testUnifiedOrder(config) {
  console.log('\n🚀 测试微信支付统一下单API...\n');
  
  // 构建请求参数
  const params = {
    appid: config.app_id,
    mch_id: config.mch_id,
    nonce_str: generateNonceStr(),
    body: '测试商品-调试',
    out_trade_no: `DEBUG_${Date.now()}`,
    total_fee: DEBUG_CONFIG.testAmount,
    spbill_create_ip: '127.0.0.1',
    notify_url: 'https://example.com/notify',
    trade_type: 'NATIVE'
  };
  
  console.log('📋 请求参数:', params);
  
  // 生成签名
  const sign = generateMD5Sign(params, config.api_key);
  const finalParams = { ...params, sign };
  
  // 转换为XML
  const xmlData = objectToXml(finalParams);
  
  // 发送请求
  const url = 'https://api.mch.weixin.qq.com/pay/unifiedorder';
  console.log('\n🌐 发送请求到:', url);
  
  try {
    const response = await axios.post(url, xmlData, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'WeChat Pay Debug Tool v1.0'
      },
      timeout: 30000
    });
    
    console.log('📥 响应状态:', response.status);
    console.log('📥 响应头:', response.headers);
    
    if (DEBUG_CONFIG.logRawResponse) {
      console.log('📥 原始响应数据:', response.data);
    }
    
    // 解析响应
    const responseData = xmlToObject(response.data);
    
    // 分析结果
    console.log('\n📊 响应分析:');
    console.log('- return_code:', responseData.return_code);
    console.log('- return_msg:', responseData.return_msg);
    console.log('- result_code:', responseData.result_code);
    console.log('- err_code:', responseData.err_code);
    console.log('- err_code_des:', responseData.err_code_des);
    
    if (responseData.return_code === 'SUCCESS') {
      if (responseData.result_code === 'SUCCESS') {
        console.log('\n🎉 请求成功!');
        console.log('📱 支付二维码:', responseData.code_url ? '已生成' : '未生成');
      } else {
        console.log('\n⚠️ 业务失败:');
        console.log('错误代码:', responseData.err_code);
        console.log('错误描述:', responseData.err_code_des);
      }
    } else {
      console.log('\n❌ 通信失败:');
      console.log('错误信息:', responseData.return_msg);
      
      // 提供调试建议
      provideTroubleshootingAdvice(responseData);
    }
    
    return responseData;
    
  } catch (error) {
    console.error('\n❌ 请求异常:', error.message);
    
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('网络错误: 没有收到响应');
    } else {
      console.error('请求配置错误:', error.message);
    }
    
    return null;
  }
}

/**
 * 提供故障排除建议
 */
function provideTroubleshootingAdvice(responseData) {
  console.log('\n💡 故障排除建议:');
  
  if (!responseData.return_msg) {
    console.log('1. 响应格式异常，可能是网络问题或服务器错误');
    console.log('2. 检查网络连接和DNS设置');
    console.log('3. 确认微信支付API地址是否正确');
    return;
  }
  
  const msg = responseData.return_msg.toLowerCase();
  
  if (msg.includes('xml') || msg.includes('format')) {
    console.log('1. XML格式错误，检查参数是否完整');
    console.log('2. 确认所有必需参数都已设置');
    console.log('3. 检查参数值的格式是否正确');
  } else if (msg.includes('sign')) {
    console.log('1. 签名错误，检查API密钥是否正确');
    console.log('2. 确认签名算法实现是否正确');
    console.log('3. 检查参数顺序和编码格式');
  } else if (msg.includes('appid') || msg.includes('mchid')) {
    console.log('1. 应用ID或商户号错误');
    console.log('2. 确认在微信商户平台中配置正确');
    console.log('3. 检查应用是否已绑定商户号');
  } else {
    console.log('1. 检查所有配置参数');
    console.log('2. 参考微信支付官方文档');
    console.log('3. 联系微信支付技术支持');
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🔧 微信支付问题调试工具');
  console.log('=' * 50);
  console.log('📅 调试时间:', new Date().toLocaleString());
  console.log('🔧 调试配置:', DEBUG_CONFIG);
  console.log('=' * 50);
  
  try {
    // 1. 检查环境变量
    const config = checkEnvironment();
    if (!config) {
      console.log('\n❌ 环境变量检查失败，请先配置必需的环境变量');
      process.exit(1);
    }
    
    // 2. 测试统一下单API
    const result = await testUnifiedOrder(config);
    
    // 3. 显示最终结果
    console.log('\n' + '=' * 50);
    if (result && result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      console.log('🎉 调试完成: 微信支付API工作正常!');
    } else {
      console.log('⚠️ 调试完成: 发现问题，请根据上述建议进行修复');
    }
    console.log('=' * 50);
    
  } catch (error) {
    console.error('❌ 调试过程中发生异常:', error);
    process.exit(1);
  }
}

// 运行调试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main }; 