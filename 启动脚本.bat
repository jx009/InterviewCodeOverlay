@echo off
chcp 65001 > nul
title Interview Code Overlay v2.0 - 数据库版启动器

echo.
echo =====================================
echo  🚀 Interview Code Overlay v2.0
echo  数据库持久化版启动脚本
echo =====================================
echo.

echo 📋 检查环境...
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)
echo ✅ Node.js 环境正常

echo.
echo 🗄️ 检查数据库依赖...
cd /d "%~dp0backend"
if not exist "node_modules\sqlite3" (
    echo 📦 安装SQLite3数据库依赖...
    npm install sqlite3
    if errorlevel 1 (
        echo ❌ 数据库依赖安装失败
        pause
        exit /b 1
    )
)
echo ✅ 数据库依赖已就绪

echo.
echo 🚀 启动后端数据库服务...
start "后端API服务 (数据库版)" cmd /k "cd /d %~dp0backend && echo 🗄️ 启动带数据库的后端服务... && node server-simple.js"

echo 等待后端数据库服务启动...
timeout /t 5 /nobreak > nul

echo.
echo 🔍 检查后端服务状态...
powershell -Command "try { Invoke-RestMethod http://localhost:3001/api/health | Out-Null; Write-Host '✅ 后端服务运行正常' } catch { Write-Host '⚠️ 后端服务启动中，请稍候...' }"

echo.
echo 🌐 启动Web配置中心...
cd /d "%~dp0web"
if not exist "node_modules" (
    echo 📦 安装Web前端依赖...
    npm install
)
start "Web配置中心" cmd /k "cd /d %~dp0web && echo 🌐 启动Web配置界面... && npm run dev"

echo 等待Web服务启动...
timeout /t 3 /nobreak > nul

echo.
echo 🌍 打开Web配置界面...
timeout /t 2 /nobreak > nul
start http://localhost:3000

echo.
echo =====================================
echo  ✅ 系统启动完成！
echo =====================================
echo.
echo 📋 运行的服务:
echo • 后端API服务 (数据库版): http://localhost:3001
echo • Web配置中心: http://localhost:3000
echo.
echo 🔐 默认测试账号:
echo • 用户名: 123456
echo • 密码: 123456
echo.
echo 💡 功能说明:
echo • ✅ 用户数据持久化存储
echo • ✅ 登录状态重启后保持
echo • ✅ AI配置实时同步
echo • ✅ 11种AI模型支持
echo.
echo 📚 使用流程:
echo 1. 在Web界面登录配置AI模型
echo 2. 启动桌面客户端进行面试
echo 3. 配置会自动同步到桌面端
echo.
echo 🛠️ 如需启动桌面客户端，请运行:
echo   npm run electron:dev
echo.
echo 按任意键关闭此窗口...
pause > nul 