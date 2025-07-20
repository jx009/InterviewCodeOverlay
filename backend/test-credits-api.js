const axios = require('axios');
const readline = require('readline');

// 测试配置
const API_BASE = 'http://localhost:3001/api';
let sessionId = null;
let userId = null;

// 创建控制台输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 创建指定时间的 Promise
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 创建带会话的API客户端
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 更新会话ID
const updateSessionId = (id) => {
  sessionId = id;
  apiClient.defaults.headers['X-Session-Id'] = id;
  console.log(`会话ID已更新: ${id?.substring(0, 10)}...`);
};

// 登录
async function login() {
  try {
    console.log('\n🔐 正在登录...');
    
    // 提示输入用户名
    const email = await new Promise(resolve => {
      rl.question('请输入邮箱: ', resolve);
    });
    
    // 提示输入密码
    const password = await new Promise(resolve => {
      rl.question('请输入密码: ', resolve);
    });
    
    // 调用登录API
    const response = await apiClient.post('/auth-enhanced/login', { 
      email, 
      password 
    });
    
    if (response.data.success && response.data.sessionId) {
      console.log('✅ 登录成功!');
      updateSessionId(response.data.sessionId);
      userId = response.data.user?.id;
      return true;
    } else {
      console.error('❌ 登录失败:', response.data.message || '未知错误');
      return false;
    }
  } catch (error) {
    console.error('❌ 登录异常:', error.response?.data || error.message);
    return false;
  }
}

// 检查积分
async function checkCredits() {
  try {
    console.log('\n💰 正在获取积分余额...');
    const response = await apiClient.get('/client/credits');
    
    if (response.data.success) {
      console.log(`✅ 当前积分: ${response.data.credits}`);
      return response.data.credits;
    } else {
      console.error('❌ 获取积分失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 积分API异常:', error.response?.data || error.message);
    return null;
  }
}

// 检查特定模型和题型的积分消费
async function checkModelCost(modelName, questionType) {
  try {
    console.log(`\n🔍 正在检查模型 ${modelName} (${questionType}) 的积分消费...`);
    const response = await apiClient.post('/client/credits/check', {
      modelName,
      questionType
    });
    
    if (response.data.success) {
      console.log(`✅ 检查成功!`);
      console.log(`  - 当前积分: ${response.data.currentCredits}`);
      console.log(`  - 需要积分: ${response.data.requiredCredits}`);
      console.log(`  - 是否足够: ${response.data.sufficient ? '是' : '否'}`);
      console.log(`  - 消息: ${response.data.message}`);
      return response.data;
    } else {
      console.error('❌ 积分检查失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 检查积分异常:', error.response?.data || error.message);
    return null;
  }
}

// 模拟积分消费
async function simulateConsume(modelName, questionType) {
  try {
    const operationId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`\n💸 正在模拟使用模型 ${modelName} (${questionType}) 消费积分...`);
    console.log(`   操作ID: ${operationId}`);
    
    const response = await apiClient.post('/client/credits/deduct', {
      modelName,
      questionType,
      operationId
    });
    
    if (response.data.success) {
      console.log(`✅ 积分消费成功!`);
      console.log(`  - 交易ID: ${response.data.transactionId}`);
      console.log(`  - 新积分余额: ${response.data.newCredits}`);
      return { success: true, operationId, ...response.data };
    } else {
      console.error('❌ 积分消费失败:', response.data.message);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.error('❌ 积分消费异常:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// 模拟积分退款
async function simulateRefund(operationId, amount) {
  try {
    console.log(`\n♻️ 正在模拟积分退款 ${amount} 积分...`);
    console.log(`   操作ID: ${operationId}`);
    
    const response = await apiClient.post('/client/credits/refund', {
      amount,
      operationId,
      reason: '测试退款'
    });
    
    if (response.data.success) {
      console.log(`✅ 积分退款成功!`);
      console.log(`  - 交易ID: ${response.data.transactionId}`);
      console.log(`  - 新积分余额: ${response.data.newCredits}`);
      return true;
    } else {
      console.error('❌ 积分退款失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 积分退款异常:', error.response?.data || error.message);
    return false;
  }
}

// 获取积分历史记录
async function getPointsHistory() {
  try {
    console.log('\n📋 正在获取积分历史记录...');
    const response = await apiClient.get('/points/transactions');
    
    if (response.data.success) {
      console.log(`✅ 找到 ${response.data.transactions.length} 条交易记录:`);
      
      // 按时间倒序显示最近5条记录
      const recentTransactions = response.data.transactions.slice(0, 5);
      recentTransactions.forEach((tx, i) => {
        const date = new Date(tx.createdAt).toLocaleString();
        const type = tx.transactionType === 'CONSUME' ? '消费' : 
                    tx.transactionType === 'RECHARGE' ? '充值' : 
                    tx.transactionType === 'REFUND' ? '退款' : '其他';
        const amount = tx.amount > 0 ? `+${tx.amount}` : tx.amount;
        
        console.log(`  ${i+1}. [${date}] ${type} ${amount} 积分 (余额: ${tx.balanceAfter})`);
        console.log(`     ${tx.description || '无描述'}`);
      });
      
      return response.data.transactions;
    } else {
      console.error('❌ 获取历史记录失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 获取历史记录异常:', error.response?.data || error.message);
    return null;
  }
}

// 主测试流程
async function runTest() {
  try {
    console.log('🚀 开始积分API测试...');
    
    // 1. 登录
    const loggedIn = await login();
    if (!loggedIn) {
      console.error('❌ 登录失败，无法继续测试');
      rl.close();
      return;
    }
    
    // 2. 检查积分余额
    const initialBalance = await checkCredits();
    if (initialBalance === null) {
      console.error('❌ 获取积分余额失败，无法继续测试');
      rl.close();
      return;
    }
    
    // 3. 测试不同模型和题型的积分消费
    const testCases = [
      { model: 'gpt-4', type: 'programming' },
      { model: 'gpt-4', type: 'multiple_choice' },
      { model: 'gpt-3.5-turbo', type: 'programming' },
      { model: 'gpt-3.5-turbo', type: 'multiple_choice' }
    ];
    
    console.log('\n🧪 开始测试不同模型和题型的积分消费...');
    
    for (const test of testCases) {
      // 3.1 检查积分消费
      const costCheck = await checkModelCost(test.model, test.type);
      
      if (!costCheck || !costCheck.sufficient) {
        console.log(`⚠️ 跳过 ${test.model} (${test.type}) 测试，积分不足或检查失败`);
        continue;
      }
      
      // 3.2 模拟积分消费
      const consumeResult = await simulateConsume(test.model, test.type);
      
      // 等待1秒，让交易记录写入数据库
      await sleep(1000);
      
      // 3.3 如果消费成功，尝试退款
      if (consumeResult.success) {
        await simulateRefund(consumeResult.operationId, costCheck.requiredCredits);
        
        // 等待1秒，让交易记录写入数据库
        await sleep(1000);
      }
    }
    
    // 4. 获取积分历史记录
    await getPointsHistory();
    
    // 5. 再次检查积分余额
    const finalBalance = await checkCredits();
    console.log(`\n💰 积分变化: ${initialBalance} => ${finalBalance}`);
    
    console.log('\n🎉 测试完成!');
    rl.close();
    
  } catch (error) {
    console.error('❌ 测试过程中出现异常:', error);
    rl.close();
  }
}

// 运行测试
runTest(); 