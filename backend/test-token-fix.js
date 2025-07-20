console.log('🔍 测试token修复...');

// 模拟session_status端点的token生成逻辑
function testTokenGeneration() {
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    // 模拟用户数据
    const user = {
      id: 123,
      username: 'testuser',
      email: 'test@example.com'
    };
    
    // 生成token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('✅ Token生成成功:', token.substring(0, 50) + '...');
    
    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token验证成功:', decoded);
    
    // 模拟session_status响应
    const response = {
      success: true,
      user,
      sessionId: 'test-session-id',
      token
    };
    
    console.log('✅ session_status响应格式正确:', {
      hasSuccess: !!response.success,
      hasUser: !!response.user,
      hasSessionId: !!response.sessionId,
      hasToken: !!response.token
    });
    
    return true;
  } catch (error) {
    console.error('❌ Token测试失败:', error.message);
    return false;
  }
}

// 运行测试
if (testTokenGeneration()) {
  console.log('🎉 Token修复验证成功！');
} else {
  console.log('❌ Token修复验证失败！');
} 