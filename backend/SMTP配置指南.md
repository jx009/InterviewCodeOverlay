# SMTP邮件服务配置指南

## 📧 快速开始

### 1. 创建.env文件
在 `backend/` 目录下创建 `.env` 文件（如果不存在）：
```bash
cp env.example .env
```

### 2. 编辑邮件配置
在 `.env` 文件中配置以下参数：
```env
# SMTP邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

## 🔧 各大邮件服务商配置

### Gmail (推荐) ⭐

#### 为什么推荐Gmail？
- 稳定性高，送达率好
- 免费用户每天可发送500封邮件
- 支持应用专用密码，安全性高

#### 配置步骤：

**1️⃣ 开启两步验证**
```
1. 访问 https://myaccount.google.com/security
2. 点击"两步验证" → "开始使用"
3. 按提示完成设置
```

**2️⃣ 生成应用专用密码**
```
1. 在安全页面找到"应用专用密码"
2. 选择应用：邮件
3. 选择设备：其他（自定义名称）
4. 输入"InterviewCodeOverlay"
5. 复制生成的16位密码
```

**3️⃣ 配置参数**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=abcd-efgh-ijkl-mnop  # 16位应用密码
EMAIL_FROM=your-gmail@gmail.com
```

**⚠️ 注意事项：**
- 必须使用应用专用密码，不能使用账户密码
- 确保开启了两步验证
- 如果仍然失败，检查"允许安全性较低的应用"设置

---

### Outlook/Hotmail 🔵

#### 配置步骤：

**1️⃣ 开启两步验证（推荐）**
```
1. 访问 https://account.microsoft.com/security
2. 开启两步验证
3. 生成应用密码
```

**2️⃣ 配置参数**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password  # 或应用密码
EMAIL_FROM=your-email@outlook.com
```

**支持的域名：**
- @outlook.com
- @hotmail.com
- @live.com

---

### QQ邮箱 🟡

#### 配置步骤：

**1️⃣ 开启SMTP服务**
```
1. 登录 https://mail.qq.com/
2. 设置 → 账户
3. 找到"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"
4. 开启"SMTP服务"
5. 获取授权码（不是QQ密码！）
```

**2️⃣ 配置参数**
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=1234567890@qq.com
SMTP_PASS=your-authorization-code  # 授权码，非QQ密码
EMAIL_FROM=1234567890@qq.com
```

**⚠️ 重要提醒：**
- 必须使用授权码，不是QQ密码
- 需要先开启SMTP服务
- 授权码通常是16位字符

---

### 163邮箱 🟠

#### 配置步骤：

**1️⃣ 开启SMTP服务**
```
1. 登录 https://mail.163.com/
2. 设置 → POP3/SMTP/IMAP
3. 开启"SMTP服务"
4. 设置客户端授权密码
```

**2️⃣ 配置参数**
```env
SMTP_HOST=smtp.163.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@163.com
SMTP_PASS=your-client-auth-password  # 客户端授权密码
EMAIL_FROM=your-email@163.com
```

---

### 126邮箱 🟤

```env
SMTP_HOST=smtp.126.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@126.com
SMTP_PASS=your-client-auth-password
EMAIL_FROM=your-email@126.com
```

---

### 企业邮箱/自定义SMTP 🏢

#### 腾讯企业邮箱
```env
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password
EMAIL_FROM=your-email@yourdomain.com
```

#### 阿里云企业邮箱
```env
SMTP_HOST=smtp.qiye.aliyun.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password
EMAIL_FROM=your-email@yourdomain.com
```

#### 自建邮件服务器
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587  # 或25、465
SMTP_SECURE=false  # 587端口用false，465端口用true
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password
EMAIL_FROM=your-email@yourdomain.com
```

## 🔐 安全配置详解

### 端口和加密方式

| 端口 | 加密方式 | SMTP_SECURE | 描述 |
|------|----------|-------------|------|
| 25 | 无 | false | 明文传输，不推荐 |
| 587 | STARTTLS | false | 推荐，先建立连接再加密 |
| 465 | SSL/TLS | true | 直接SSL连接 |

### 推荐配置
```env
# 推荐：587端口 + STARTTLS
SMTP_PORT=587
SMTP_SECURE=false

