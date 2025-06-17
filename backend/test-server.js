const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// 基础中间件
app.use(cors());
app.use(express.json());

// 模拟数据
const users = [];
const configs = new Map();

// 简单的JWT模拟（仅用于测试）
function generateToken(user) {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

function verifyToken(token) {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString());
  } catch {
    return null;
  }
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'test'
    }
  });
});

// 用户注册
app.post('/api/auth/register', (req, res) => {
  const { username, password, email } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: '用户名和密码不能为空'
    });
  }

  // 检查用户是否已存在
  if (users.find(u => u.username === username)) {
    return res.status(409).json({
      success: false,
      error: '用户名已存在'
    });
  }

  const user = {
    id: Date.now().toString(),
    username,
    email: email || null,
    createdAt: new Date().toISOString()
  };

  users.push({ ...user, password });

  // 创建默认配置
  configs.set(user.id, {
    selectedProvider: 'claude',
    extractionModel: 'claude-3-7-sonnet-20250219',
    solutionModel: 'claude-3-7-sonnet-20250219', 
    debuggingModel: 'claude-3-7-sonnet-20250219',
    language: 'python',
    opacity: 1.0,
    showCopyButton: true
  });

  res.json({
    success: true,
    data: user,
    message: '用户注册成功'
  });
});

// 用户登录
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: '用户名和密码不能为空'
    });
  }

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: '用户名或密码错误'
    });
  }

  const token = generateToken({ id: user.id, username: user.username, email: user.email });

  res.json({
    success: true,
    data: {
      token,
      refreshToken: token + '_refresh',
      expiresIn: '1h',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    },
    message: '登录成功'
  });
});

// 获取用户配置
app.get('/api/config', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '未提供访问令牌'
    });
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: '访问令牌无效'
    });
  }

  const config = configs.get(user.id) || {
    selectedProvider: 'claude',
    extractionModel: 'claude-3-7-sonnet-20250219',
    solutionModel: 'claude-3-7-sonnet-20250219',
    debuggingModel: 'claude-3-7-sonnet-20250219',
    language: 'python',
    opacity: 1.0,
    showCopyButton: true
  };

  res.json({
    success: true,
    data: config
  });
});

// 更新用户配置
app.put('/api/config', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '未提供访问令牌'
    });
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: '访问令牌无效'
    });
  }

  const currentConfig = configs.get(user.id) || {};
  const updatedConfig = { ...currentConfig, ...req.body };
  configs.set(user.id, updatedConfig);

  res.json({
    success: true,
    data: updatedConfig,
    message: '配置更新成功'
  });
});

// 获取支持的AI模型
app.get('/api/config/models', (req, res) => {
  const models = {
    claude: [
      { id: 'claude-sonnet-4-20250514-thinking', name: 'Claude Sonnet 4 (Thinking)', category: 'general' },
      { id: 'claude-3-7-sonnet-thinking', name: 'Claude 3.7 Sonnet (Thinking)', category: 'general' },
      { id: 'claude-opus-4-20250514-thinking', name: 'Claude Opus 4 (Thinking)', category: 'general' },
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', category: 'general' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', category: 'general' }
    ],
    gemini: [
      { id: 'gemini-2.5-flash-preview-04-17-thinking', name: 'Gemini 2.5 Flash (Thinking)', category: 'general' },
      { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash', category: 'general' },
      { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro', category: 'general' },
      { id: 'gemini-2.5-pro-preview-06-05-thinking', name: 'Gemini 2.5 Pro (Thinking)', category: 'general' }
    ],
    openai: [
      { id: 'chatgpt-4o-latest', name: 'ChatGPT 4o Latest', category: 'general' },
      { id: 'o3-mini', name: 'O3 Mini', category: 'general' }
    ]
  };

  res.json({
    success: true,
    data: {
      models,
      providers: ['claude', 'gemini', 'openai']
    }
  });
});

// 获取编程语言列表
app.get('/api/config/languages', (req, res) => {
  const languages = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'swift', label: 'Swift' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'scala', label: 'Scala' }
  ];

  res.json({
    success: true,
    data: languages
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 测试服务器运行在端口 ${PORT}`);
  console.log(`🔗 API地址: http://localhost:${PORT}`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health`);
  console.log(`📱 注册用户: POST http://localhost:${PORT}/api/auth/register`);
  console.log(`🔑 用户登录: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`⚙️ 获取配置: GET http://localhost:${PORT}/api/config`);
});

// 错误处理
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '请求的资源不存在'
  });
}); 