# Windows PowerShell 启动指南

## 🚀 启动命令（按顺序执行）

### 1. 启动后端服务
```powershell
cd InterviewCodeOverlay\backend
npm run start:enhanced
```

### 2. 启动前端服务（新建PowerShell窗口）
```powershell
cd InterviewCodeOverlay
npm run dev
```

## 📋 验证修复效果

### 访问充值页面
在浏览器中访问：`http://localhost:3000/recharge`

### 检查控制台
- 前端控制台不应有"未提供认证令牌"错误
- 充值套餐应正常显示
- 订单列表应正常加载

## 🔧 主要修复内容

1. **修复session_status端点**：解决SessionManager导入问题
2. **统一认证中间件**：支付API使用标准认证方式
3. **修复数据库字段**：使用正确的表名和字段名

## 💡 如果遇到问题

- 确保Redis服务正在运行（已有内存模拟备选）
- 检查MySQL数据库连接
- 重启服务后再次测试

---

**修复完成** ✅  
**测试状态** 🔄 等待用户验证 