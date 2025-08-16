// 简单的LLM路由测试，不依赖复杂的类型
const express = require('express');

const router = express.Router();

// 超简单的测试路由
router.get('/simple-test', (req, res) => {
  console.log('📡 简单LLM测试路由被访问');
  res.json({ 
    success: true, 
    message: '简单LLM路由工作正常', 
    timestamp: new Date().toISOString() 
  });
});

// LLM配置获取路由（不使用认证）
router.get('/llm/config-simple', (req, res) => {
  console.log('📡 简单LLM配置路由被访问');
  
  // 返回默认配置，不查询数据库
  const defaultConfig = {
    baseUrl: 'https://ismaque.org/v1',
    apiKey: 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP',
    maxRetries: 2,
    timeout: 30000,
    provider: 'ismaque'
  };
  
  res.json({
    success: true,
    config: defaultConfig,
    source: 'simple-test'
  });
});

module.exports = router;