const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testConfigSync() {
  console.log('🧪 开始测试配置同步流程...\n');

  try {
    // 1. 检查后端健康状态
    console.log('1️⃣ 检查后端服务状态...');
    const healthResponse = await axios.get(`${API_BASE}/api/health`);
    console.log('✅ 后端服务正常:', healthResponse.data);

    // 2. 检查Web端会话状态
    console.log('\n2️⃣ 检查Web端会话状态...');
    const sessionResponse = await axios.get(`${API_BASE}/api/auth/web-session-status`);
    console.log('📊 会话状态:', sessionResponse.data);

    if (sessionResponse.data.hasActiveSession) {
      console.log('✅ 发现活跃Web会话，用户:', sessionResponse.data.user.username);

      // 3. 测试获取共享会话
      console.log('\n3️⃣ 测试获取共享会话...');
      const sharedSessionResponse = await axios.get(`${API_BASE}/api/auth/shared-session`);
      
      if (sharedSessionResponse.data.success) {
        console.log('✅ 共享会话获取成功');
        console.log('👤 用户:', sharedSessionResponse.data.user.username);
        
        // 4. 使用共享会话的token获取配置
        console.log('\n4️⃣ 使用共享会话token获取配置...');
        const configResponse = await axios.get(`${API_BASE}/api/config`, {
          headers: {
            'Authorization': `Bearer ${sharedSessionResponse.data.accessToken}`,
            'User-Agent': 'TestScript/1.0'
          }
        });
        
        console.log('✅ 配置获取成功:');
        console.log('🤖 AI模型:', configResponse.data.aiModel);
        console.log('🌐 编程语言:', configResponse.data.language);
        console.log('🎨 主题:', configResponse.data.theme);
        console.log('📱 显示设置:', configResponse.data.display);
        
        console.log('\n🎉 配置同步测试完成！客户端应该能够获取到最新的Web配置。');
      } else {
        console.log('❌ 共享会话获取失败:', sharedSessionResponse.data);
      }
    } else {
      console.log('⚠️ 没有活跃的Web会话');
      console.log('💡 请先在Web端登录 (http://localhost:3000)');
    }

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 请确保后端服务正在运行 (npm run start-simple.bat)');
    }
  }
}

// 运行测试
testConfigSync(); 