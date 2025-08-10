#!/usr/bin/env node
/**
 * 微信支付订单状态查询测试脚本
 * 用于验证订单 RECHARGE_ORDER17522530522711786 的真实状态
 * 
 * 使用说明：
 * node test-wechat-query.js
 */

const crypto = require('crypto');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 微信支付V2配置
const config = {
  appId: process.env.WECHAT_PAY_APP_ID || '',
  mchId: process.env.WECHAT_PAY_MCH_ID || '',
  apiKey: process.env.WECHAT_PAY_API_KEY || '',
  signType: process.env.WECHAT_PAY_SIGN_TYPE || 'MD5'
};

// 微信支付V2 API地址
const API_URLS = {
  ORDER_QUERY: 'https://api.mch.weixin.qq.com/pay/orderquery'
};

// 订单号
const ORDER_NO = 'RECHARGE_ORDER17522530522711786';

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
 * 生成签名
 */
function generateSign(params, apiKey, signType = 'MD5') {
  try {
    console.log('🔐 开始生成签名...');
    
    // 1. 过滤掉sign字段和空值
    const filteredParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (key === 'sign' || 
          value === null || 
          value === undefined || 
          value === '' ||
          (typeof value === 'string' && value.trim() === '')) {
        continue;
      }
      filteredParams[key] = typeof value === 'string' ? value : String(value);
    }
    
    // 2. 按字典序排序
    const sortedKeys = Object.keys(filteredParams).sort();
    
    // 3. 拼接成key=value&key=value格式
    const stringA = sortedKeys
      .map(key => `${key}=${filteredParams[key]}`)
      .join('&');
    
    // 4. 添加API密钥
    const stringSignTemp = `${stringA}&key=${apiKey}`;
    
    console.log('🔍 签名字符串:', stringSignTemp);
    
    // 5. 根据签名类型生成签名
    let signature;
    if (signType === 'MD5') {
      signature = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex');
    } else {
      signature = crypto.createHmac('sha256', apiKey).update(stringSignTemp, 'utf8').digest('hex');
    }
    
    const finalSign = signature.toUpperCase();
    console.log('✅ 生成签名:', finalSign);
    
    return finalSign;
  } catch (error) {
    console.error('❌ 签名生成失败:', error);
    throw new Error(`签名生成失败: ${error.message}`);
  }
}

/**
 * 对象转XML
 */
function objectToXml(obj) {
  const builder = new xml2js.Builder({
    rootName: 'xml',
    cdata: false,
    renderOpts: {
      pretty: false,
      indent: '',
      newline: ''
    }
  });
  
  return builder.buildObject(obj);
}

/**
 * XML转对象
 */
function xmlToObject(xmlString) {
  return new Promise((resolve, reject) => {
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
      trim: true
    });
    
    parser.parseString(xmlString, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.xml || result);
      }
    });
  });
}

/**
 * 验证签名
 */
function verifySign(params, apiKey, signType = 'MD5') {
  if (!params.sign) {
    console.error('❌ 签名验证失败：缺少sign字段');
    return false;
  }

  const receivedSign = params.sign;
  const calculatedSign = generateSign(params, apiKey, signType);
  
  const isValid = receivedSign === calculatedSign;
  
  if (!isValid) {
    console.error('❌ 签名验证失败:', {
      received: receivedSign,
      calculated: calculatedSign
    });
  } else {
    console.log('✅ 签名验证成功');
  }
  
  return isValid;
}

/**
 * 查询订单状态
 */
