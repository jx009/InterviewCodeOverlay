@echo off
title 启动增强认证服务
cd /d "%~dp0"

echo ===============================================
echo 🚀 启动 InterviewCodeOverlay 增强认证服务
echo ===============================================

echo 切换到后端目录...
cd InterviewCodeOverlay\backend

echo 检查Node.js环境...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装或不在PATH中
    pause
    exit /b 1
)

echo 检查后端文件...
if not exist "server-simple.js" (
    echo ❌ 找不到 server-simple.js 文件
    pause
    exit /b 1
)

echo 初始化数据库...
node -e "const db = require('./database'); const instance = new db(); instance.init().then(() => { console.log('数据库初始化完成'); process.exit(0); }).catch(err => { console.error('数据库初始化失败:', err); process.exit(1); });"

echo 启动增强认证服务器...
echo 端口: 3001
echo 服务: 增强认证 + 传统认证 + 配置管理API
echo 功能: 邮箱验证码 + 会话管理 + 用户配置
echo ===============================================

node server-simple.js

pause 