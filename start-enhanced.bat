@echo off
chcp 65001 >nul
title Interview Code Overlay - 增强启动脚本

echo ================================================================
echo           Interview Code Overlay - 增强启动脚本
echo ================================================================
echo.

:: 检查Node.js环境
echo [1/6] 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js未安装
    pause
    exit /b 1
)
echo ✅ Node.js环境检查通过

:: 获取项目根目录
set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

:: 停止可能存在的进程
echo [2/6] 清理现有进程...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im electron.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✅ 进程清理完成

:: 检查和安装依赖
echo [3/6] 检查依赖...
cd backend
if not exist "node_modules" (
    echo 🔄 安装后端依赖...
    npm install
)

cd ..\web
if not exist "node_modules" (
    echo 🔄 安装Web前端依赖...
    npm install
)

cd ..\InterviewCodeOverlay
if not exist "node_modules" (
    echo 🔄 安装客户端依赖...
    npm install
)
cd ..

echo ✅ 依赖检查完成

:: 启动后端API服务器
echo [4/6] 启动后端API服务器...
cd backend
start "Backend API Server" cmd /c "title Backend API Server && echo 🔥 启动后端API服务器... && npm run dev"
cd ..

:: 等待后端启动
echo 🔄 等待后端API服务器启动...
:wait_backend
timeout /t 2 /nobreak >nul
netstat -ano | findstr :3001 >nul 2>&1
if errorlevel 1 (
    echo ⏳ 等待后端启动...
    goto wait_backend
)
echo ✅ 后端API服务器已启动 (http://localhost:3001)

:: 启动Web前端
echo [5/6] 启动Web配置中心...
cd web
start "Web Configuration Center" cmd /c "title Web Configuration Center && echo 🌐 启动Web配置中心... && npm run dev"
cd ..

:: 等待Web前端启动
echo 🔄 等待Web配置中心启动...
:wait_web
timeout /t 3 /nobreak >nul
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ⏳ 等待Web前端启动...
    goto wait_web
)
echo ✅ Web配置中心已启动 (http://localhost:3000)

:: 启动Electron客户端
echo [6/6] 启动Electron客户端...
cd InterviewCodeOverlay
start "Electron Client" cmd /c "title Electron Client && echo 💻 启动Electron客户端... && npm run dev"
cd ..

:: 等待一下让Electron启动
timeout /t 3 /nobreak >nul

echo.
echo ================================================================
echo                    🎉 启动完成！
echo ================================================================
echo.
echo 📋 服务状态检查:

:: 检查服务状态
echo 🔍 检查后端API服务器...
netstat -ano | findstr :3001 >nul 2>&1
if errorlevel 1 (
    echo ❌ 后端API服务器未启动
) else (
    echo ✅ 后端API服务器: http://localhost:3001
)

echo 🔍 检查Web配置中心...
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ❌ Web配置中心未响应
) else (
    echo ✅ Web配置中心: http://localhost:3000
)

echo 🔍 检查Electron客户端...
tasklist | findstr electron >nul 2>&1
if errorlevel 1 (
    echo ⏳ Electron客户端启动中...
) else (
    echo ✅ Electron客户端已启动
)

echo.
echo 📝 使用说明:
echo   1. 打开浏览器访问: http://localhost:3000
echo   2. 注册账号或登录
echo   3. 在Electron客户端中登录使用
echo.

:: 自动打开浏览器
echo 🌐 正在为您打开Web配置中心...
start http://localhost:3000

echo 🔧 如果遇到问题:
echo   - 检查防火墙设置
echo   - 确保端口3000和3001未被占用
echo   - 查看各服务窗口的错误信息
echo.

echo 按任意键退出启动脚本...
pause >nul 