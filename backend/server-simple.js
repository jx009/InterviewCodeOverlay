const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;

// 内存数据库（临时用于测试）
const users = [];
const JWT_SECRET = 'interview-coder-secret-key';
const REFRESH_SECRET = 'interview-coder-refresh-secret';

// AI模型数据
const aiModels = [
  { id: 1, name: 'claude-sonnet-4-20250514-thinking', displayName: 'Claude Sonnet 4 Thinking', provider: 'anthropic', category: 'premium' },
  { id: 2, name: 'claude-3-7-sonnet-thinking', displayName: 'Claude 3.7 Sonnet Thinking', provider: 'anthropic', category: 'premium' },
  { id: 3, name: 'claude-opus-4-20250514-thinking', displayName: 'Claude Opus 4 Thinking', provider: 'anthropic', category: 'premium' },
  { id: 4, name: 'claude-3-7-sonnet-20250219', displayName: 'Claude 3.7 Sonnet', provider: 'anthropic', category: 'standard' },
  { id: 5, name: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', provider: 'anthropic', category: 'standard' },
  { id: 6, name: 'gemini-2.5-flash-preview-04-17-thinking', displayName: 'Gemini 2.5 Flash Thinking', provider: 'google', category: 'premium' },
  { id: 7, name: 'gemini-2.5-flash-preview-04-17', displayName: 'Gemini 2.5 Flash', provider: 'google', category: 'standard' },
  { id: 8, name: 'gemini-2.5-pro-preview-06-05', displayName: 'Gemini 2.5 Pro', provider: 'google', category: 'standard' },
  { id: 9, name: 'gemini-2.5-pro-preview-06-05-thinking', displayName: 'Gemini 2.5 Pro Thinking', provider: 'google', category: 'premium' },
  { id: 10, name: 'chatgpt-4o-latest', displayName: 'ChatGPT 4o Latest', provider: 'openai', category: 'standard' },
  { id: 11, name: 'o3-mini', displayName: 'GPT o3 Mini', provider: 'openai', category: 'premium' }
];

// 中间件
app.use(cors());
app.use(express.json());

// 身份验证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '访问令牌无效' });
    }
    req.user = user;
    next();
  });
};

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Register request received:', req.body);
    const { email, password, username } = req.body;

    // 基本验证
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    // 检查用户是否已存在
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: '用户已存在' });
    }

    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: users.length + 1,
      email,
      username: username || email.split('@')[0],
      password: hashedPassword,
      createdAt: new Date()
    };

    users.push(newUser);
    console.log('User registered successfully:', newUser.email);

    // 生成tokens
    const accessToken = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: newUser.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const response = {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username
      },
      accessToken,
      refreshToken
    };

    console.log('Registration response:', { ...response, accessToken: 'HIDDEN', refreshToken: 'HIDDEN' });
    res.status(201).json(response);
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户（可以用email或username）
    const user = users.find(u => u.email === username || u.username === username);
    if (!user) {
      return res.status(400).json({ error: '用户不存在' });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: '密码错误' });
    }

    // 生成tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取当前用户
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  res.json({
    id: user.id,
    email: user.email,
    username: user.username
  });
});

// 获取AI模型列表
app.get('/api/config/models', authenticateToken, (req, res) => {
  res.json(aiModels);
});

// 获取编程语言列表
app.get('/api/config/languages', authenticateToken, (req, res) => {
  const languages = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 
    'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'Other'
  ];
  res.json(languages);
});

// 获取用户配置
app.get('/api/config', authenticateToken, (req, res) => {
  // 返回默认配置
  res.json({
    selectedModel: 'claude-sonnet-4-20250514',
    preferredLanguages: ['JavaScript', 'TypeScript'],
    theme: 'dark',
    showLineNumbers: true,
    autoSave: true
  });
});

// 更新用户配置
app.put('/api/config', authenticateToken, (req, res) => {
  // 简单返回更新后的配置
  res.json(req.body);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
}); 