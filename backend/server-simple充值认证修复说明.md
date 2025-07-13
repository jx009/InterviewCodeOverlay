# server-simple.js 充值认证修复说明

## 问题描述
- 充值界面出现401错误："未提供认证令牌"
- 前端日志显示 `hasSessionId: true` 但 `hasToken: false`
- 支付API无法正常认证

## 问题根因
1. **前端期望JWT token**：`web/src/services/api.ts` 中的 `fetchTokenFromSession` 函数期望从 `/api/session_status` 获得token
2. **支付API需要JWT token**：`server-simple.js` 中的支付API使用 `verifyToken` 中间件，需要JWT token认证
3. **session_status端点未生成token**：原来的 `session_status` 端点只返回用户信息，没有生成JWT token

## 修复方案
修改 `server-simple.js` 中的 `/api/session_status` 端点：

### 修复前
```javascript
// 只返回用户信息，没有token
res.json({
  success: true,
  user: { ... },
  loginTime: sessionData.loginTime,
  lastActivity: sessionData.lastActivity
});
```

### 修复后
```javascript
// 生成JWT token用于支付API认证
const jwtToken = generateToken();

// 将token和用户信息存储供verifyToken中间件使用
const tokenSessionData = {
  user: { ... },
  sessionId: sessionId,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

await SessionStore.set(jwtToken, tokenSessionData, 86400); // 24小时TTL

// 返回JWT token给前端
res.json({
  success: true,
  user: { ... },
  token: jwtToken, // 🆕 新增token字段
  loginTime: sessionData.loginTime,
  lastActivity: sessionData.lastActivity
});
```

## 认证流程
1. **用户登录**：获得sessionId，存储在Cookie中
2. **获取JWT token**：前端调用 `/api/session_status` 获得JWT token
3. **调用支付API**：使用JWT token访问支付相关API

## 启动和测试

### 启动服务器
```powershell
# 在backend目录中运行
.\启动server-simple.ps1
```

### 测试修复效果
```powershell
# 在backend目录中运行
.\测试充值认证修复.ps1
```

### 手动测试
1. 打开 Web 管理界面：http://localhost:3000
2. 登录用户账户
3. 访问充值页面
4. 检查是否能正常显示充值套餐

## 文件更改
- ✅ `server-simple.js` - 修复 `/api/session_status` 端点
- ✅ `test-session-token-fix.js` - 测试脚本
- ✅ `启动server-simple.ps1` - 启动脚本
- ✅ `测试充值认证修复.ps1` - 测试脚本

## 技术细节
- JWT token有效期：24小时
- 使用Redis/内存存储token数据
- 兼容现有的sessionId认证方式
- 支持Cookie和请求头两种方式传递sessionId

## 注意事项
- 确保使用的是 `server-simple.js` 而不是 `server.ts` 或 `server-enhanced.ts`
- 确保Redis服务正常运行（或使用内存存储作为fallback）
- 确保Web界面运行在端口3000，后端运行在端口3001 