async function queryOrder(outTradeNo) {
  try {
    console.log('='.repeat(60));
    console.log('🔍 开始查询微信支付订单状态');
    console.log('='.repeat(60));
    console.log('📋 查询配置:');
    console.log(`   订单号: ${outTradeNo}`);
    console.log(`   AppID: ${config.appId}`);
    console.log(`   商户号: ${config.mchId}`);
    console.log(`   签名类型: ${config.signType}`);
    console.log(`   API Key: ${config.apiKey ? config.apiKey.substring(0, 8) + '...' : '未配置'}`);
    console.log('');
    
    // 1. 验证配置
    if (!config.appId || !config.mchId || !config.apiKey) {
      throw new Error('微信支付配置不完整，请检查环境变量');
    }
    
    // 2. 构建请求参数
    const queryParams = {
      appid: config.appId,
      mch_id: config.mchId,
      out_trade_no: outTradeNo,
      nonce_str: generateNonceStr(),
      sign_type: config.signType
    };
    
    console.log('📋 请求参数:');
    console.log(JSON.stringify(queryParams, null, 2));
    console.log('');
    
    // 3. 生成签名
    const sign = generateSign(queryParams, config.apiKey, config.signType);
    const finalParams = { ...queryParams, sign };
    
    // 4. 转换为XML格式
    const xmlData = objectToXml(finalParams);
    console.log('📤 发送XML数据:');
    console.log(xmlData);
    console.log('');
    
    // 5. 发送请求
    console.log('🌐 发送请求到微信支付API...');
    const response = await axios.post(API_URLS.ORDER_QUERY, xmlData, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'WeChat Pay Query Test Script'
      },
      timeout: 30000
    });
    
    console.log('📥 HTTP响应状态:', response.status);
    console.log('📥 响应头:', response.headers);
    console.log('📥 原始响应数据:');
    console.log(response.data);
    console.log('');
    
    // 6. 解析响应
    const responseData = await xmlToObject(response.data);
    
    console.log('📋 解析后的响应数据:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('');
    
    // 7. 验证响应
    console.log('🔍 验证响应结果...');
    
    // 检查通信结果
    if (responseData.return_code !== 'SUCCESS') {
      console.error('❌ 微信支付通信失败:');
      console.error(`   return_code: ${responseData.return_code}`);
      console.error(`   return_msg: ${responseData.return_msg}`);
      return {
        success: false,
        error: 'COMMUNICATION_ERROR',
        message: responseData.return_msg || '通信失败'
      };
    }
    
    // 验证签名
    const signValid = verifySign(responseData, config.apiKey, config.signType);
    if (!signValid) {
      console.error('❌ 响应签名验证失败');
      return {
        success: false,
        error: 'SIGN_ERROR',
        message: '响应签名验证失败'
      };
    }
    
    // 检查业务结果
    if (responseData.result_code !== 'SUCCESS') {
      console.error('❌ 业务执行失败:');
      console.error(`   result_code: ${responseData.result_code}`);
      console.error(`   err_code: ${responseData.err_code}`);
      console.error(`   err_code_des: ${responseData.err_code_des}`);
      
      // 分析具体错误原因
      const errorAnalysis = analyzeError(responseData.err_code, responseData.err_code_des);
      console.log('');
      console.log('🔍 错误分析:');
      console.log(errorAnalysis);
      
      return {
        success: false,
        error: responseData.err_code,
        message: responseData.err_code_des || '业务执行失败',
        analysis: errorAnalysis
      };
    }
    
    // 8. 成功获取订单信息
    console.log('✅ 查询成功！订单信息:');
    console.log('='.repeat(40));
    console.log(`📋 订单号: ${responseData.out_trade_no}`);
    console.log(`🆔 微信订单号: ${responseData.transaction_id || '无'}`);
    console.log(`💰 订单金额: ${responseData.total_fee ? (responseData.total_fee / 100) + '元' : '未知'}`);
    console.log(`💸 实付金额: ${responseData.cash_fee ? (responseData.cash_fee / 100) + '元' : '未知'}`);
    console.log(`📊 订单状态: ${responseData.trade_state}`);
    console.log(`📝 状态描述: ${responseData.trade_state_desc}`);
    console.log(`⏰ 支付时间: ${responseData.time_end || '未支付'}`);
    console.log(`📎 附加数据: ${responseData.attach || '无'}`);
    console.log('='.repeat(40));
    
    // 分析订单状态
    const statusAnalysis = analyzeOrderStatus(responseData.trade_state);
    console.log('');
    console.log('🔍 状态分析:');
    console.log(statusAnalysis);
    
    return {
      success: true,
      data: {
        outTradeNo: responseData.out_trade_no,
        transactionId: responseData.transaction_id,
        totalFee: responseData.total_fee ? responseData.total_fee / 100 : 0,
        cashFee: responseData.cash_fee ? responseData.cash_fee / 100 : 0,
        tradeState: responseData.trade_state,
        tradeStateDesc: responseData.trade_state_desc,
        timeEnd: responseData.time_end,
        attach: responseData.attach
      },
      analysis: statusAnalysis
    };
    
  } catch (error) {
    console.error('❌ 查询订单失败:', error);
    
    // 网络错误分析
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      console.log('🔍 网络错误分析: 连接被重置或拒绝，可能是网络问题或防火墙阻拦');
    } else if (error.code === 'ENOTFOUND') {
      console.log('🔍 网络错误分析: DNS解析失败，请检查网络连接');
    } else if (error.message && error.message.includes('timeout')) {
      console.log('🔍 网络错误分析: 请求超时，微信支付服务器可能繁忙');
    }
    
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: error.message,
      code: error.code
    };
  }
}

