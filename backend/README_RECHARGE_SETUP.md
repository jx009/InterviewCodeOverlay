# 充值模块配置说明

## 概述

本项目已完全重构充值模块，采用微信支付 API V2，严格按照生产模式标准开发。所有数据都持久化存储到数据库中，无任何内存临时存储或模拟数据。

## 功能特性

- ✅ 微信支付 API V2 集成
- ✅ 生产级安全标准
- ✅ 数据库持久化存储
- ✅ 完整的充值套餐系统
- ✅ 二维码支付
- ✅ 支付状态实时查询
- ✅ 充值记录管理
- ✅ 用户积分自动充值
- ✅ 支付回调处理
- ✅ 错误处理和日志记录

## 环境配置

### 1. 微信支付配置

在项目的 `.env` 文件中添加以下配置：

```bash
# 微信支付配置
WECHAT_PAY_APP_ID=wx04948e55b1c03277
WECHAT_PAY_MCH_ID=1608730981
WECHAT_PAY_API_KEY=Aa111111111122222222223333333333

# 微信支付回调URL（生产环境必须是外网可访问的HTTPS地址）
# 开发环境默认使用 localhost，生产环境需要修改为实际域名
WECHAT_PAY_NOTIFY_URL=http://localhost:3001/api/payment/wechat/callback
```

**注意**：
- 开发环境：可以使用 `http://localhost:3001/api/payment/wechat/callback`
- 生产环境：必须使用 `https://yourdomain.com/api/payment/wechat/callback`
- 可以使用 ngrok 等工具在开发时暴露本地端口到外网进行测试

### 2. 数据库配置

确保数据库中已有以下表结构（根据 prisma/schema.prisma）：

- `payment_orders` - 支付订单表
- `payment_packages` - 充值套餐表  
- `payment_notify_logs` - 支付回调日志表
- `point_transactions` - 积分交易记录表
- `users` - 用户表（包含积分字段）

### 3. 依赖包安装

确保已安装必要的依赖包：

```bash
npm install crypto xml2js qrcode axios
```

## 新增文件列表

### 后端文件

1. **`src/services/WechatPayV2Service.js`** - 微信支付V2服务类
   - 统一下单
   - 订单查询
   - 支付回调处理
   - 签名验证
   - XML 处理

2. **`src/config/recharge-packages.js`** - 充值套餐配置
   - 5个充值套餐
   - 套餐管理函数

3. **`src/routes/recharge.js`** - 充值相关API路由
   - `GET /api/recharge/packages` - 获取充值套餐
   - `POST /api/recharge/create-order` - 创建充值订单
   - `GET /api/recharge/order-status/:orderNo` - 查询订单状态
   - `GET /api/recharge/history` - 获取充值记录

4. **`src/routes/wechat-callback.js`** - 微信支付回调处理
   - `POST /api/payment/wechat/callback` - 微信支付回调

### 前端文件

1. **`web/src/services/rechargeApi.ts`** - 充值API服务
2. **`web/src/components/Recharge/RechargePackageCard.tsx`** - 充值套餐卡片组件
3. **`web/src/components/Recharge/RechargeQRCode.tsx`** - 支付二维码组件
4. **`web/src/components/Recharge/RechargeHistory.tsx`** - 充值记录组件
5. **`web/src/pages/NewRechargePage.tsx`** - 新的充值页面

## API 接口文档

### 获取充值套餐

```
GET /api/recharge/packages
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "体验套餐",
      "description": "适合新用户体验AI功能",
      "amount": 9.90,
      "points": 100,
      "bonusPoints": 10,
      "totalPoints": 110,
      "isRecommended": false,
      "icon": "🌟",
      "tags": ["新手推荐"]
    }
  ]
}
```

### 创建充值订单

```
POST /api/recharge/create-order
Authorization: Bearer <sessionId>
```

**请求体：**
```json
{
  "packageId": 1
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "orderNo": "ORDER1704123456789",
    "qrCodeUrl": "weixin://wxpay/bizpayurl?pr=xxx",
    "amount": 9.90,
    "points": 110,
    "expireTime": "2024-01-02T10:30:00.000Z",
    "packageInfo": {
      "name": "体验套餐",
      "description": "适合新用户体验AI功能"
    }
  }
}
```

