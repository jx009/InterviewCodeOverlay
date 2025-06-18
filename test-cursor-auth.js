// test-cursor-auth.js - 测试Cursor式认证系统
const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testCursorAuth() {
  console.log('🚀 开始测试Cursor式认证系统...\n');

  try {
    // 1. 测试健康检查
    console.log('1️⃣ 测试健康检查...');
    const healthResponse = await axios.get(`${API_BASE}/api/health`);
    console.log('✅ 健康检查成功:', healthResponse.data);
    console.log('');

    // 2. 测试用户注册
    console.log('2️⃣ 测试用户注册...');
    const registerData = {
      username: 'test_user',
      email: 'test@example.com',
      password: 'test123456'
    };

    const registerResponse = await axios.post(`${API_BASE}/api/auth/register`, registerData);
    console.log('✅ 注册成功:', {
      user: registerResponse.data.user,
      tokenLength: registerResponse.data.token ? registerResponse.data.token.length : 0
    });
    
    const userToken = registerResponse.data.token;
    const userId = registerResponse.data.user.id;
    console.log('');

    // 3. 测试获取用户信息
    console.log('3️⃣ 测试获取用户信息...');
    const meResponse = await axios.get(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log('✅ 获取用户信息成功:', meResponse.data);
    console.log('');

    // 4. 测试获取用户配置
    console.log('4️⃣ 测试获取用户配置...');
    const configResponse = await axios.get(`${API_BASE}/api/config/user/${userId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log('✅ 获取用户配置成功:', configResponse.data);
    console.log('');

    // 5. 测试更新用户配置
    console.log('5️⃣ 测试更新用户配置...');
    const updateConfigData = {
      aiModel: 'claude-3-5-sonnet-20241022',
      language: 'javascript',
      theme: 'dark'
    };
    
    const updateResponse = await axios.put(`${API_BASE}/api/config/user/${userId}`, updateConfigData, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log('✅ 更新用户配置成功:', updateResponse.data);
    console.log('');

    // 6. 测试OAuth登录（模拟）
    console.log('6️⃣ 测试OAuth登录...');
    const oauthResponse = await axios.post(`${API_BASE}/api/auth/oauth/callback`, {
      code: 'demo_code',
      provider: 'github'
    });
    console.log('✅ OAuth登录成功:', {
      user: oauthResponse.data.user,
      tokenLength: oauthResponse.data.token ? oauthResponse.data.token.length : 0
    });
    console.log('');

    // 7. 测试token验证
    console.log('7️⃣ 测试token验证...');
    const verifyResponse = await axios.get(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${oauthResponse.data.token}` }
    });
    console.log('✅ Token验证成功:', verifyResponse.data);
    console.log('');

    // 8. 测试用户登录
    console.log('8️⃣ 测试用户登录...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      username: 'test_user',
      password: 'test123456'
    });
    console.log('✅ 用户登录成功:', {
      user: loginResponse.data.user,
      tokenLength: loginResponse.data.token ? loginResponse.data.token.length : 0
    });
    console.log('');

    console.log('🎉 所有测试通过！Cursor式认证系统工作正常。');
    console.log('\n📋 系统特性:');
    console.log('- ✅ 统一JWT token认证');
    console.log('- ✅ 简化的用户配置管理');
    console.log('- ✅ OAuth登录支持');
    console.log('- ✅ 直接数据库配置访问');
    console.log('- ✅ RESTful API设计');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testCursorAuth(); 