# 备选：465端口 + SSL
SMTP_PORT=465
SMTP_SECURE=true
```

## 🧪 测试配置

### 1. 使用项目测试脚本
```bash
cd backend
node test-enhanced-auth.js
```

### 2. 手动测试邮件发送
```bash
# 启动增强版服务器
npm run start:enhanced

# 在另一个终端测试
curl -X POST http://localhost:3001/api/auth-enhanced/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com"}'
```

### 3. 检查服务健康状态
```bash
curl http://localhost:3001/health
```

应该看到邮件服务状态为 "configured ✅"

## 🚨 常见问题解决

### 1. Gmail "用户名或密码错误"
```
问题：535-5.7.8 Username and Password not accepted
解决：
- 确保开启了两步验证
- 使用应用专用密码，不是账户密码
- 检查用户名是否包含@gmail.com
```

### 2. QQ邮箱"需要启用SMTP"
```
问题：发送失败，提示需要开启SMTP
解决：
- 登录QQ邮箱 → 设置 → 账户
- 开启SMTP服务
- 使用授权码，不是QQ密码
```

### 3. 连接超时
```
问题：Error: Connection timeout
解决：
- 检查网络连接
- 尝试不同端口（587、465、25）
- 检查防火墙设置
- 如果在服务器上，检查是否禁用了SMTP端口
```

### 4. SSL/TLS错误
```
问题：SSL错误
解决：
# 方法1：调整安全设置
SMTP_SECURE=false  # 如果使用587端口
SMTP_SECURE=true   # 如果使用465端口

# 方法2：忽略SSL证书验证（仅开发环境）
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 5. 邮件被标记为垃圾邮件
```
解决方案：
- 配置SPF记录（如果使用自定义域名）
- 避免使用过多营销词汇
- 确保发件人邮箱与SMTP_USER一致
- 建议使用知名邮件服务商
```

## 📊 性能和限制

### 发送频率限制

| 服务商 | 每日限制 | 每小时限制 | 备注 |
|--------|----------|------------|------|
| Gmail | 500封 | - | 免费用户 |
| Outlook | 300封 | 100封 | 免费用户 |
| QQ邮箱 | 50封 | - | 普通用户 |
| 163邮箱 | 50封 | - | 普通用户 |

### 项目内置限制
```typescript
// 在 EmailRateLimit 类中配置
MAX_EMAILS_PER_HOUR = 10;  // 每小时10封
MAX_EMAILS_PER_DAY = 50;   // 每天50封
```

可以根据需要调整这些限制。

## 🔄 高级配置

### 1. 连接池配置
```env
# 连接超时（毫秒）
SMTP_CONNECTION_TIMEOUT=60000
SMTP_GREETING_TIMEOUT=30000
SMTP_SOCKET_TIMEOUT=60000
```

### 2. 重试机制
```env
# 最大重试次数
SMTP_MAX_RETRIES=3
```

### 3. 调试模式
```env
# 开启SMTP调试日志
SMTP_DEBUG=true
NODE_ENV=development
```

## 📚 参考资源

- [Nodemailer官方文档](https://nodemailer.com/)
- [Gmail SMTP设置](https://support.google.com/a/answer/176600)
- [Outlook SMTP设置](https://support.microsoft.com/zh-cn/office)
- [QQ邮箱SMTP设置](https://service.mail.qq.com/cgi-bin/help)

## ✅ 配置检查清单

配置完成后，请检查：

- [ ] `.env` 文件已创建并配置了SMTP参数
- [ ] 邮箱已开启SMTP服务（如需要）
- [ ] 使用正确的密码/授权码
- [ ] 端口和加密设置正确
- [ ] 防火墙允许SMTP端口
- [ ] 测试脚本能够成功发送邮件
- [ ] 健康检查显示邮件服务正常

配置完成后运行 `node test-enhanced-auth.js` 测试邮件发送功能！ 