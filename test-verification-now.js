// 测试验证码发送
console.log('🧪 直接测试验证码发送API');

const http = require('http');

// 测试发送验证码
const testSendCode = () => {
  const postData = JSON.stringify({
    email: '2694954588@qq.com'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth-enhanced/send-verification-code',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('📤 发送验证码请求...');
  console.log(`   邮箱: 2694954588@qq.com`);
  console.log(`   API: http://localhost:3001/api/auth-enhanced/send-verification-code`);

  const req = http.request(options, (res) => {
    console.log(`\n📥 响应状态码: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('📄 响应内容:');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.success) {
          console.log('\n✅ 验证码发送成功!');
          console.log(`   Token: ${response.token}`);
          console.log(`   过期时间: ${response.expiresIn}秒`);
        } else {
          console.log('\n❌ 验证码发送失败');
          console.log(`   错误: ${response.error}`);
        }
      } catch (error) {
        console.log('\n📄 原始响应:', data);
        console.log('❌ 响应解析失败:', error.message);
      }
    });
  });

  req.on('error', (err) => {
    console.log('\n❌ 请求失败');
    if (err.code === 'ECONNREFUSED') {
      console.log('   原因: 后端服务未启动');
      console.log('   解决: 启动后端服务');
      console.log('     cd backend');
      console.log('     npx ts-node src/server-enhanced.ts');
    } else {
      console.log(`   错误: ${err.message}`);
    }
  });

  req.write(postData);
  req.end();
};

// 先检查服务状态
const checkHealth = () => {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET'
    }, (res) => {
      console.log(`✅ 后端服务运行正常 (状态码: ${res.statusCode})`);
      resolve(true);
    });

    req.on('error', () => {
      console.log('❌ 后端服务未启动');
      resolve(false);
    });

    req.end();
  });
};

// 主执行流程
async function main() {
  console.log('\n🔍 第1步：检查后端服务状态');
  const isHealthy = await checkHealth();
  
  if (!isHealthy) {
    console.log('\n🚀 请先启动后端服务：');
    console.log('   cd backend');
    console.log('   npx ts-node src/server-enhanced.ts');
    return;
  }
  
  console.log('\n🔍 第2步：测试验证码发送');
  setTimeout(testSendCode, 1000);
}

main(); 