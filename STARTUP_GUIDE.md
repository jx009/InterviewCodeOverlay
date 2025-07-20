# Interview Code Overlay - 启动脚本使用指南

## 📁 可用脚本

### 🚀 `start.bat` - 完整启动脚本
**推荐使用** - 包含完整的环境检查和错误处理

**功能:**
- ✅ 自动检查Node.js和npm环境
- ✅ 验证项目结构完整性
- ✅ 自动安装缺失的依赖
- ✅ 按顺序启动所有服务
- ✅ 提供详细的状态反馈
- ✅ 包含故障排除指南

**使用方法:**
```bash
# 双击运行或在命令行中执行
start.bat
```

### ⚡ `start-simple.bat` - 快速启动脚本
**快速启动** - 适用于环境已配置好的情况

**功能:**
- 🔥 快速启动所有服务
- 🎯 无环境检查，直接启动
- 💨 适合日常开发使用

**使用方法:**
```bash
# 双击运行或在命令行中执行
start-simple.bat
```

### 🛑 `stop.bat` - 停止脚本
**安全停止** - 停止所有相关服务和进程

**功能:**
- 🛑 停止所有Node.js进程
- 🛑 停止Electron客户端
- 🛑 释放占用的端口 (3000, 3001)
- 🛑 关闭相关的命令行窗口

**使用方法:**
```bash
# 双击运行或在命令行中执行
stop.bat
```

## 🔧 系统要求

### 必需环境
- **Node.js** >= 16.0.0
- **npm** >= 7.0.0
- **Windows** 操作系统

### 端口要求
- **3000** - Web配置中心
- **3001** - 后端API服务器
- **Electron** - 客户端应用

## 📋 完整使用流程

### 1️⃣ 首次启动
```bash
# 方法1: 使用完整启动脚本 (推荐)
start.bat

# 方法2: 手动启动各服务
# 后端
cd backend && npm install && npm run dev

# Web前端 (新终端)
cd web && npm install && npm run dev

# 客户端 (新终端)
cd InterviewCodeOverlay && npm install && npm run dev
```

### 2️⃣ 日常使用
```bash
# 快速启动
start-simple.bat

# 或使用完整脚本
start.bat
```

### 3️⃣ 停止服务
```bash
# 使用停止脚本
stop.bat

# 或手动在各个终端按 Ctrl+C
```

## 🚀 启动顺序说明

脚本会按以下顺序启动服务：

1. **后端API服务器** (localhost:3001)
   - 等待 2 秒让服务完全启动

2. **Web配置中心** (localhost:3000)
   - 等待 3 秒让前端完全加载

3. **Electron客户端**
   - 自动打开桌面应用

## 📝 服务说明

### 🔥 后端API服务器 (Port 3001)
- 处理用户认证
- 管理配置数据
- 提供API接口

### 🌐 Web配置中心 (Port 3000)
- 用户注册/登录界面
- 配置管理界面
- 实时配置同步

### 💻 Electron客户端
- 桌面截图工具
- 代码分析界面
- 与Web服务器通信

## 🔧 故障排除

### 常见问题

#### ❌ "Node.js未安装"
**解决方法:**
1. 下载安装Node.js: https://nodejs.org/
2. 选择LTS版本 (推荐)
3. 安装完成后重启命令行

#### ❌ "端口被占用"
**解决方法:**
```bash
# 查看端口占用
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# 停止占用进程
taskkill /f /pid [进程ID]

# 或使用停止脚本
stop.bat
```

#### ❌ "依赖安装失败"
**解决方法:**
```bash
# 清理npm缓存
npm cache clean --force

# 删除node_modules重新安装
rmdir /s node_modules
npm install
```

#### ❌ "Electron启动失败"
**解决方法:**
1. 确保Node.js版本 >= 16
2. 重新安装依赖
3. 检查防火墙设置

### 日志查看

各服务的运行日志会显示在对应的命令行窗口中：
- **Backend API Server** - 后端日志
- **Web Configuration Center** - Web前端日志  
- **Electron Client** - 客户端日志

## 🎯 开发模式说明

所有脚本启动的都是开发模式，支持：
- 🔄 热重载 (Hot Reload)
- 🐛 开发调试工具
- 📝 详细错误信息
- 🔍 实时日志输出

## 📞 技术支持

如果遇到问题：
1. 查看对应服务的日志输出
2. 确认系统环境是否满足要求
3. 尝试使用`stop.bat`停止后重新启动
4. 检查防火墙和端口占用情况

---

**🎉 祝您使用愉快！** 