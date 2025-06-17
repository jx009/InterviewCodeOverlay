const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// 存储登录token
let authToken = '';

async function testAPI() {
  console.log('🧪 开始测试 Interview Coder 后端API...\n');

  try {
    // 1. 测试健康检查
    console.log('1️⃣ 测试健康检查端点...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ 健康检查成功:', healthResponse.data);
    console.log('');

    // 2. 测试用户注册
    console.log('2️⃣ 测试用户注册...');
    const randomId = Date.now();
    const registerData = {
      username: `testuser_${randomId}`,
      password: 'password123',
      email: `test_${randomId}@example.com`
    };
    
    const registerResponse = await axios.post(`${API_BASE}/api/auth/register`, registerData);
    console.log('✅ 用户注册成功:', registerResponse.data);
    console.log('');

    // 3. 测试用户登录
    console.log('3️⃣ 测试用户登录...');
    const loginData = {
      username: registerData.username,
      password: 'password123'
    };
    
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, loginData);
    console.log('✅ 用户登录成功:', loginResponse.data);
    
    // 保存token用于后续测试
    authToken = loginResponse.data.data.token;
    console.log('');

    // 4. 测试获取配置（需要认证）
    console.log('4️⃣ 测试获取用户配置...');
    const configResponse = await axios.get(`${API_BASE}/api/config`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('✅ 获取配置成功:', configResponse.data);
    console.log('');

    // 5. 测试更新配置
    console.log('5️⃣ 测试更新用户配置...');
    const updateConfigData = {
      selectedProvider: 'gemini',
      language: 'javascript',
      opacity: 0.8
    };
    
    const updateResponse = await axios.put(`${API_BASE}/api/config`, updateConfigData, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('✅ 配置更新成功:', updateResponse.data);
    console.log('');

    // 6. 测试获取AI模型列表
    console.log('6️⃣ 测试获取AI模型列表...');
    const modelsResponse = await axios.get(`${API_BASE}/api/config/models`);
    console.log('✅ 获取模型列表成功:');
    console.log('   支持的提供商:', modelsResponse.data.data.providers);
    console.log('   Claude模型数量:', modelsResponse.data.data.models.claude.length);
    console.log('   Gemini模型数量:', modelsResponse.data.data.models.gemini.length);
    console.log('   OpenAI模型数量:', modelsResponse.data.data.models.openai.length);
    console.log('');

    // 7. 测试获取编程语言列表
    console.log('7️⃣ 测试获取编程语言列表...');
    const languagesResponse = await axios.get(`${API_BASE}/api/config/languages`);
    console.log('✅ 获取语言列表成功:');
    console.log('   支持的语言数量:', languagesResponse.data.data.length);
    console.log('   部分语言:', languagesResponse.data.data.slice(0, 5).map(l => l.label).join(', '));
    console.log('');

    // 8. 测试无效认证
    console.log('8️⃣ 测试无效认证...');
    try {
      await axios.get(`${API_BASE}/api/config`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ 无效认证测试成功 - 正确返回401错误');
      } else {
        throw error;
      }
    }
    console.log('');

    // 9. 测试重复注册
    console.log('9️⃣ 测试重复注册...');
    try {
      await axios.post(`${API_BASE}/api/auth/register`, registerData);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ 重复注册测试成功 - 正确返回409错误:', error.response.data.error);
      } else {
        throw error;
      }
    }
    console.log('');

    console.log('🎉 所有API测试完成！');
    console.log('📊 测试总结:');
    console.log('   ✅ 健康检查');
    console.log('   ✅ 用户注册');
    console.log('   ✅ 用户登录');
    console.log('   ✅ 获取配置');
    console.log('   ✅ 更新配置');
    console.log('   ✅ 获取AI模型列表');
    console.log('   ✅ 获取编程语言列表');
    console.log('   ✅ 认证保护');
    console.log('   ✅ 重复注册检查');
    console.log('');
    console.log('🚀 后端服务工作正常，可以继续开发前端！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

// 等待服务器启动后运行测试
setTimeout(() => {
  testAPI();
}, 1000); 