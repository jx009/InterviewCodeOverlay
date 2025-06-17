@echo off
title Interview Code Overlay - Web前端启动器
echo.
echo ================================
echo Interview Code Overlay Web前端
echo ================================
echo.
echo 正在启动Web配置中心...
echo.

:: 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未找到Node.js，请先安装Node.js
    echo 下载地址：https://nodejs.org
    pause
    exit /b
)

:: 检查是否在正确目录
if not exist "package.json" (
    echo ❌ 错误：请确保在web目录下运行此脚本
    pause
    exit /b
)

:: 检查依赖是否安装
if not exist "node_modules" (
    echo 📦 首次运行，正在安装依赖...
    npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b
    )
)

echo ✅ 环境检查完成
echo.
echo 🚀 启动Web开发服务器...
echo.
echo 📋 重要提示：
echo   - 请确保后端服务器已启动（端口3001）
echo   - 前端将运行在：http://localhost:3000
echo   - 按 Ctrl+C 可停止服务器
echo.
echo ================================
echo.

:: 启动开发服务器
npm run dev

echo.
echo 服务器已停止
pause 