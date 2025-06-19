const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = 3001;

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

// 静态文件服务
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// OAuth登录页面路由
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/auth/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth-success.html'));
});

app.get('/auth/error', (req, res) => {
  res.status(400).json({ 
    error: '认证失败',
    message: '登录过程中发生错误，请重试'
  });
});

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
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: '用户已存在' });
    }

    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.createUser({
      username: username || email.split('@')[0],
      email,
      password: hashedPassword
    });

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

    // 存储刷新令牌到数据库
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
    await db.storeRefreshToken(newUser.id, refreshToken, expiresAt.toISOString());

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
    const user = await db.getUserByUsernameOrEmail(username);
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

    // 存储刷新令牌到数据库
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
    await db.storeRefreshToken(user.id, refreshToken, expiresAt.toISOString());

    console.log(`✅ 用户 ${user.username} 登录成功`);

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

// OAuth回调接口（用于Electron客户端登录）
app.post('/api/auth/oauth/callback', async (req, res) => {
  try {
    console.log('🔐 收到OAuth回调请求:', req.body);
    const { code, provider } = req.body;

    // 简化的OAuth处理 - 在真实应用中这里会验证code
    // 这里我们创建一个演示用户或使用现有用户
    let user = await db.getUserByEmail('demo@example.com');
    
    if (!user) {
      // 创建演示用户
      const hashedPassword = await bcrypt.hash('demo123', 10);
      user = await db.createUser({
        username: `${provider}_demo_user`,
        email: 'demo@example.com',
        password: hashedPassword
      });
      console.log('✅ 创建了演示用户:', user.username);
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

    // 存储刷新令牌到数据库
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
    await db.storeRefreshToken(user.id, refreshToken, expiresAt.toISOString());

    console.log(`✅ OAuth登录成功，用户: ${user.username}`);

    res.json({
      success: true,
      token: accessToken, // 注意这里返回的字段名是 token，不是 accessToken
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      refreshToken
    });
  } catch (error) {
    console.error('OAuth回调处理失败:', error);
    res.status(500).json({ 
      success: false,
      error: 'OAuth登录失败，请重试' 
    });
  }
});

// 获取当前用户
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 检查Web端会话状态（不需要认证，用于Electron客户端检查）
app.get('/api/auth/web-session-status', async (req, res) => {
  try {
    // 检查是否有活跃的共享会话文件
    const fs = require('fs');
    const path = require('path');
    const sharedSessionPath = path.join(__dirname, '..', 'shared-session.json');
    
    if (!fs.existsSync(sharedSessionPath)) {
      return res.json({ 
        hasActiveSession: false,
        message: 'No active web session found'
      });
    }
    
    const sharedSession = JSON.parse(fs.readFileSync(sharedSessionPath, 'utf8'));
    
    // 检查会话是否过期
    const now = new Date();
    const expiresAt = new Date(sharedSession.expiresAt);
    
    if (now > expiresAt) {
      // 删除过期的会话文件
      fs.unlinkSync(sharedSessionPath);
      return res.json({ 
        hasActiveSession: false,
        message: 'Web session expired'
      });
    }
    
    console.log(`✅ 检测到活跃的Web会话，用户: ${sharedSession.user.username}`);
    
    res.json({
      hasActiveSession: true,
      user: sharedSession.user,
      message: `Active web session for ${sharedSession.user.username}`
    });
  } catch (error) {
    console.error('检查Web会话状态失败:', error);
    res.json({ 
      hasActiveSession: false,
      message: 'Error checking web session'
    });
  }
});

// Web端登录时创建共享token文件
app.post('/api/auth/create-shared-session', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 创建共享会话文件供Electron客户端使用');
    
    const userId = req.user.userId;
    const user = await db.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 生成新的token给Electron客户端使用
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' } // 延长到7天
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // 存储刷新令牌到数据库
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
    await db.storeRefreshToken(user.id, refreshToken, expiresAt.toISOString());
    
    // 创建共享会话文件
    const sharedSession = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    
    const fs = require('fs');
    const path = require('path');
    const sharedSessionPath = path.join(__dirname, '..', 'shared-session.json');
    
    fs.writeFileSync(sharedSessionPath, JSON.stringify(sharedSession, null, 2));
    
    console.log(`✅ 共享会话文件已创建，用户: ${user.username}`);
    
    res.json({
      success: true,
      message: '共享会话已创建'
    });
  } catch (error) {
    console.error('创建共享会话失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '服务器内部错误' 
    });
  }
});

// 获取共享会话（供Electron客户端使用）
app.get('/api/auth/shared-session', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const sharedSessionPath = path.join(__dirname, '..', 'shared-session.json');
    
    if (!fs.existsSync(sharedSessionPath)) {
      return res.status(404).json({ 
        success: false, 
        error: '未找到共享会话' 
      });
    }
    
    const sharedSession = JSON.parse(fs.readFileSync(sharedSessionPath, 'utf8'));
    
    // 检查会话是否过期
    const now = new Date();
    const expiresAt = new Date(sharedSession.expiresAt);
    
    if (now > expiresAt) {
      // 删除过期的会话文件
      fs.unlinkSync(sharedSessionPath);
      return res.status(404).json({ 
        success: false, 
        error: '共享会话已过期' 
      });
    }
    
    console.log(`✅ Electron客户端获取共享会话，用户: ${sharedSession.user.username}`);
    
    res.json({
      success: true,
      ...sharedSession
    });
  } catch (error) {
    console.error('获取共享会话失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '服务器内部错误' 
    });
  }
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
app.get('/api/config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const config = await db.getUserConfig(userId);
    
    console.log(`📋 获取用户 ${userId} 的配置:`, {
      aiModel: config.aiModel,
      programmingModel: config.programmingModel,
      multipleChoiceModel: config.multipleChoiceModel,
      language: config.language
    });
    
    res.json(config);
  } catch (error) {
    console.error('❌ 获取配置失败:', error);
    res.status(500).json({ error: '获取配置失败' });
  }
});

// 更新用户配置
app.put('/api/config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log(`🔄 用户 ${userId} 请求更新配置:`, req.body);
    
    const updatedConfig = await db.updateUserConfig(userId, req.body);
    
    console.log(`✅ 用户 ${userId} 配置已更新:`, {
      aiModel: updatedConfig.aiModel,
      programmingModel: updatedConfig.programmingModel,
      multipleChoiceModel: updatedConfig.multipleChoiceModel,
      language: updatedConfig.language
    });
    
    res.json(updatedConfig);
  } catch (error) {
    console.error('❌ 更新配置失败:', error);
    res.status(500).json({ error: '更新配置失败' });
  }
});

// 刷新token端点
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: '刷新令牌缺失' });
    }
    
    // 验证刷新token（包括数据库验证）
    const tokenData = await db.validateRefreshToken(refreshToken);
    
    if (!tokenData) {
      return res.status(401).json({ error: '刷新令牌无效或已过期' });
    }
    
    // 生成新的访问token
    const accessToken = jwt.sign(
      { userId: tokenData.userId, email: tokenData.email },
      JWT_SECRET,
      { expiresIn: '7d' } // 延长到7天
    );
    
    console.log(`🔄 用户 ${tokenData.username} 刷新访问令牌`);
    res.json({ 
      success: true,
      token: accessToken,  // 客户端期望的字段名
      accessToken: accessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: '刷新令牌无效' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
}); 