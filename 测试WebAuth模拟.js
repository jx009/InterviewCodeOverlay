const axios = require('axios');

class TestWebAuthManager {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3001';
    this.tokens = null;
    this.user = null;
    this.userConfig = null;
  }

  async checkWebServerStatus() {
    try {
      console.log(`🔍 Checking web server at: ${this.apiBaseUrl}/api/health`);
      const response = await axios.get(`${this.apiBaseUrl}/api/health`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'ElectronApp/1.0'
        }
      });
      
      console.log(`✅ Web server response:`, response.data);
      
      if (response.data.status !== 'ok') {
        throw new Error('Web server is not responding correctly');
      }
      
      console.log('✅ Web server health check passed');
    } catch (error) {
      console.error('❌ Web server check failed:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Web服务器连接被拒绝，请确保后端服务正在运行在端口3001');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Web服务器连接超时，请检查网络连接');
      } else {
        throw new Error(`Web服务器检查失败: ${error.message}`);
      }
    }
  }

  async checkConnection() {
    try {
      await this.checkWebServerStatus();
      return true;
    } catch (error) {
      return false;
    }
  }

  async initializeAuth() {
    try {
      console.log('🚀 Initializing authentication...');
      
      // 检查Web服务器是否运行
      const isServerRunning = await this.checkConnection();
      if (!isServerRunning) {
        console.log('⚠️ Web server not running, user needs to start web services');
        return false;
      }
      
      console.log('✅ Web server is running');
      
      // 模拟没有tokens的情况
      if (!this.tokens) {
        console.log('🔐 No valid authentication found, user needs to login');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize authentication:', error);
      return false;
    }
  }
}

async function test() {
  console.log('='.repeat(50));
  console.log('🧪 测试 WebAuthManager 初始化认证流程');
  console.log('='.repeat(50));
  
  const authManager = new TestWebAuthManager();
  const result = await authManager.initializeAuth();
  
  console.log('='.repeat(50));
  console.log(`🎯 认证初始化结果: ${result ? '成功' : '失败'}`);
  console.log('='.repeat(50));
}

test(); 