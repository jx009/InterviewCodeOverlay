# Redis 配置和使用指南

## 📋 概述

Redis是InterviewCodeOverlay增强版的核心组件，用于：
- 会话管理（30位随机字符串session_id）
- 验证码存储（6位数字验证码）
- 用户状态缓存
- 邮件发送限流

## 🚀 安装 Redis

### Windows 系统

#### 方法1：下载安装包
1. 访问：https://github.com/MicrosoftArchive/redis/releases
2. 下载最新版本的 Redis-x64-*.msi
3. 安装并启动服务

#### 方法2：使用Docker
```bash
# 拉取Redis镜像
docker pull redis:latest

# 启动Redis容器
docker run --name interview-redis -p 6379:6379 -d redis:latest

# 检查是否启动成功
docker ps
```

#### 方法3：使用Chocolatey
```bash
# 安装Chocolatey (如果未安装)
# 在管理员模式下运行PowerShell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装Redis
choco install redis-64

# 启动Redis服务
redis-server
```

### Linux 系统

#### Ubuntu/Debian
```bash
# 更新包管理器
sudo apt update

# 安装Redis
sudo apt install redis-server

# 启动Redis服务
sudo systemctl start redis
sudo systemctl enable redis

# 检查状态
sudo systemctl status redis
```

#### CentOS/RHEL
```bash
# 安装EPEL存储库
sudo yum install epel-release

# 安装Redis
sudo yum install redis

# 启动Redis服务
sudo systemctl start redis
sudo systemctl enable redis
```

### macOS 系统

#### 使用Homebrew
```bash
# 安装Homebrew (如果未安装)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装Redis
brew install redis

# 启动Redis服务
brew services start redis
```

## ⚙️ 配置 Redis

### 1. 基础配置文件

创建或编辑 `redis.conf` 文件：

```conf
# 绑定地址
bind 127.0.0.1

# 端口
port 6379

# 密码（可选，建议生产环境设置）
# requirepass your_password_here

# 数据库数量
databases 16

# 持久化配置
save 900 1
save 300 10
save 60 10000

# 日志级别
loglevel notice

# 日志文件
logfile ""

# 最大内存（根据服务器配置调整）
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### 2. 环境变量配置

在项目的 `.env` 文件中配置：

```env
# Redis配置
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""
REDIS_DB=0
```

如果设置了密码：
```env
REDIS_URL="redis://:your_password@localhost:6379"
REDIS_PASSWORD="your_password"
```

## 🔧 验证安装

### 1. 检查Redis服务状态

```bash
# 检查Redis是否运行
redis-cli ping

# 应该返回: PONG
```

### 2. 测试基本操作

```bash
# 连接到Redis
redis-cli

# 设置键值
127.0.0.1:6379> SET test "Hello Redis"
# 返回: OK

# 获取值
127.0.0.1:6379> GET test
# 返回: "Hello Redis"

# 删除键
127.0.0.1:6379> DEL test
# 返回: (integer) 1

# 退出
127.0.0.1:6379> EXIT
```

### 3. 项目集成测试

启动增强版服务器后，访问健康检查接口：

```bash
curl http://localhost:3001/health
```

应该看到 Redis 状态为 "connected ✅"

## 🛠️ 在项目中的使用

### 1. 会话管理

```typescript
// 创建用户会话
const sessionManager = new SessionManager();
const sessionId = await sessionManager.createSession(userId, userAgent, ipAddress);

// 验证会话
const validation = await sessionManager.validateSession(sessionId);

// 删除会话
await sessionManager.deleteSession(sessionId);
```

### 2. 验证码管理

```typescript
// 创建验证码
const verificationManager = new VerificationManager();
const { code, token } = await verificationManager.createVerificationCode(email);

// 验证验证码
const result = await verificationManager.verifyCode(token, inputCode);
```

### 3. 数据存储结构

#### 会话数据
```
Key: session:ABC123...XYZ (30位随机字符串)
Value: {
  "userId": 123,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastActivity": "2024-01-01T00:00:00.000Z",
  "userAgent": "Mozilla/5.0...",
  "ipAddress": "192.168.1.100"
}
TTL: 7天
```

#### 用户会话列表
```
Key: user_sessions:123
Type: SET
Values: ["ABC123...XYZ", "DEF456...UVW"]
```

#### 验证码数据
```
Key: verify_code:user@example.com
Value: {
  "email": "user@example.com",
  "code": "123456",
  "token": "abcd1234...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "attempts": 0
}
TTL: 5分钟
```

#### 验证Token
```
Key: verify_token:abcd1234...
Value: 同验证码数据
TTL: 30分钟
```

## 🚨 故障排除

### 常见问题

#### 1. Redis连接失败
```
错误: Redis客户端未初始化
```

**解决方案:**
- 检查Redis服务是否启动：`redis-cli ping`
- 检查端口是否被占用：`netstat -an | findstr 6379`
- 检查防火墙设置

#### 2. 验证码发送失败
```
错误: 验证码已发送，请等待X分钟后重试
```

**解决方案:**
- 这是正常的防刷机制
- 等待指定时间后重试
- 或清理Redis中的验证码数据（开发环境）

#### 3. 会话过期
```
错误: 会话已过期或无效
```

**解决方案:**
- 用户重新登录
- 检查系统时间是否正确
- 确认Redis数据没有被意外清理

### 开发调试

#### 查看所有键
```bash
redis-cli KEYS "*"
```

#### 查看特定模式的键
```bash
# 查看所有会话
redis-cli KEYS "session:*"

# 查看所有验证码
redis-cli KEYS "verify_code:*"
```

#### 清理测试数据
```bash
# 清理所有验证码
redis-cli --scan --pattern "verify_*" | xargs redis-cli DEL

# 清理所有会话
redis-cli --scan --pattern "session:*" | xargs redis-cli DEL
```

#### 监控Redis活动
```bash
# 实时监控Redis命令
redis-cli MONITOR
```

## 📊 性能优化

### 1. 内存优化

```conf
# redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
```

### 2. 持久化配置

```conf
# 根据需要调整保存频率
save 900 1      # 900秒内至少1个key发生变化
save 300 10     # 300秒内至少10个key发生变化
save 60 10000   # 60秒内至少10000个key发生变化
```

### 3. 连接池配置

在应用中配置连接参数：

```typescript
const redisConfig = {
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 300,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};
```

## 🔒 安全建议

### 1. 生产环境配置

```conf
# 设置密码
requirepass your_strong_password

# 禁用危险命令
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
```

### 2. 网络安全

```conf
# 只绑定内网地址
bind 127.0.0.1 10.0.0.1

# 使用防火墙限制端口访问
# iptables -A INPUT -p tcp --dport 6379 -s 10.0.0.0/8 -j ACCEPT
```

### 3. 定期备份

```bash
# 手动备份
redis-cli BGSAVE

# 自动备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /backup/redis_backup_$DATE.rdb
```

## 📚 相关资源

- [Redis官方文档](https://redis.io/documentation)
- [Redis配置详解](https://redis.io/topics/config)
- [Redis安全指南](https://redis.io/topics/security)
- [Redis监控指南](https://redis.io/topics/monitoring)

---

## 🎯 快速检查清单

- [ ] Redis服务已安装并启动
- [ ] 可以通过 `redis-cli ping` 连接
- [ ] `.env` 文件中已配置Redis连接参数
- [ ] 项目健康检查显示Redis状态正常
- [ ] 能够发送和验证验证码
- [ ] 用户会话创建和验证正常 