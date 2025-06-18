const axios = require('axios');

async function testConnection() {
  console.log('🔍 测试客户端到后端的连接...');
  
  try {
    console.log('📡 尝试连接到 http://localhost:3001/api/health');
    
    const response = await axios.get('http://localhost:3001/api/health', {
      timeout: 10000,
      headers: {
        'User-Agent': 'ElectronApp/1.0'
      }
    });
    
    console.log('✅ 连接成功!');
    console.log('📋 响应数据:', response.data);
    console.log('🔢 状态码:', response.status);
    
  } catch (error) {
    console.error('❌ 连接失败:');
    console.error('🔍 错误类型:', error.code);
    console.error('📝 错误消息:', error.message);
    
    if (error.response) {
      console.error('📊 响应状态:', error.response.status);
      console.error('📋 响应数据:', error.response.data);
    }
  }
}

testConnection(); 