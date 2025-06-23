@echo off
chcp 65001 >nul
title Web管理界面启动器

echo.
echo ====================================
echo    Web管理界面启动器
echo ====================================
echo.

:: 检查Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到Node.js
    echo 请先安装Node.js：https://nodejs.org/
    pause
    exit /b 1
)

:: 检查端口3000是否被占用
echo 🔍 检查端口3000...
netstat -an | findstr ":3000 " >nul
if %errorlevel% equ 0 (
    echo ⚠️  警告：端口3000已被占用
    echo.
    choice /C YN /M "是否继续启动？可能会失败"
    if errorlevel 2 exit /b 1
)

:: 检查依赖
echo 📦 检查依赖...
if not exist "node_modules" (
    echo 🚀 正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

:: 启动开发服务器
echo.
echo 🚀 启动Web管理界面...
echo.
echo 📋 服务器信息：
echo    - 本地地址：http://localhost:3000
echo    - 管理界面：http://localhost:3000/manager
echo    - 网络地址：http://0.0.0.0:3000
echo.
echo 💡 提示：
echo    - 按 Ctrl+C 停止服务器
echo    - 管理员账户才能访问 /manager 页面
echo    - 确保后端服务(端口3001)已启动
echo.

:: 启动Vite开发服务器，并支持路由回退
call npm run dev -- --host 0.0.0.0 --open

pause 