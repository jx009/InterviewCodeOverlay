const axios = require('axios');

// 测试邀请注册流程
async function testInviteRegistration() {
  console.log('🧪 开始测试邀请注册流程...');
  
  const baseUrl = 'http://localhost:3001';
  const testEmail = `test_invite_${Date.now()}@test.com`;
  const testUsername = `testuser_${Date.now()}`;
  const testPassword = 'test123456';
  const inviterId = '1'; // 假设邀请人ID为1
  
  try {
    // 1. 发送邮箱验证码
    console.log('📧 第1步：发送邮箱验证码...');
    const verifyResponse = await axios.post(`${baseUrl}/api/mail_verify`, {
      email: testEmail,
      username: testUsername
    });
    
    console.log('✅ 验证码发送响应:', {
      success: verifyResponse.data.success,
      token: verifyResponse.data.token ? '存在' : '不存在'
    });
    
    if (!verifyResponse.data.success || !verifyResponse.data.token) {
      throw new Error('发送验证码失败');
    }
    
    const verificationToken = verifyResponse.data.token;
    
    // 2. 模拟验证码（从后端日志中获取）
    console.log('🔍 第2步：模拟验证码验证...');
    // 注意：在实际测试中，你需要从后端控制台日志中获取验证码
    const mockCode = '123456'; // 这里需要实际的验证码
    
    // 3. 注册用户并传递邀请人ID
    console.log('👤 第3步：注册用户（包含邀请人ID）...');
    console.log('📝 注册数据:', {
      token: '存在',
      verify_code: mockCode,
      email: testEmail,
      username: testUsername,
      password: '***',
      inviterId: inviterId // 关键参数
    });
    
    const registerResponse = await axios.post(`${baseUrl}/api/user_register`, {
      token: verificationToken,
      verify_code: mockCode,
      email: testEmail,
      password: testPassword,
      username: testUsername,
      inviterId: inviterId // 🎯 关键：传递邀请人ID
    });
    
    console.log('✅ 注册响应:', {
      success: registerResponse.data.success,
      userId: registerResponse.data.user?.id,
      message: registerResponse.data.message
    });
    
    if (registerResponse.data.success) {
      console.log('🎉 注册成功！新用户ID:', registerResponse.data.user.id);
      
      // 4. 验证邀请记录是否创建
      console.log('🔍 第4步：检查邀请记录...');
      // 这里需要查询积分记录来验证邀请是否生效
      console.log('请查看后端日志中是否有邀请处理的相关信息');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    
    if (error.response?.status === 400 && error.response?.data?.message?.includes('验证码')) {
      console.log('💡 提示：请从后端控制台获取实际的验证码，然后手动测试');
    }
  }
}

// 测试邀请链接URL解析
function testInviteLinkParsing() {
  console.log('\n🔗 测试邀请链接URL解析...');
  
  const testUrls = [
    'http://localhost:3000/?aff=1',
    'http://localhost:3000/?aff=123',
    'http://localhost:3000/login?aff=456'
  ];
  
  testUrls.forEach(url => {
    const urlObj = new URL(url);
    const affParam = urlObj.searchParams.get('aff');
    console.log(`🔍 URL: ${url} -> aff参数: ${affParam}`);
  });
}

console.log('🧪 邀请注册流程测试脚本');
console.log('=====================================');

testInviteLinkParsing();
testInviteRegistration();

// 提供手动测试步骤
console.log('\n📋 手动测试步骤:');
console.log('1. 访问邀请链接: http://localhost:3000/?aff=1');
console.log('2. 注册新账号');
console.log('3. 查看后端控制台日志，确认是否有以下信息:');
console.log('   - "🎯 检测到邀请人ID，开始处理邀请关系: 1"');
console.log('   - "✅ 邀请关系处理成功"');
console.log('4. 登录邀请人账号，查看积分是否增加10分');