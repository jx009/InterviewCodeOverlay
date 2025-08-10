# Backend API 服务

这是 InterviewCodeOverlay 的后端 API 服务，提供用户认证、配置管理等功能。

## 🚀 特性

- **现代技术栈**: Express.js + TypeScript + Prisma ORM
- **数据库支持**: MySQL + Redis
- **用户认证**: JWT token + 会话管理
- **邮件服务**: SMTP 邮件验证码
- **安全性**: 内置速率限制、CORS、Helmet安全头
- **配置灵活**: 支持环境变量和JSON配置文件

## 📦 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: MySQL (Prisma ORM)
- **缓存**: Redis
- **认证**: JWT + bcrypt
- **邮件**: Nodemailer
- **安全**: helmet, cors, express-rate-limit
- **工具**: tsx (开发), tsc (构建)

## 🔧 安装和配置

### 1. 安装依赖
```bash
cd backend
npm install
```

### 2. 配置环境变量
复制环境变量模板：
```bash
cp env.example .env
```

编辑 `.env` 文件，配置以下重要参数：

```bash
# 🔒 数据库配置
DATABASE_URL="mysql://username:password@localhost:3306/interview_coder"

# 🔒 Redis配置
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""
REDIS_DB=0

# 🔒 JWT密钥配置 - 必须使用强随机密钥！
# 生成方法: node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
JWT_SECRET="YOUR_GENERATED_STRONG_RANDOM_JWT_SECRET_HERE"
JWT_REFRESH_SECRET="YOUR_GENERATED_DIFFERENT_STRONG_RANDOM_REFRESH_SECRET_HERE"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# 🔒 邮件配置
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-secure-email@example.com"
SMTP_PASS="your-secure-app-password"
EMAIL_FROM="your-secure-email@example.com"

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000,http://localhost:54321"
```

⚠️ **安全提醒**：
- 生产环境必须使用强随机JWT密钥
- 不要使用示例中的默认值
- 保护好 `.env` 文件，不要提交到版本控制

### 3. 初始化数据库
```bash
# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate deploy

# (可选) 填充测试数据
npx prisma db seed
```

### 4. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 🛠️ 可用脚本

- `npm run dev` - 开发模式启动 (使用 tsx)
- `npm run build` - 构建项目
- `npm start` - 生产模式启动
- `npm run type-check` - TypeScript 类型检查

## 📡 API 端点

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/verify` - 验证token

### 配置相关
- `GET /api/config` - 获取配置
- `PUT /api/config` - 更新配置
- `GET /api/config/models` - 获取AI模型列表

### 健康检查
- `GET /health` - 服务健康状态

## 🔒 安全特性

- **密码加密**: 使用 bcrypt (12轮)
- **JWT认证**: 支持访问token和刷新token
- **速率限制**: 防止暴力破解
- **CORS保护**: 跨域请求控制
- **安全头**: 使用 Helmet 设置安全头
- **输入验证**: 使用 express-validator

## 📝 环境要求

- Node.js 18 或更高版本
- MySQL 8.0+
- Redis 6.0+
- 稳定的网络连接（用于邮件服务）

## 🤝 开发指南

1. 遵循 TypeScript 严格模式
2. 使用 ESLint 和 Prettier 格式化代码
3. 所有API都要有错误处理
4. 敏感数据使用环境变量
5. 定期更新依赖包

## 📞 问题反馈

如果遇到问题，请检查：
1. 数据库连接是否正常
2. Redis服务是否运行
3. 环境变量是否正确配置
4. 端口是否被占用 