const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function quickCreateTestUser() {
  console.log('🚀 快速创建测试用户...\n');

  // 测试用户信息
  const testUser = {
    email: 'quicktest@example.com',
    username: 'quicktest',
    password: '123456'
  };

  try {
    console.log('1. 📧 发送验证码到:', testUser.email);
    
    // 1. 发送验证码
    const verifyResponse = await axios.post(`${BASE_URL}/mail_verify`, {
      email: testUser.email,
      username: testUser.username
    });

    if (verifyResponse.data.success) {
      console.log('✅ 验证码发送成功!');
      console.log('📋 Token:', verifyResponse.data.token);
      
      // 2. 模拟验证码（在真实环境中需要从邮箱获取）
      console.log('\n2. 🔄 尝试使用常用验证码进行注册...');
      
      // 常见的测试验证码
      const commonCodes = ['123456', '000000', '111111', '888888'];
      
      for (const code of commonCodes) {
        try {
          console.log(`   尝试验证码: ${code}`);
          
          // 验证验证码
          const codeVerifyResponse = await axios.post(`${BASE_URL}/verify_code`, {
            token: verifyResponse.data.token,
            verify_code: code
          });
          
          if (codeVerifyResponse.data.success) {
            console.log(`✅ 验证码 ${code} 验证成功!`);
            
            // 3. 注册用户
            console.log('\n3. 👤 注册用户...');
            const registerResponse = await axios.post(`${BASE_URL}/user_register`, {
              token: verifyResponse.data.token,
              verify_code: code,
              email: testUser.email,
              password: testUser.password,
              username: testUser.username
            });
            
            if (registerResponse.data.success) {
              console.log('✅ 用户注册成功!');
              
              // 4. 登录测试
              console.log('\n4. 🔑 测试登录...');
              const loginResponse = await axios.post(`${BASE_URL}/login`, {
                email: testUser.email,
                password: testUser.password
              });
              
              if (loginResponse.data.success) {
                console.log('✅ 登录成功!');
                console.log('🔑 获得Token:', loginResponse.data.token ? '是' : '否');
                console.log('📱 获得SessionId:', loginResponse.data.sessionId ? '是' : '否');
                
                // 5. 测试认证API
                console.log('\n5. 🧪 测试需要认证的API...');
                
                const authHeaders = {
                  'Authorization': `Bearer ${loginResponse.data.token}`,
                  'X-Session-Id': loginResponse.data.sessionId
                };
                
                try {
                  const ordersResponse = await axios.get(`${BASE_URL}/payment/orders`, {
                    headers: authHeaders
                  });
                  console.log('✅ 获取订单列表成功!');
                  console.log('📋 订单数量:', ordersResponse.data.data?.length || 0);
                } catch (error) {
                  console.log('❌ 获取订单列表失败:', error.response?.data?.message || error.message);
                }
                
                console.log('\n🎉 测试用户创建完成!');
                console.log('📋 用户信息:');
                console.log(`   邮箱: ${testUser.email}`);
                console.log(`   密码: ${testUser.password}`);
                console.log(`   用户名: ${testUser.username}`);
                console.log('\n💡 现在可以使用此账号在前端页面登录测试支付功能!');
                
                return;
              } else {
                console.log('❌ 登录失败:', loginResponse.data.message);
              }
            } else {
              console.log('❌ 用户注册失败:', registerResponse.data.message);
            }
            
            break; // 成功验证后退出循环
          }
        } catch (error) {
          console.log(`   验证码 ${code} 失败:`, error.response?.data?.message || '未知错误');
        }
      }
      
      // 如果所有常用验证码都失败
      console.log('\n❌ 所有常用验证码验证失败');
      console.log('💡 请检查邮箱获取真实验证码，或手动在前端页面完成注册');
      console.log(`📧 邮箱: ${testUser.email}`);
      console.log(`🔑 Token: ${verifyResponse.data.token}`);
      
    } else {
      console.log('❌ 验证码发送失败:', verifyResponse.data.message);
    }
    
  } catch (error) {
    if (error.response?.data?.message?.includes('已注册')) {
      console.log('ℹ️ 用户已存在，尝试直接登录...');
      
      try {
        const loginResponse = await axios.post(`${BASE_URL}/login`, {
          email: testUser.email,
          password: testUser.password
        });
        
        if (loginResponse.data.success) {
          console.log('✅ 使用现有用户登录成功!');
          console.log('📋 用户信息:');
          console.log(`   邮箱: ${testUser.email}`);
          console.log(`   密码: ${testUser.password}`);
          console.log('💡 可以使用此账号在前端页面登录!');
        } else {
          console.log('❌ 登录失败:', loginResponse.data.message);
          console.log('💡 可能需要重置密码或使用其他账号');
        }
      } catch (loginError) {
        console.log('❌ 登录失败:', loginError.response?.data?.message || loginError.message);
      }
    } else {
      console.error('❌ 创建用户过程中发生错误:', error.response?.data?.message || error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('💡 服务器可能未启动，请确认后端服务正在运行在 http://localhost:3001');
      }
    }
  }
}

// 运行脚本
if (require.main === module) {
  quickCreateTestUser().catch(console.error);
}

module.exports = { quickCreateTestUser }; 