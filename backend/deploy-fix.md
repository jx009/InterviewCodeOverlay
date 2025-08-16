# 充值套餐接口修复方案

## 问题诊断
外部服务器 `https://quiz.playoffer.cn/api/payment/packages` 返回空数据，但数据库中有3个有效套餐。

## 根本原因
1. 外部服务器的PaymentService可能未正确连接数据库
2. 可能存在Prisma客户端缓存问题
3. 数据库查询条件可能不匹配

## 解决方案

### 1. 检查外部服务器数据库连接
确保外部服务器的数据库配置正确，连接到包含套餐数据的数据库实例。

### 2. 重启外部服务器的支付服务
```bash
# 重启支付相关的服务进程
pm2 restart payment-service
# 或者
systemctl restart interview-backend
```

### 3. 清理Prisma缓存
```bash
# 在外部服务器上执行
npx prisma generate
npx prisma db push
```

### 4. 验证数据库数据
在外部服务器上运行以下查询验证数据：
```sql
SELECT * FROM payment_packages WHERE isActive = true ORDER BY sortOrder ASC;
```

### 5. 临时解决方案
如果外部服务器修复需要时间，可以临时修改前端调用管理员接口：
```javascript
// 临时使用管理员接口
const response = await fetch(`${API_BASE_URL}/admin/payment-packages`, {
  headers: {
    'X-Session-Id': sessionId || '',
    'Content-Type': 'application/json'
  }
});
```

## 预期结果
修复后，`/api/payment/packages` 应该返回：
```json
{
  "success": true,
  "data": [
    {
      "id": 20,
      "name": "基础套餐",
      "amount": "9.91",
      "points": 100,
      "bonusPoints": 20,
      "isActive": true,
      "sortOrder": 1,
      "label": "best_value",
      "labelColor": "blue",
      "isRecommended": false
    },
    {
      "id": 21,
      "name": "标准套餐", 
      "amount": "19.9",
      "points": 220,
      "bonusPoints": 50,
      "isActive": true,
      "sortOrder": 2,
      "label": "hot_sale",
      "labelColor": "red",
      "isRecommended": true
    },
    {
      "id": 22,
      "name": "专业套餐",
      "amount": "39.9", 
      "points": 500,
      "bonusPoints": 120,
      "isActive": true,
      "sortOrder": 3,
      "label": "limited_time",
      "labelColor": "orange",
      "isRecommended": false
    }
  ],
  "message": "获取套餐列表成功"
}
```

## 验证步骤
1. 重启外部服务器后测试接口
2. 确认前端能正确显示套餐数据
3. 测试其他管理员功能是否正常工作