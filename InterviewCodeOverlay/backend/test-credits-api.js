/**
 * 客户端积分API测试脚本
 * 测试新的合并积分检查和扣除API
 */
const fetch = require('node-fetch');
const readline = require('readline');

const BASE_URL = 'http://localhost:3001';
let accessToken = '';

// 创建命令行输入接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 提示用户输入
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * 登录并获取token
 */
async function login() {
  try {
    const username = await question('请输入用户名: ');
    const password = await question('请输入密码: ');
    
    console.log('🔐 正在登录...');
    const response = await fetch(`${BASE_URL}/api/auth-enhanced/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    if (data.success && data.token) {
      accessToken = data.token;
      console.log('✅ 登录成功! Token:', accessToken.substring(0, 15) + '...');
      return true;
    } else {
      console.error('❌ 登录失败:', data.message || '未知错误');
      return false;
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.message);
    return false;
  }
}

/**
 * 获取用户积分余额
 */
async function getBalance() {
  try {
    console.log('💰 获取积分余额...');
    const response = await fetch(`${BASE_URL}/api/client/credits/balance`, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      console.log(`✅ 当前积分余额: ${data.points}`);
      return data.points;
    } else {
      console.error('❌ 获取积分余额失败:', data.message || '未知错误');
      return null;
    }
  } catch (error) {
    console.error('❌ 获取积分余额请求失败:', error.message);
    return null;
  }
}

/**
 * 测试合并的检查和扣除积分API
 */
async function testCheckAndDeduct() {
  try {
    const modelName = await question('请输入模型名称 (默认: gpt-4o): ') || 'gpt-4o';
    const questionType = await question('请输入题目类型 (multiple_choice/programming，默认: multiple_choice): ') || 'multiple_choice';
    const operationId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    console.log('🔍 测试合并API: 检查并扣除积分...');
    console.log(`📝 请求参数: modelName=${modelName}, questionType=${questionType}, operationId=${operationId}`);
    
    console.time('API响应时间');
    const response = await fetch(`${BASE_URL}/api/client/credits/check-and-deduct`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        modelName,
        questionType,
        operationId
      })
    });
    console.timeEnd('API响应时间');
    
    const data = await response.json();
    console.log('📊 API响应结果:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`✅ 积分检查和扣除成功!`);
      console.log(`💰 积分变动: ${data.currentPoints} -> ${data.newBalance} (扣除: ${data.deductedAmount})`);
      
      // 询问是否要退款
      const shouldRefund = (await question('是否要测试退款API? (y/n，默认: y): ')).toLowerCase() !== 'n';
      
      if (shouldRefund) {
        await testRefund(operationId, data.deductedAmount);
      }
    } else {
      console.error('❌ 积分检查和扣除失败:', data.message || '未知错误');
    }
  } catch (error) {
    console.error('❌ 检查和扣除积分请求失败:', error.message);
  }
}

/**
 * 测试退款API
 */
async function testRefund(operationId, amount) {
  try {
    console.log('🔄 测试积分退款...');
    const reason = await question('请输入退款原因 (默认: 测试退款): ') || '测试退款';
    
    console.time('退款API响应时间');
    const response = await fetch(`${BASE_URL}/api/client/credits/refund`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operationId,
        amount,
        reason
      })
    });
    console.timeEnd('退款API响应时间');
    
    const data = await response.json();
    console.log('📊 退款API响应结果:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`✅ 积分退款成功! 新余额: ${data.newBalance}`);
    } else {
      console.error('❌ 积分退款失败:', data.message || '未知错误');
    }
  } catch (error) {
    console.error('❌ 退款请求失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('=== 客户端积分API测试工具 ===');
    
    // 1. 登录
    const loggedIn = await login();
    if (!loggedIn) {
      console.log('❌ 登录失败，无法继续测试');
      rl.close();
      return;
    }
    
    // 2. 获取初始积分余额
    await getBalance();
    
    // 3. 测试合并API
    await testCheckAndDeduct();
    
    // 4. 获取最终积分余额
    await getBalance();
    
    rl.close();
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    rl.close();
  }
}

// 执行主函数
main(); 