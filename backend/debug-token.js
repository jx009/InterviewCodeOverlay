const jwt = require('jsonwebtoken');

// 从测试中获取的token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc1MDYwMjc1MiwiZXhwIjoxNzUxMjA3NTUyfQ.twBAvLtcT2I0AQY_iC1y9ihHwqZXrUNk_GeV70k0hFw';

console.log('🔍 解析JWT Token...');

try {
  // 解码不验证签名
  const decoded = jwt.decode(token);
  console.log('Token内容:', decoded);
  
  // 验证签名
  const jwtSecret = process.env.JWT_SECRET || '4Dnk+6GfsjodO324FbDhhYaFAGeaLy+UyuAy/Oeh7n7kyRtrxzPmJ1CiGjtMIo5zQTBG5+vU8cZtCMV2+F4EiA==';
  const verified = jwt.verify(token, jwtSecret);
  console.log('验证成功:', verified);
} catch (error) {
  console.error('Token验证失败:', error.message);
} 