### 查询订单状态

```
GET /api/recharge/order-status/:orderNo
Authorization: Bearer <sessionId>
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "orderNo": "ORDER1704123456789",
    "status": "PAID",
    "paymentTime": "2024-01-02T10:15:30.000Z",
    "amount": 9.90,
    "points": 110
  }
}
```

### 获取充值记录

```
GET /api/recharge/history?page=1&limit=10
Authorization: Bearer <sessionId>
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "orderNo": "ORDER1704123456789",
        "packageName": "体验套餐",
        "packageDescription": "适合新用户体验AI功能",
        "amount": 9.90,
        "points": 100,
        "bonusPoints": 10,
        "totalPoints": 110,
        "status": "paid",
        "paymentTime": "2024-01-02T10:15:30.000Z",
        "createdAt": "2024-01-02T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

## 支付流程

1. **用户选择套餐** → 前端调用 `/api/recharge/packages` 获取套餐列表
2. **创建订单** → 前端调用 `/api/recharge/create-order` 创建支付订单
3. **显示二维码** → 前端显示微信支付二维码
4. **用户扫码支付** → 用户使用微信扫码完成支付
5. **微信回调** → 微信支付成功后调用 `/api/payment/wechat/callback`
6. **更新订单状态** → 系统自动更新订单状态并给用户充值积分
7. **前端轮询** → 前端定期调用 `/api/recharge/order-status` 检查支付状态

## 数据安全

- ✅ 所有支付参数使用 MD5 签名验证
- ✅ 回调数据严格验证签名防篡改
- ✅ 订单金额服务端二次验证
- ✅ 防重复处理机制
- ✅ 完整的日志记录和错误处理

## 测试说明

### 开发环境测试

1. 确保数据库连接正常
2. 配置微信支付参数
3. 启动后端服务: `npm run dev` 
4. 访问前端充值页面测试流程

### 生产环境部署

1. 更新 `WECHAT_PAY_NOTIFY_URL` 为实际域名
2. 确保服务器能接收微信支付回调
3. 配置 HTTPS（微信支付要求）
4. 监控支付回调日志

## 套餐配置

当前配置了 5 个充值套餐：

1. **体验套餐** - ¥9.90 → 100积分 + 10赠送 = 110积分
2. **标准套餐** - ¥29.90 → 300积分 + 50赠送 = 350积分 (推荐)
3. **专业套餐** - ¥58.00 → 600积分 + 120赠送 = 720积分
4. **企业套餐** - ¥99.00 → 1000积分 + 250赠送 = 1250积分
5. **VIP套餐** - ¥188.00 → 2000积分 + 600赠送 = 2600积分

可在 `src/config/recharge-packages.js` 中修改套餐配置。

## 前端集成

新充值页面位于 `NewRechargePage.tsx`，包含：

- 套餐选择界面
- 二维码支付界面  
- 充值记录界面
- 支付状态轮询
- 响应式设计

访问路径：`/recharge?step=packages`

## 注意事项

1. **微信支付API密钥安全**：绝不能在前端暴露 `WECHAT_PAY_API_KEY`
2. **回调URL配置**：必须在微信商户平台配置正确的回调URL
3. **HTTPS要求**：生产环境必须使用HTTPS
4. **订单过期**：订单默认30分钟过期，可在代码中调整
5. **错误处理**：所有支付相关错误都有完整日志记录

## 故障排除

### 常见问题

1. **签名验证失败**
   - 检查 API 密钥是否正确
   - 确认参数编码格式
   - 验证时间同步

2. **回调接收失败**
   - 检查回调URL是否可访问
   - 确认服务器防火墙设置
   - 查看支付回调日志

3. **订单状态不更新**
   - 检查数据库连接
   - 查看回调处理日志
   - 验证事务处理逻辑

### 日志查看

- 充值订单：查看 `payment_orders` 表
- 支付回调：查看 `payment_notify_logs` 表  
- 积分变动：查看 `point_transactions` 表
- 服务器日志：查看控制台输出