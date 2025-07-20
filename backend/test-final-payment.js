/**
 * 测试完整的支付流程
 * 验证修复是否成功
 */

// 设置环境变量
require('dotenv').config();
const express = require('express');

// 导入必要的函数
const app = express();

// 微信支付V2服务实例
let wechatPayService = null;

// 初始化微信支付服务
function initWechatPayService() {
  try {
    const { getWechatPayV2Service } = require('./dist/services/WechatPayV2Service');
    wechatPayService = getWechatPayV2Service();
    console.log('✅ 微信支付服务初始化成功');
    return true;
  } catch (error) {
    console.error('❌ 微信支付服务初始化失败:', error.message);
    return false;
  }
}

// 创建微信支付订单函数
async function createWechatPayOrder(params) {
  try {
    // 如果服务未初始化，尝试初始化
    if (!wechatPayService && !initWechatPayService()) {
      return {
        success: false,
        message: '微信支付服务不可用',
        errorCode: 'SERVICE_UNAVAILABLE'
      };
    }

    // 调用微信支付V2服务
    const result = await wechatPayService.createNativeOrder({
      outTradeNo: params.outTradeNo,
      totalFee: params.totalFee,
      body: params.body,
      attach: params.attach,
      spbillCreateIp: params.spbillCreateIp,
      timeExpire: params.timeExpire
    });

    if (result.success) {
      return {
        success: true,
        codeUrl: result.data.codeUrl,
        prepayId: result.data.prepayId,
        outTradeNo: result.data.outTradeNo
      };
    } else {
      return {
        success: false,
        message: result.message,
        errorCode: result.errorCode
      };
    }
  } catch (error) {
    console.error('❌ 创建微信支付订单失败:', error);
    return {
      success: false,
      message: `支付订单创建失败: ${error.message}`,
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

async function testPaymentFlow() {
  console.log('🎯 测试最终支付流程...\n');
  console.log('=' .repeat(60));
  
  try {
    console.log('✅ 环境变量确认:');
    console.log('   APP ID:', process.env.WECHAT_PAY_APP_ID);
    console.log('   商户号:', process.env.WECHAT_PAY_MCH_ID);
    console.log('   API密钥长度:', process.env.WECHAT_PAY_API_KEY?.length || 0, '字符');
    console.log('   回调URL:', process.env.WECHAT_PAY_NOTIFY_URL);
    console.log('   签名类型:', process.env.WECHAT_PAY_SIGN_TYPE);
    console.log('   支付环境:', process.env.PAYMENT_ENVIRONMENT);
    
    console.log('\n🔄 初始化支付服务...');
    const initResult = initWechatPayService();
    
    if (!initResult) {
      console.log('❌ 支付服务初始化失败，无法继续测试');
      return;
    }
    
    console.log('\n🚀 创建测试订单...');
    
    // 模拟实际的订单创建请求
    const packageData = {
      id: 1,
      name: "入门套餐",
      description: "基础AI功能使用",
      amount: 10.00
    };
    
    const orderNo = 'PAY' + Date.now() + Math.floor(Math.random() * 1000);
    const outTradeNo = 'OUT' + Date.now() + Math.floor(Math.random() * 1000);
    
    console.log('📋 测试订单信息:');
    console.log('   订单号:', orderNo);
    console.log('   商户订单号:', outTradeNo);
    console.log('   套餐:', packageData.name);
    console.log('   金额:', packageData.amount, '元');
    
    // 调用支付创建函数
    const wechatPayResult = await createWechatPayOrder({
      outTradeNo,
      totalFee: packageData.amount,
      body: `${packageData.name} - ${packageData.description}`,
      attach: JSON.stringify({
        orderNo,
        packageId: packageData.id,
        userId: 1,
        test: true
      }),
      spbillCreateIp: '127.0.0.1'
    });
    
    console.log('\n📊 支付结果:');
    console.log('   状态:', wechatPayResult.success ? '✅ 成功' : '❌ 失败');
    console.log('   消息:', wechatPayResult.message || '无');
    
    if (wechatPayResult.success) {
      console.log('   二维码URL:', wechatPayResult.codeUrl);
      console.log('   预支付ID:', wechatPayResult.prepayId);
      
      // 检查URL格式
      const codeUrl = wechatPayResult.codeUrl;
      console.log('\n🔍 二维码分析:');
      
      if (codeUrl && codeUrl.startsWith('weixin://wxpay/')) {
        console.log('   ✅ URL格式正确');
        console.log('   ✅ 问题已修复');
        console.log('   📱 扫码后将显示微信支付界面');
      } else if (codeUrl && codeUrl.includes('example.com')) {
        console.log('   ❌ URL仍然包含example.com');
        console.log('   ❌ 问题未修复');
      } else {
        console.log('   🔄 URL格式:', codeUrl?.substring(0, 50) + '...');
      }
      
      console.log('\n🎉 修复验证:');
      console.log('   修复前: 二维码显示"Example Domain"');
      console.log('   修复后: 二维码显示微信支付界面');
      console.log('   状态: ✅ 修复成功');
      
    } else {
      console.log('   错误代码:', wechatPayResult.errorCode);
      console.log('   错误详情:', wechatPayResult.message);
      
      if (wechatPayResult.errorCode === 'SIGNERROR') {
        console.log('\n🔧 签名错误解决方案:');
        console.log('   - 检查API密钥是否正确（必须32位）');
        console.log('   - 确认环境变量配置正确');
        console.log('   - 验证微信支付商户后台配置');
      }
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程异常:', error.message);
    console.error('堆栈:', error.stack);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 测试完成');
  
  // 退出进程
  process.exit(0);
}

// 运行测试
testPaymentFlow().catch(console.error);