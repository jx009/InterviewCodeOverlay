# MySQL数据库迁移指南

## 概述
本指南帮助您将项目从SQLite数据库迁移到MySQL，并集成Redis用于会话管理和验证码存储。

## 迁移前准备

### 1. 安装MySQL服务器
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# CentOS/RHEL
sudo yum install mysql-server

# macOS (使用Homebrew)
brew install mysql

# Windows
# 下载并安装MySQL官方安装包
```

### 2. 安装Redis服务器
```bash
# Ubuntu/Debian
sudo apt install redis-server

# CentOS/RHEL
sudo yum install redis

# macOS (使用Homebrew)
brew install redis

# Windows
# 下载并安装Redis官方Windows版本
```

### 3. 创建数据库和用户
```sql
-- 登录MySQL root用户
mysql -u root -p

-- 创建数据库
CREATE DATABASE interview_coder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户
CREATE USER 'interview_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- 授权
GRANT ALL PRIVILEGES ON interview_coder.* TO 'interview_user'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

## 环境配置

### 1. 复制环境配置文件
```bash
cp env.example .env
```

### 2. 修改.env文件
```env
# 数据库配置
DATABASE_URL="mysql://interview_user:your_secure_password@localhost:3306/interview_coder"

# Redis配置
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""
REDIS_DB=0

# JWT密钥（请生成强密钥）
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"

# 邮件配置（用于发送验证码）
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="your-email@gmail.com"

# 其他配置保持默认即可
```

## 执行迁移

### 1. 安装依赖
```bash
cd backend
npm install
```

### 2. 初始化MySQL数据库
```bash
npm run db:init
```

### 3. 生成Prisma客户端
```bash
npm run generate
```

### 4. 运行数据库迁移
```bash
npm run migrate
```

### 5. 验证连接
```bash
npm run db:check
```

## 验证迁移结果

### 1. 检查数据表
```sql
mysql -u interview_user -p interview_coder

SHOW TABLES;

-- 应该看到以下表：
-- users
-- user_configs  
-- user_sessions
-- usage_records
-- ai_models
-- email_verification_codes
-- redis_sessions
-- _prisma_migrations
```

### 2. 检查Redis连接
```bash
redis-cli ping
# 应该返回 PONG
```

### 3. 启动开发服务
```bash
npm run dev
```

## 主要变更说明

### 1. 数据库架构变更
- **ID字段**: 从`String (cuid())`改为`Int (autoincrement())`
- **字段名**: 统一使用snake_case映射（如`created_at`）
- **字段类型**: 添加适当的VARCHAR长度限制和TEXT类型
- **索引**: MySQL自动优化索引性能

### 2. 新增功能
- **邮箱验证码表**: 支持注册时的邮箱验证
- **Redis会话管理**: 高性能的会话存储
- **备份会话表**: Redis的MySQL备份机制

### 3. 性能优化
- **连接池**: MySQL支持更好的连接池管理
- **事务处理**: 更稳定的ACID特性
- **并发处理**: 支持更高的并发访问

## 故障排除

### 1. 连接错误
```bash
# 检查MySQL服务状态
sudo systemctl status mysql

# 检查Redis服务状态  
sudo systemctl status redis

# 检查端口占用
netstat -tulpn | grep :3306
netstat -tulpn | grep :6379
```

### 2. 权限问题
```sql
-- 检查用户权限
SELECT User, Host FROM mysql.user WHERE User = 'interview_user';
SHOW GRANTS FOR 'interview_user'@'localhost';
```

### 3. 字符集问题
```sql
-- 检查数据库字符集
SELECT SCHEMA_NAME, DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME 
FROM INFORMATION_SCHEMA.SCHEMATA 
WHERE SCHEMA_NAME = 'interview_coder';
```

## 数据迁移（如果需要）

如果您有现有的SQLite数据需要迁移：

### 1. 导出SQLite数据
```bash
sqlite3 interview_overlay.db .dump > sqlite_backup.sql
```

### 2. 转换SQL语法
```bash
# 使用工具转换SQLite SQL到MySQL格式
# 或手动调整数据类型和语法差异
```

### 3. 导入MySQL
```bash
mysql -u interview_user -p interview_coder < converted_data.sql
```

## 完成
迁移完成后，您的项目将使用：
- ✅ MySQL作为主数据库
- ✅ Redis用于会话和缓存
- ✅ 邮件验证码功能
- ✅ 改进的认证系统
- ✅ 更好的性能和稳定性

如有问题，请检查日志或联系技术支持。 