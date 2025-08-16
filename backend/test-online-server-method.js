// 测试线上服务器的getPaymentPackages方法是否被正确调用
const axios = require('axios');

async function testOnlineServerMethod() {
  try {
    console.log('🔍 测试线上服务器方法调用...\n');
    
    // 1. 先测试基本的API响应
    console.log('1️⃣ 测试基本API响应:');
    const response = await axios.get('https://quiz.playoffer.cn/api/payment/packages', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TestBot/1.0)',
        'Accept': 'application/json'
      }
    });
    
    console.log('   状态码:', response.status);
    console.log('   响应头 Content-Type:', response.headers['content-type']);
    console.log('   响应数据:', JSON.stringify(response.data, null, 2));
    
    // 2. 检查响应结构
    if (response.data && response.data.success === true) {
      console.log('\n2️⃣ 响应结构分析:');
      console.log('   success:', response.data.success);
      console.log('   data 类型:', typeof response.data.data);
      console.log('   data 是否为数组:', Array.isArray(response.data.data));
      console.log('   data 长度:', response.data.data ? response.data.data.length : 'undefined');
      console.log('   message:', response.data.message);
      
      if (Array.isArray(response.data.data) && response.data.data.length === 0) {
        console.log('\n❌ 问题确认: API返回空数组');
        console.log('   可能原因:');
        console.log('   1. getPaymentPackages方法返回了空数组');
        console.log('   2. 数据库查询条件有问题');
        console.log('   3. 数据库连接或查询失败');
        console.log('   4. 方法内部有异常被捕获');
      }
    } else {
      console.log('\n❌ API响应格式异常');
    }
    
    // 3. 测试是否是缓存问题
    console.log('\n3️⃣ 测试缓存问题:');
    const cacheHeaders = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'If-None-Match': '"' + Date.now() + '"'
    };
    
    const noCacheResponse = await axios.get('https://quiz.playoffer.cn/api/payment/packages?' + Date.now(), {
      timeout: 10000,
      headers: {
        ...cacheHeaders,
        'User-Agent': 'Mozilla/5.0 (compatible; TestBot/1.0)',
        'Accept': 'application/json'
      }
    });
    
    console.log('   无缓存请求结果:', JSON.stringify(noCacheResponse.data, null, 2));
    
    // 4. 建议解决方案
    console.log('\n🔧 建议解决方案:');
    console.log('1. 检查线上服务器控制台日志，看是否有错误输出');
    console.log('2. 确认线上服务器的getPaymentPackages方法是否被正确定义');
    console.log('3. 重启线上服务器进程');
    console.log('4. 检查线上数据库连接配置是否正确');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

testOnlineServerMethod();