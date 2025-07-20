// 简单的服务状态检查
console.log('🔍 检查后端服务状态...');

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ 后端服务正常运行');
      console.log(`   状态码: ${res.statusCode}`);
      try {
        const parsed = JSON.parse(data);
        console.log(`   服务状态: ${parsed.status}`);
        console.log(`   服务名称: ${parsed.service}`);
      } catch (e) {
        console.log(`   响应数据: ${data}`);
      }
    } else {
      console.log(`❌ 后端服务响应异常 - 状态码: ${res.statusCode}`);
    }
  });
});

req.on('error', (err) => {
  console.log('❌ 后端服务无法访问');
  if (err.code === 'ECONNREFUSED') {
    console.log('   原因: 连接被拒绝 - 后端服务未启动');
    console.log('   解决方案:');
    console.log('   1. 运行: start-enhanced.bat');
    console.log('   2. 或手动启动:');
    console.log('      cd backend');
    console.log('      npm run build');
    console.log('      node dist/server-enhanced.js');
  } else {
    console.log(`   错误: ${err.message}`);
  }
});

req.on('timeout', () => {
  console.log('❌ 请求超时 - 服务可能未响应');
  req.destroy();
});

req.end(); 