/**
 * 分析错误原因
 */
function analyzeError(errCode, errCodeDes) {
  const errorAnalysis = {
    ORDERNOTEXIST: {
      reason: '订单不存在',
      solutions: [
        '1. 检查订单号是否正确',
        '2. 确认订单是否已创建',
        '3. 验证商户号是否匹配',
        '4. 检查是否使用了正确的环境（沙箱/生产）'
      ]
    },
    SYSTEMERROR: {
      reason: '系统错误',
      solutions: [
        '1. 稍后重试查询',
        '2. 检查网络连接',
        '3. 确认微信支付服务是否正常'
      ]
    },
    SIGNERROR: {
      reason: '签名错误',
      solutions: [
        '1. 检查API密钥是否正确',
        '2. 验证签名算法是否正确',
        '3. 确认参数编码格式',
        '4. 检查参数是否有特殊字符'
      ]
    },
    MCHID_NOT_EXIST: {
      reason: '商户号不存在',
      solutions: [
        '1. 检查商户号是否正确',
        '2. 确认商户号是否已开通微信支付',
        '3. 验证是否使用了正确的环境配置'
      ]
    },
    APPID_NOT_EXIST: {
      reason: 'AppID不存在',
      solutions: [
        '1. 检查AppID是否正确',
        '2. 确认AppID是否已开通微信支付',
        '3. 验证AppID与商户号是否匹配'
      ]
    },
    APPID_MCHID_NOT_MATCH: {
      reason: 'AppID与商户号不匹配',
      solutions: [
        '1. 检查AppID和商户号的绑定关系',
        '2. 在微信支付商户平台确认配置',
        '3. 确保使用的是正确的AppID'
      ]
    }
  };
  
  const analysis = errorAnalysis[errCode];
  if (analysis) {
    return `${analysis.reason}\n可能的解决方案:\n${analysis.solutions.join('\n')}`;
  }
  
  return `未知错误: ${errCode} - ${errCodeDes}\n建议检查微信支付配置和网络连接`;
}

/**
 * 分析订单状态
 */
function analyzeOrderStatus(tradeState) {
  const statusAnalysis = {
    SUCCESS: {
      description: '支付成功',
      action: '订单已完成支付，可以进行发货或提供服务',
      nextSteps: ['更新订单状态', '发货或提供服务', '发送确认通知']
    },
    REFUND: {
      description: '转入退款',
      action: '订单已发生退款，需要处理退款逻辑',
      nextSteps: ['检查退款金额', '更新订单状态', '处理退款业务逻辑']
    },
    NOTPAY: {
      description: '未支付',
      action: '用户尚未完成支付，订单仍在等待中',
      nextSteps: ['检查订单是否已过期', '提醒用户完成支付', '考虑是否需要关闭订单']
    },
    CLOSED: {
      description: '已关闭',
      action: '订单已关闭，用户无法继续支付',
      nextSteps: ['确认关闭原因', '如需要可重新创建订单']
    },
    REVOKED: {
      description: '已撤销（刷卡支付）',
      action: '订单已被撤销',
      nextSteps: ['处理撤销逻辑', '更新订单状态']
    },
    USERPAYING: {
      description: '用户支付中',
      action: '用户正在支付过程中',
      nextSteps: ['继续等待', '稍后再次查询状态']
    },
    PAYERROR: {
      description: '支付失败',
      action: '支付过程中发生错误',
      nextSteps: ['检查失败原因', '引导用户重新支付', '考虑更换支付方式']
    }
  };
  
  const analysis = statusAnalysis[tradeState];
  if (analysis) {
    return `状态: ${analysis.description}\n说明: ${analysis.action}\n建议操作:\n${analysis.nextSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`;
  }
  
  return `未知状态: ${tradeState}\n建议联系微信支付技术支持`;
}

