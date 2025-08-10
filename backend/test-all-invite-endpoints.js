const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const USER_ID = 8;

async function testAllInviteEndpoints() {
  console.log('🧪 开始测试所有邀请系统API端点...\n');
  
  const endpoints = [
    {
      name: '邀请统计',
      url: `${BASE_URL}/api/invite/stats?userId=${USER_ID}`,
      method: 'GET'
    },
    {
      name: '邀请注册记录',
      url: `${BASE_URL}/api/invite/registrations?userId=${USER_ID}&page=1&limit=10`,
      method: 'GET'
    },
    {
      name: '邀请充值记录',
      url: `${BASE_URL}/api/invite/recharges?userId=${USER_ID}&page=1&limit=10`,
      method: 'GET'
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 测试 ${endpoint.name}...`);
      console.log(`   URL: ${endpoint.url}`);
      
      const response = await axios({
        method: endpoint.method,
        url: endpoint.url,
        timeout: 10000
      });
      
      console.log(`✅ ${endpoint.name} 成功 (状态码: ${response.status})`);
      console.log(`   响应数据:`, JSON.stringify(response.data, null, 2));
      successCount++;
      
    } catch (error) {
      console.error(`❌ ${endpoint.name} 失败:`);
      if (error.response) {
        console.error(`   状态码: ${error.response.status}`);
        console.error(`   响应数据:`, error.response.data);
      } else if (error.request) {
        console.error(`   网络错误: 无响应`);
      } else {
        console.error(`   错误信息: ${error.message}`);
      }
      failCount++;
    }
    
    console.log(''); // 空行分隔
  }

  console.log('📊 测试结果总结:');
  console.log(`   成功: ${successCount}/${endpoints.length}`);
  console.log(`   失败: ${failCount}/${endpoints.length}`);
  
  if (failCount === 0) {
    console.log('🎉 所有邀请系统API端点测试通过！');
  } else {
    console.log('⚠️ 部分端点测试失败，请检查服务器状态');
  }
}

// 首先检查服务器是否运行
async function checkServerStatus() {
  try {
    console.log('🔍 检查服务器状态...');
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ 服务器运行正常');
    return true;
  } catch (error) {
    console.error('❌ 服务器未运行或无响应');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log('请先启动后端服务器: cd InterviewCodeOverlay/backend && npx ts-node src/server.ts');
    return;
  }
  
  console.log('');
  await testAllInviteEndpoints();
}

main().catch(console.error); 