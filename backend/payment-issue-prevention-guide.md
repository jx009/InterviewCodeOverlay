# 微信支付问题预防指南

## 🎯 问题总结

**发现的问题：**
订单 `RECHARGE_ORDER17522530522711786` 在微信支付系统中已成功支付（状态：SUCCESS），但系统中仍显示为 NOTPAY（未支付）。

**根本原因：**
1. 回调URL使用localhost，微信支付服务器无法访问
2. 回调通知失败，导致系统状态未同步
3. 缺乏支付状态监控和同步机制

## 🔧 立即修复步骤

### 1. 手动修复当前订单

执行以下SQL脚本修复订单状态：

```sql
-- 更新订单状态为已支付
UPDATE payment_orders SET 
  payment_status = 'paid',
  transaction_id = '4200002740202507127224774049',
  payment_time = '2025-07-12 00:57:19',
  notify_time = NOW(),
  updated_at = NOW()
WHERE out_trade_no = 'RECHARGE_ORDER17522530522711786';

-- 发放积分给用户
UPDATE users u 
INNER JOIN payment_orders po ON u.id = po.user_id 
SET u.points = u.points + po.points + po.bonus_points
WHERE po.out_trade_no = 'RECHARGE_ORDER17522530522711786';

-- 记录积分交易
INSERT INTO point_transactions (user_id, transaction_type, amount, balance_after, description, created_at)
SELECT 
  po.user_id,
  'recharge',
  (po.points + po.bonus_points),
  (u.points + po.points + po.bonus_points),
  CONCAT('支付订单充值: ', po.order_no),
  NOW()
FROM payment_orders po
INNER JOIN users u ON u.id = po.user_id
WHERE po.out_trade_no = 'RECHARGE_ORDER17522530522711786';
```

### 2. 配置正确的回调URL

**当前问题：**
```
WECHAT_PAY_NOTIFY_URL=http://localhost:3001/api/payment/wechat/callback
```

**解决方案：**

#### 方案A：使用ngrok内网穿透（开发环境）
```bash
# 1. 安装ngrok
npm install -g ngrok

# 2. 启动内网穿透
ngrok http 3001

# 3. 获取公网地址（例如：https://abc123.ngrok.io）
# 4. 更新环境变量
WECHAT_PAY_NOTIFY_URL=https://abc123.ngrok.io/api/payment/wechat/callback
```

#### 方案B：部署到公网服务器（生产环境）
```bash
# 更新为真实域名
WECHAT_PAY_NOTIFY_URL=https://yourdomain.com/api/payment/wechat/callback
```

## 🛡️ 预防措施

### 1. 支付状态监控

创建定时任务，定期同步支付状态：

```javascript
// cron-payment-sync.js
const cron = require('node-cron');
const { queryOrder } = require('./test-wechat-query');

// 每5分钟检查一次待支付订单
cron.schedule('*/5 * * * *', async () => {
  console.log('🔍 开始支付状态同步...');
  
  // 查询15分钟内的待支付订单
  const pendingOrders = await prisma.paymentOrder.findMany({
    where: {
      paymentStatus: 'PENDING',
      createdAt: {
        gte: new Date(Date.now() - 15 * 60 * 1000) // 15分钟内
      }
    }
  });
  
  for (const order of pendingOrders) {
    try {
      const result = await queryOrder(order.outTradeNo);
      if (result.success && result.data.tradeState === 'SUCCESS') {
        // 发现支付成功但状态未更新的订单
        console.log(`🚨 发现状态不同步订单: ${order.outTradeNo}`);
        // 触发状态更新逻辑
        await updateOrderStatus(order, result.data);
      }
    } catch (error) {
      console.error(`查询订单失败: ${order.outTradeNo}`, error);
    }
  }
});
```

### 2. 回调日志监控

增强回调日志记录：