/**
 * 配置诊断
 */
function diagnoseConfiguration() {
  console.log('='.repeat(60));
  console.log('🔧 微信支付配置诊断');
  console.log('='.repeat(60));
  
  const issues = [];
  
  // 检查AppID
  if (!config.appId) {
    issues.push('❌ WECHAT_PAY_APP_ID 未配置');
  } else if (!config.appId.startsWith('wx')) {
    issues.push('⚠️ AppID 格式可能不正确（应以wx开头）');
  } else {
    console.log('✅ AppID 配置正常');
  }
  
  // 检查商户号
  if (!config.mchId) {
    issues.push('❌ WECHAT_PAY_MCH_ID 未配置');
  } else if (!/^\d{10}$/.test(config.mchId)) {
    issues.push('⚠️ 商户号格式可能不正确（应为10位数字）');
  } else {
    console.log('✅ 商户号配置正常');
  }
  
  // 检查API密钥
  if (!config.apiKey) {
    issues.push('❌ WECHAT_PAY_API_KEY 未配置');
  } else if (config.apiKey.length !== 32) {
    issues.push('⚠️ API密钥长度不正确（应为32位）');
  } else {
    console.log('✅ API密钥配置正常');
  }
  
  // 检查签名类型
  if (!['MD5', 'HMAC-SHA256'].includes(config.signType)) {
    issues.push('⚠️ 签名类型不正确（应为MD5或HMAC-SHA256）');
  } else {
    console.log('✅ 签名类型配置正常');
  }
  
  if (issues.length > 0) {
    console.log('\n🚨 发现配置问题:');
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log('\n请检查 .env 文件中的微信支付配置');
    return false;
  }
  
  console.log('\n✅ 所有配置项检查通过');
  return true;
}

/**
 * 主函数
 */
async function main() {
  console.log('🎯 微信支付订单状态查询测试脚本');
  console.log(`📅 执行时间: ${new Date().toLocaleString()}`);
  console.log(`🔍 查询订单: ${ORDER_NO}`);
  console.log('');
  
  // 1. 配置诊断
  const configOk = diagnoseConfiguration();
  if (!configOk) {
    process.exit(1);
  }
  
  console.log('');
  
  // 2. 查询订单
  const result = await queryOrder(ORDER_NO);
  
  console.log('');
  console.log('='.repeat(60));
  console.log('📊 查询结果摘要');
  console.log('='.repeat(60));
  
  if (result.success) {
    console.log('✅ 查询成功');
    console.log(`📋 订单状态: ${result.data.tradeState} (${result.data.tradeStateDesc})`);
    
    if (result.data.tradeState === 'NOTPAY') {
      console.log('');
      console.log('🔍 订单状态为NOTPAY的可能原因:');
      console.log('1. 用户确实未完成支付');
      console.log('2. 支付成功但回调通知失败，导致系统状态未更新');
      console.log('3. 微信支付系统延迟，状态还未更新');
      console.log('4. 网络问题导致支付状态同步延迟');
      console.log('');
      console.log('🔧 建议解决方案:');
      console.log('1. 确认用户是否真的完成了支付');
      console.log('2. 检查回调URL是否可访问');
      console.log('3. 稍后再次查询订单状态');
      console.log('4. 检查支付回调日志');
      console.log('5. 联系微信支付技术支持');
    }
  } else {
    console.log('❌ 查询失败');
    console.log(`📋 错误代码: ${result.error}`);
    console.log(`📋 错误信息: ${result.message}`);
    
    if (result.analysis) {
      console.log('');
      console.log('🔍 详细分析:');
      console.log(result.analysis);
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('🏁 测试完成');
  console.log('='.repeat(60));
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  queryOrder,
  generateSign,
  verifySign,
  diagnoseConfiguration
};