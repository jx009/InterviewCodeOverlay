# Interview Coder Backend

Interview Coder 应用的后端服务，提供用户认证、配置管理和AI模型代理功能。

## 🚀 功能特性

- **用户认证**: JWT-based 认证系统，支持注册、登录、刷新token
- **配置管理**: 用户个人配置（AI模型选择、编程语言偏好等）
- **AI模型代理**: 统一的AI模型调用接口
- **数据持久化**: 使用PostgreSQL + Prisma ORM
- **安全性**: 内置速率限制、CORS、Helmet安全头
- **WebSocket支持**: 实时配置同步（计划中）

## 📋 支持的AI模型

### Claude系列
- `claude-sonnet-4-20250514-thinking`
- `claude-3-7-sonnet-thinking`
- `claude-opus-4-20250514-thinking`
- `claude-3-7-sonnet-20250219`
- `claude-sonnet-4-20250514`

### Gemini系列
- `gemini-2.5-flash-preview-04-17-thinking`
- `gemini-2.5-flash-preview-04-17`
- `gemini-2.5-pro-preview-06-05`
- `gemini-2.5-pro-preview-06-05-thinking`

### OpenAI系列
- `chatgpt-4o-latest`
- `o3-mini`

## 🛠️ 技术栈

- **运行时**: Node.js + TypeScript
- **框架**: Express.js
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: JWT (jsonwebtoken + bcryptjs)
- **验证**: express-validator
- **安全**: helmet, cors, express-rate-limit
- **日志**: morgan
- **工具**: compression, dotenv

## 📦 安装依赖

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 生成Prisma客户端
npm run generate
```

## ⚙️ 环境配置

复制 `env.example` 到 `.env` 并配置以下变量：

```bash
# 数据库连接
DATABASE_URL="postgresql://username:password@localhost:5432/interview_coder"

# JWT密钥
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"

# 服务器配置
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000,http://localhost:54321"

# AI API密钥（可选，用于直接调用）
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
GOOGLE_API_KEY="your-google-api-key"
```

## 🗄️ 数据库设置

```bash
# 生成并运行数据库迁移
npm run migrate

# 种子数据（可选）
npm run seed

# 打开Prisma Studio查看数据
npm run studio
```

## 🚦 运行服务

```bash
# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 生产运行
npm start
```

## 📡 API 端点

### 认证相关 (`/api/auth`)

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新token
- `GET /api/auth/me` - 获取当前用户信息
- `POST /api/auth/logout` - 用户登出

### 配置管理 (`/api/config`)

- `GET /api/config` - 获取用户配置
- `PUT /api/config` - 更新用户配置
- `GET /api/config/models` - 获取支持的AI模型列表
- `GET /api/config/languages` - 获取支持的编程语言列表
- `POST /api/config/reset` - 重置配置到默认值

### 系统相关

- `GET /health` - 健康检查

## 📝 API 使用示例

### 用户注册
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "email": "test@example.com"
  }'
```

### 用户登录
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 获取用户配置
```bash
curl -X GET http://localhost:3001/api/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 更新配置
```bash
curl -X PUT http://localhost:3001/api/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "selectedProvider": "claude",
    "extractionModel": "claude-3-7-sonnet-20250219",
    "language": "python"
  }'
```

## 🔒 认证机制

系统使用JWT双token机制：

1. **Access Token**: 短期token（默认1小时），用于API访问
2. **Refresh Token**: 长期token（默认7天），用于刷新access token

客户端应在请求头中携带access token：
```
Authorization: Bearer <access_token>
```

## 📊 数据库模型

### User (用户表)
- `id`: 用户唯一标识
- `username`: 用户名（唯一）
- `email`: 邮箱（可选，唯一）
- `password`: 加密密码
- `isActive`: 账户状态
- `createdAt/updatedAt`: 时间戳

### UserConfig (用户配置表)
- `userId`: 关联用户ID
- `selectedProvider`: 选择的AI服务商
- `extractionModel/solutionModel/debuggingModel`: 不同场景使用的模型
- `language`: 编程语言偏好
- `opacity/showCopyButton`: UI设置

### UserSession (用户会话表)
- `userId`: 关联用户ID
- `token/refreshToken`: JWT token对
- `expiresAt`: 过期时间
- `isActive`: 会话状态

### UsageRecord (使用记录表)
- `userId`: 关联用户ID
- `action`: 操作类型（extraction/solution/debugging）
- `model/provider`: 使用的模型信息
- `tokensUsed`: 消耗的token数量
- `success`: 操作是否成功

## 🚨 错误处理

API统一返回格式：

```json
{
  "success": boolean,
  "data": any,        // 成功时的数据
  "message": string,  // 成功消息
  "error": string     // 错误消息
}
```

常见HTTP状态码：
- `200`: 成功
- `400`: 请求参数错误
- `401`: 未认证
- `403`: 无权限
- `404`: 资源不存在
- `409`: 冲突（如用户名已存在）
- `429`: 请求过于频繁
- `500`: 服务器内部错误

## 🔧 开发工具

```bash
# 代码检查
npm run lint

# 运行测试
npm test

# 数据库管理界面
npm run studio
```

## 📈 性能优化

- 使用compression中间件进行响应压缩
- 实现请求速率限制
- 数据库查询优化
- 适当的错误处理和日志记录

## 🔄 部署建议

1. **环境变量**: 确保生产环境的敏感信息通过环境变量配置
2. **数据库**: 使用托管的PostgreSQL服务（如Supabase、PlanetScale）
3. **服务器**: 可部署到Railway、Render、DigitalOcean等平台
4. **监控**: 建议添加服务监控和日志聚合

## 🤝 贡献

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建Pull Request

## 📄 许可证

AGPL-3.0-or-later 