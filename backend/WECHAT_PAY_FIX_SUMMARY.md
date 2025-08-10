# 微信支付"Example Domain"问题修复说明

## 🐛 问题描述

扫描充值二维码后显示"Example Domain"页面，而不是正常的微信支付页面。

## 🔍 问题原因

1. **回调URL配置错误**：微信支付服务中的 `notifyUrl` 使用了示例域名 `https://yourdomain.com/api/payment/wechat/callback`
2. **时间格式错误**：微信支付API的时间格式不符合要求，导致API调用失败

## ✅ 修复方案

### 1. 修复回调URL配置

**修改文件**：`src/services/WechatPayV2Service.js`

**修改前**：
```javascript
this.notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL || 'https://yourdomain.com/api/payment/wechat/callback';
```

**修改后**：
```javascript
this.notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL || 'http://localhost:3001/api/payment/wechat/callback';
```

### 2. 修复时间格式

**修改文件**：`src/services/WechatPayV2Service.js`

**修改前**：
```javascript
formatExpireTime(minutes = 30) {
  const expireTime = new Date(Date.now() + minutes * 60 * 1000);
  return expireTime.toISOString().replace(/[-:]/g, '').split('.')[0];
}
```

**修改后**：
```javascript
formatExpireTime(minutes = 30) {
  const expireTime = new Date(Date.now() + minutes * 60 * 1000);
  const year = expireTime.getFullYear();
  const month = String(expireTime.getMonth() + 1).padStart(2, '0');
  const day = String(expireTime.getDate()).padStart(2, '0');
  const hour = String(expireTime.getHours()).padStart(2, '0');
  const minute = String(expireTime.getMinutes()).padStart(2, '0');
  const second = String(expireTime.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hour}${minute}${second}`;
}
```

## 🧪 验证结果

修复后测试结果：
- ✅ 微信支付配置正常
- ✅ 成功创建支付订单
- ✅ 二维码URL格式正确：`weixin://wxpay/bizpayurl?pr=mZNV0Trz3`
- ✅ 时间格式符合微信支付要求（14位：yyyyMMddHHmmss）

## 📋 环境配置说明

### 开发环境
```bash
WECHAT_PAY_NOTIFY_URL=http://localhost:3001/api/payment/wechat/callback
```

### 生产环境
```bash
WECHAT_PAY_NOTIFY_URL=https://yourdomain.com/api/payment/wechat/callback
```

**重要提醒**：
- 生产环境必须使用HTTPS
- 回调URL必须外网可访问
- 需要在微信商户平台配置对应的回调URL

## 🔧 开发调试建议

1. **本地测试**：使用 ngrok 暴露本地端口
   ```bash
   ngrok http 3001
   # 将生成的HTTPS URL配置为WECHAT_PAY_NOTIFY_URL
   ```

2. **验证二维码**：正确的微信支付二维码格式应该是：
   ```
   weixin://wxpay/bizpayurl?pr=xxxxx
   ```

3. **调试日志**：所有微信支付相关操作都有详细日志输出

## ✅ 修复完成

现在扫描二维码应该能正常跳转到微信支付页面，而不是显示"Example Domain"。