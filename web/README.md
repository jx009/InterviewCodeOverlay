# Interview Code Overlay - Web配置中心

这是Interview Code Overlay项目的Web配置中心，用于管理AI模型选择和应用配置。

## 项目特性

- 🎯 **AI模型管理**: 支持11种AI模型选择
- 🔐 **用户认证**: 安全的登录/注册系统
- 🎨 **现代UI**: 基于React + TypeScript + Tailwind CSS
- 📱 **响应式设计**: 适配桌面和移动设备
- 🔧 **实时配置**: 即时保存和同步配置

## 支持的AI模型

### Claude系列
- claude-sonnet-4-20250514-thinking
- claude-3-7-sonnet-thinking
- claude-opus-4-20250514-thinking
- claude-3-7-sonnet-20250219
- claude-sonnet-4-20250514

### Gemini系列
- gemini-2.5-flash-preview-04-17-thinking
- gemini-2.5-flash-preview-04-17
- gemini-2.5-pro-preview-06-05
- gemini-2.5-pro-preview-06-05-thinking

### OpenAI系列
- chatgpt-4o-latest
- o3-mini

## 运行环境

确保您的系统已安装：
- Node.js 18+ 
- npm 或 yarn
- 后端服务器运行在 http://localhost:3001

## 安装和运行

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```

3. **访问应用**
   - 前端: http://localhost:3000
   - 后端API: http://localhost:3001

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **样式**: Tailwind CSS
- **路由**: React Router
- **HTTP客户端**: Axios
- **图标**: Lucide React
- **状态管理**: React Hooks 