```javascript
// 在回调处理中添加详细日志
app.post('/api/payment/wechat/callback', (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  
  console.log('📨 收到微信支付回调:', {
    timestamp: new Date().toISOString(),
    clientIP: clientIP,
    headers: req.headers,
    body: req.body
  });
  
  try {
    // 处理回调逻辑
    const result = handleWechatCallback(req.body);
    
    // 记录成功日志
    console.log('✅ 回调处理成功:', {
      orderNo: result.orderNo,
      processingTime: Date.now() - startTime,
      result: result
    });
    
    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>');
  } catch (error) {
    // 记录失败日志
    console.error('❌ 回调处理失败:', {
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime,
      requestBody: req.body
    });
    
    res.send('<xml><return_code><![CDATA[FAIL]]></return_code></xml>');
  }
});
```

### 3. 支付状态告警

设置告警机制：

```javascript
// alert-service.js
const nodemailer = require('nodemailer');

class PaymentAlertService {
  async sendStatusMismatchAlert(orderNo, systemStatus, wechatStatus) {
    const alertMessage = `
    🚨 支付状态不同步告警
    
    订单号: ${orderNo}
    系统状态: ${systemStatus}
    微信状态: ${wechatStatus}
    发现时间: ${new Date().toLocaleString()}
    
    请及时处理！
    `;
    
    // 发送邮件告警
    await this.sendEmail('支付状态异常', alertMessage);
    
    // 发送钉钉/企微告警
    await this.sendDingTalk(alertMessage);
  }
  
  async sendEmail(subject, content) {
    // 邮件发送逻辑
  }
  
  async sendDingTalk(content) {
    // 钉钉告警逻辑
  }
}
```

### 4. 数据库约束和索引优化

```sql
-- 添加索引提升查询性能
CREATE INDEX idx_payment_orders_status_created ON payment_orders(payment_status, created_at);
CREATE INDEX idx_payment_orders_out_trade_no ON payment_orders(out_trade_no);
CREATE INDEX idx_payment_orders_transaction_id ON payment_orders(transaction_id);

-- 添加约束确保数据一致性
ALTER TABLE payment_orders 
ADD CONSTRAINT chk_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired'));
```

### 5. 回调URL健康检查

```javascript
// health-check.js
const axios = require('axios');

async function checkCallbackHealth() {
  const notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL;
  
  try {
    // 检查URL可访问性
    const response = await axios.get(notifyUrl.replace('/callback', '/health'), {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log('✅ 回调URL健康检查通过');
      return true;
    }
  } catch (error) {
    console.error('❌ 回调URL健康检查失败:', error.message);
    
    // 发送告警
    await alertService.sendAlert('回调URL不可访问', error.message);
    return false;
  }
}

// 每小时检查一次
setInterval(checkCallbackHealth, 60 * 60 * 1000);
```

## 📊 监控仪表板

建议创建支付监控仪表板，包含：

1. **实时状态监控**
   - 待支付订单数量
   - 支付成功率
   - 回调成功率
   - 状态不同步订单数量

2. **告警指标**
   - 回调失败率超过阈值
   - 状态不同步订单超过阈值
   - 支付成功率低于阈值

3. **操作工具**
   - 手动同步订单状态
   - 重新发送回调通知
   - 订单状态批量修复

## 🔄 长期改进方案

### 1. 实施双重确认机制
- 回调通知 + 主动查询
- 定时同步 + 实时监控
- 人工审核 + 自动处理

### 2. 优化支付流程
- 支付前状态检查
- 支付中状态跟踪
- 支付后状态确认

### 3. 建立容错机制
- 回调重试机制
- 状态自动修复
- 异常自动恢复

## 📝 操作清单

### 立即执行（高优先级）
- [ ] 手动修复当前订单状态
- [ ] 配置正确的回调URL
- [ ] 重启支付服务
- [ ] 验证修复结果

### 短期实施（1周内）
- [ ] 部署支付状态监控
- [ ] 设置告警机制
- [ ] 优化回调日志
- [ ] 添加健康检查

### 长期改进（1个月内）
- [ ] 建立监控仪表板
- [ ] 实施双重确认机制
- [ ] 优化数据库结构
- [ ] 完善文档和流程

---

**重要提醒：**
1. 执行任何数据库操作前请先备份
2. 在测试环境验证修复脚本
3. 记录所有操作日志
4. 通知相关用户支付状态已修复