# 🔒 安全部署指南

## ⚠️ 高优先级安全修复

### 🔴 已修复的高风险问题

1. **JWT密钥安全** ✅
   - 移除了所有默认JWT密钥
   - 强制要求从环境变量获取
   - 添加了密钥强度验证
   - 防止使用不安全的默认值

2. **配置文件安全** ✅
   - 清理了所有示例配置中的真实密码
   - 替换为安全的占位符
   - 添加了安全提醒注释

## 🔑 强密钥生成指南

### 生成JWT密钥
```bash
# 生成主JWT密钥
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('base64'))"

# 生成刷新JWT密钥
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('base64'))"
```

示例输出：
```
JWT_SECRET=+VFxHeG5HzP7mAmF8cZVDalI0HeBwQ/qjT+p31GhJYF3SkTwLGb0OdshtgsfzugVyLk7hruvANXqETLbjuRDig==
JWT_REFRESH_SECRET=DGGqx2kb7acRj2NV3ITBqa+HCyeEZ5+vGwHQNjtVZNQ1n+XPhpqJAhg4Nct/niCPB4IyA8KpfxnBwikBBAfGqg==
```

### 生成其他密钥
```bash
# 生成会话密钥
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# 生成数据库密码（示例）
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## 🛡️ 安全检查清单

### 部署前必检
- [ ] JWT_SECRET 使用64字节强随机密钥
- [ ] JWT_REFRESH_SECRET 使用不同的64字节强随机密钥
- [ ] 数据库密码使用强密码
- [ ] SMTP密码使用应用专用密码
- [ ] NODE_ENV 设置为 'production'
- [ ] COOKIE_SECURE 设置为 true
- [ ] 删除所有测试/示例数据

### 环境变量检查
```bash
# 检查JWT密钥长度
echo $JWT_SECRET | base64 -d | wc -c  # 应该输出 64

# 检查是否包含不安全字符串
echo $JWT_SECRET | grep -E "(default|example|test|your-)" && echo "⚠️ 不安全的密钥！"
```

## 🔐 生产环境配置

### 必需的环境变量
```bash
# 🔒 JWT配置（必须强随机）
JWT_SECRET="YOUR_64_BYTE_BASE64_JWT_SECRET"
JWT_REFRESH_SECRET="YOUR_DIFFERENT_64_BYTE_BASE64_REFRESH_SECRET"

# 🔒 数据库配置
DATABASE_URL="mysql://user:strongpassword@host:3306/dbname"
REDIS_URL="redis://user:strongpassword@host:6379"

# 🔒 生产环境设置
NODE_ENV=production
COOKIE_SECURE=true
CORS_ORIGIN="https://yourdomain.com"

# 🔒 邮件配置
SMTP_HOST="smtp.gmail.com"
SMTP_USER="production-email@yourdomain.com"
SMTP_PASS="strong-app-specific-password"
```

### 可选但推荐的环境变量
```bash
# 速率限制调整
RATE_LIMIT_WINDOW_MS=900000  # 15分钟
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=20

# 安全增强
BCRYPT_ROUNDS=12
```

## 🚫 禁止的配置

### 绝对不要使用的密钥
```bash
# ❌ 这些都是不安全的
JWT_SECRET="your-super-secret-jwt-key"
JWT_SECRET="default-secret-key" 
JWT_SECRET="interview_coder_jwt_123"
JWT_SECRET="jwt-secret"
```

### 不安全的配置
```bash
# ❌ 生产环境不要使用
NODE_ENV=development
COOKIE_SECURE=false
CORS_ORIGIN="*"
```

## 🔍 安全验证

### 自动安全检查
系统在启动时会自动检查：
- JWT密钥长度（最少32字符）
- 是否使用默认密钥
- JWT密钥和刷新密钥是否相同
- 配置文件完整性

### 手动安全测试
```bash
# 1. 检查JWT密钥强度
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# 2. 检查速率限制
for i in {1..25}; do curl -X POST http://localhost:3001/api/auth/login; done

# 3. 检查CORS设置
curl -H "Origin: http://malicious-site.com" http://localhost:3001/health
```

## 🔧 安全维护

### 定期检查
- [ ] 每月检查依赖包安全更新
- [ ] 每季度更新JWT密钥
- [ ] 定期检查访问日志异常
- [ ] 监控速率限制触发情况

### 安全监控
```bash
# 检查暴力破解尝试
grep "登录尝试过于频繁" /var/log/app.log

# 检查JWT相关错误
grep "JWT" /var/log/app.log | grep -E "(expired|invalid)"

# 检查数据库连接异常
grep "数据库" /var/log/app.log | grep "错误"
```

## 🚨 应急响应

### 如果密钥泄露
1. **立即更换所有JWT密钥**
2. **强制所有用户重新登录**
3. **检查访问日志是否有异常**
4. **更新部署环境**

### 密钥轮换脚本
```bash
#!/bin/bash
# 紧急密钥轮换

# 生成新密钥
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
NEW_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")

# 更新环境变量
export JWT_SECRET="$NEW_JWT_SECRET"
export JWT_REFRESH_SECRET="$NEW_REFRESH_SECRET"

# 重启服务
pm2 restart interview-coder-backend

echo "✅ 密钥轮换完成"
```

## 📋 合规检查

### GDPR/数据保护
- [ ] 用户密码正确加密存储
- [ ] 敏感数据传输使用HTTPS
- [ ] 实现数据删除功能
- [ ] 访问日志符合保留政策

### 行业标准
- [ ] 密码复杂度符合NIST标准
- [ ] JWT过期时间合理设置
- [ ] 速率限制防止DDoS
- [ ] 错误信息不泄露敏感信息

## 💡 安全最佳实践

1. **密钥管理**
   - 使用密钥管理服务 (AWS KMS, Azure Key Vault)
   - 定期轮换密钥
   - 永远不要硬编码密钥

2. **监控告警**
   - 设置登录失败告警
   - 监控异常API调用
   - 设置服务健康检查

3. **访问控制**
   - 实施最小权限原则
   - 使用Web应用防火墙 (WAF)
   - 定期安全审计

4. **数据保护**
   - 启用数据库加密
   - 备份数据加密
   - 网络传输加密

---

**🔒 记住：安全是一个持续的过程，而不是一次性的任务！** 