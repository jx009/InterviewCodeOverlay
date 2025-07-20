const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3001';
let adminToken = null;

// 测试用例计数器
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// 测试结果记录
const testResults = [];

function logTest(testName, passed, error = null) {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ ${testName}`.green);
    testResults.push({ test: testName, status: 'PASS' });
  } else {
    failedTests++;
    console.log(`❌ ${testName}`.red);
    if (error) {
      console.log(`   错误: ${error.message}`.red);
    }
    testResults.push({ test: testName, status: 'FAIL', error: error?.message });
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testApiDocs() {
  console.log('\n📚 测试API文档功能...'.cyan.bold);
  
  try {
    // 测试HTML文档
    const htmlResponse = await axios.get(`${BASE_URL}/api/docs`);
    logTest('获取HTML格式API文档', 
      htmlResponse.status === 200 && htmlResponse.data.includes('InterviewCodeOverlay API 文档')
    );
  } catch (error) {
    logTest('获取HTML格式API文档', false, error);
  }

  try {
    // 测试Markdown文档
    const markdownResponse = await axios.get(`${BASE_URL}/api/docs/markdown`);
    logTest('获取Markdown格式API文档', 
      markdownResponse.status === 200 && markdownResponse.data.includes('# InterviewCodeOverlay API 文档')
    );
  } catch (error) {
    logTest('获取Markdown格式API文档', false, error);
  }

  try {
    // 测试API概览
    const overviewResponse = await axios.get(`${BASE_URL}/api/docs/overview`);
    logTest('获取API概览信息', 
      overviewResponse.status === 200 && 
      overviewResponse.data.success &&
      overviewResponse.data.data.totalEndpoints > 0
    );
  } catch (error) {
    logTest('获取API概览信息', false, error);
  }
}

async function testPublicMonitoring() {
  console.log('\n🔍 测试公共监控功能...'.cyan.bold);
  
  try {
    // 测试公共健康检查
    const healthResponse = await axios.get(`${BASE_URL}/api/monitoring/health`);
    logTest('公共健康检查', 
      healthResponse.status === 200 && 
      healthResponse.data.data.status
    );
    
    console.log(`   系统状态: ${healthResponse.data.data.status}`.gray);
    console.log(`   运行时间: ${Math.round(healthResponse.data.data.uptime)}秒`.gray);
  } catch (error) {
    logTest('公共健康检查', false, error);
  }
}

async function loginAsAdmin() {
  console.log('\n🔐 管理员登录...'.cyan.bold);
  
  try {
    // 首先尝试注册管理员账户（如果不存在）
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        username: 'admin',
        email: 'admin@test.com',
        password: 'admin123456'
      });
      console.log('   管理员账户已注册'.gray);
    } catch (error) {
      // 账户可能已存在，继续登录
    }

    // 登录管理员账户
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123456'
    });

    if (loginResponse.data.token) {
      adminToken = loginResponse.data.token;
      logTest('管理员登录', true);
      console.log('   管理员Token已获取'.gray);
      console.log(`   用户ID: ${loginResponse.data.user.id}`.gray);
      console.log(`   用户名: ${loginResponse.data.user.username}`.gray);
      return true;
    } else {
      logTest('管理员登录', false, new Error('登录响应格式错误'));
      console.log('   实际响应:', JSON.stringify(loginResponse.data, null, 2).gray);
      return false;
    }
  } catch (error) {
    logTest('管理员登录', false, error);
    return false;
  }
}

async function testAdminFeatures() {
  if (!adminToken) {
    console.log('\n⚠️  跳过管理员功能测试（未获取到管理员Token）'.yellow);
    return;
  }

  console.log('\n👑 测试管理员功能...'.cyan.bold);
  
  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  try {
    // 测试获取系统统计
    const statsResponse = await axios.get(`${BASE_URL}/api/admin/stats`, { headers });
    logTest('获取系统统计', 
      statsResponse.status === 200 && 
      statsResponse.data.success &&
      statsResponse.data.data.users
    );
    
    if (statsResponse.data.success) {
      const stats = statsResponse.data.data;
      console.log(`   总用户数: ${stats.users.total}`.gray);
      console.log(`   平均积分: ${stats.users.averagePoints}`.gray);
    }
  } catch (error) {
    logTest('获取系统统计', false, error);
  }

  try {
    // 测试获取用户列表
    const usersResponse = await axios.get(`${BASE_URL}/api/admin/users?page=1&limit=10`, { headers });
    logTest('获取用户列表', 
      usersResponse.status === 200 && 
      usersResponse.data.success &&
      Array.isArray(usersResponse.data.data.users)
    );
    
    if (usersResponse.data.success) {
      console.log(`   用户列表长度: ${usersResponse.data.data.users.length}`.gray);
    }
  } catch (error) {
    logTest('获取用户列表', false, error);
  }

  try {
    // 测试系统健康检查
    const healthResponse = await axios.get(`${BASE_URL}/api/admin/health`, { headers });
    logTest('管理员健康检查', 
      healthResponse.status === 200 && 
      healthResponse.data.success
    );
  } catch (error) {
    logTest('管理员健康检查', false, error);
  }
}

async function testMonitoringFeatures() {
  if (!adminToken) {
    console.log('\n⚠️  跳过监控功能测试（未获取到管理员Token）'.yellow);
    return;
  }

  console.log('\n📊 测试监控功能...'.cyan.bold);
  
  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  try {
    // 测试获取系统指标
    const metricsResponse = await axios.get(`${BASE_URL}/api/monitoring/metrics`, { headers });
    logTest('获取系统指标', 
      metricsResponse.status === 200 && 
      metricsResponse.data.success &&
      metricsResponse.data.data.metrics
    );
    
    if (metricsResponse.data.success) {
      const metrics = metricsResponse.data.data.metrics;
      console.log(`   CPU使用率: ${(metrics.cpu.usage * 100).toFixed(2)}%`.gray);
      console.log(`   内存使用率: ${(metrics.memory.usage * 100).toFixed(2)}%`.gray);
    }
  } catch (error) {
    logTest('获取系统指标', false, error);
  }

  try {
    // 测试获取系统概览
    const overviewResponse = await axios.get(`${BASE_URL}/api/monitoring/overview`, { headers });
    logTest('获取系统概览', 
      overviewResponse.status === 200 && 
      overviewResponse.data.success &&
      overviewResponse.data.data.overview
    );
    
    if (overviewResponse.data.success) {
      const overview = overviewResponse.data.data.overview;
      console.log(`   系统状态: ${overview.status}`.gray);
      console.log(`   运行时间: ${overview.uptime.formatted}`.gray);
    }
  } catch (error) {
    logTest('获取系统概览', false, error);
  }

  try {
    // 测试获取使用统计
    const usageResponse = await axios.get(`${BASE_URL}/api/monitoring/usage`, { headers });
    logTest('获取使用统计', 
      usageResponse.status === 200 && 
      usageResponse.data.success &&
      usageResponse.data.data.usage
    );
  } catch (error) {
    logTest('获取使用统计', false, error);
  }

  // 等待一段时间以收集更多指标
  console.log('   等待收集更多指标...'.gray);
  await sleep(2000);

  try {
    // 测试获取指标历史
    const historyResponse = await axios.get(`${BASE_URL}/api/monitoring/metrics/history?limit=5`, { headers });
    logTest('获取指标历史', 
      historyResponse.status === 200 && 
      historyResponse.data.success &&
      Array.isArray(historyResponse.data.data.history)
    );
    
    if (historyResponse.data.success) {
      console.log(`   历史记录数量: ${historyResponse.data.data.history.length}`.gray);
    }
  } catch (error) {
    logTest('获取指标历史', false, error);
  }
}

async function testErrorHandling() {
  console.log('\n🚨 测试错误处理...'.cyan.bold);
  
  try {
    // 测试无效路由
    const invalidResponse = await axios.get(`${BASE_URL}/api/invalid-route`);
    logTest('无效路由处理', false, new Error('应该返回404错误'));
  } catch (error) {
    logTest('无效路由处理', error.response?.status === 404);
  }

  try {
    // 测试未授权访问管理员接口
    const unauthorizedResponse = await axios.get(`${BASE_URL}/api/admin/stats`);
    logTest('未授权访问管理员接口', false, new Error('应该返回401错误'));
  } catch (error) {
    logTest('未授权访问管理员接口', error.response?.status === 401);
  }

  try {
    // 测试未授权访问监控接口
    const unauthorizedMonitoringResponse = await axios.get(`${BASE_URL}/api/monitoring/metrics`);
    logTest('未授权访问监控接口', false, new Error('应该返回401错误'));
  } catch (error) {
    logTest('未授权访问监控接口', error.response?.status === 401);
  }
}

function printTestSummary() {
  console.log('\n' + '='.repeat(60).cyan);
  console.log('📋 测试总结'.cyan.bold);
  console.log('='.repeat(60).cyan);
  
  console.log(`总测试数: ${totalTests}`.white);
  console.log(`通过: ${passedTests}`.green);
  console.log(`失败: ${failedTests}`.red);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(2)}%`.yellow);
  
  if (failedTests > 0) {
    console.log('\n❌ 失败的测试:'.red.bold);
    testResults
      .filter(result => result.status === 'FAIL')
      .forEach(result => {
        console.log(`   - ${result.test}`.red);
        if (result.error) {
          console.log(`     错误: ${result.error}`.gray);
        }
      });
  }
  
  console.log('\n' + '='.repeat(60).cyan);
  
  if (failedTests === 0) {
    console.log('🎉 所有低优先级功能测试通过！'.green.bold);
  } else {
    console.log('⚠️  部分测试失败，请检查相关功能。'.yellow.bold);
  }
}

async function main() {
  console.log('🚀 开始测试低优先级功能...'.cyan.bold);
  console.log(`测试目标: ${BASE_URL}`.gray);
  console.log('='.repeat(60).cyan);

  // 1. 测试API文档功能
  await testApiDocs();
  
  // 2. 测试公共监控功能
  await testPublicMonitoring();
  
  // 3. 管理员登录
  const loginSuccess = await loginAsAdmin();
  
  // 4. 测试管理员功能
  if (loginSuccess) {
    await testAdminFeatures();
    await testMonitoringFeatures();
  }
  
  // 5. 测试错误处理
  await testErrorHandling();
  
  // 6. 打印测试总结
  printTestSummary();
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// 捕获未处理的错误
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

main(); 