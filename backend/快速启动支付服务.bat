@echo off
chcp 65001
title 微信支付V2服务快速启动

echo.
echo ========================================
echo 🔧 微信支付V2服务快速启动
echo ========================================
echo.

echo 📋 检查环境配置...

REM 检查.env文件是否存在
if not exist ".env" (
    echo ❌ .env文件不存在
    echo 正在创建基础配置文件...
    
    REM 复制配置模板
    if exist "env.example" (
        copy "env.example" ".env" >nul
        echo ✅ 已复制基础配置模板
    ) else (
        echo ❌ 配置模板不存在，请手动创建.env文件
        echo 请参考 微信支付V2配置指南.md 进行配置
        pause
        exit /b 1
    )
    
    REM 如果存在支付配置模板，则合并
    if exist "env.payment.example" (
        echo. >> ".env"
        echo # 支付配置 >> ".env"
        type "env.payment.example" >> ".env"
        echo ✅ 已合并支付配置模板
    )
    
    echo.
    echo ⚠️  请编辑.env文件，配置以下必要参数：
    echo   - WECHAT_PAY_V2_APP_ID（微信AppID）
    echo   - WECHAT_PAY_V2_MCH_ID（微信商户号）
    echo   - WECHAT_PAY_V2_API_KEY（微信API密钥）
    echo   - DATABASE_URL（数据库连接）
    echo   - REDIS_URL（Redis连接）
    echo   - JWT_SECRET（JWT密钥）
    echo.
    echo 配置完成后请重新运行此脚本
    pause
    exit /b 0
)

echo ✅ .env文件存在

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装，请先安装Node.js
    pause
    exit /b 1
)

echo ✅ Node.js已安装

REM 检查npm依赖是否安装
if not exist "node_modules" (
    echo 📦 正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 依赖已安装
)

echo.
echo 🔄 检查服务状态...

REM 检查端口是否被占用
netstat -an | findstr ":3001" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  端口3001已被占用，请检查是否有其他服务在运行
    echo 继续启动可能会失败
    choice /C YN /M "是否继续启动服务？"
    if %errorlevel% equ 2 (
        echo 已取消启动
        pause
        exit /b 0
    )
)

echo.
echo 🚀 启动支付服务...
echo.
echo 服务将在以下地址启动：
echo   - 后端API: http://localhost:3001
echo   - 支付接口: http://localhost:3001/api/payment
echo.
echo 按 Ctrl+C 停止服务
echo.

REM 启动服务
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo ❌ 服务启动失败
    echo.
    echo 🔍 可能的原因：
    echo   1. 端口被占用
    echo   2. 数据库连接失败
    echo   3. Redis连接失败
    echo   4. 环境变量配置错误
    echo.
    echo 请检查控制台错误信息，并参考配置指南进行修复
    pause
    exit /b 1
)

echo.
echo ✅ 服务已启动完成
pause 