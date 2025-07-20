@echo off
chcp 65001 > nul
title 简化积分服务

echo.
echo =====================================
echo  启动简化积分服务
echo =====================================
echo.

echo 检查配置文件...
if not exist ".env" (
    echo 复制配置文件...
    copy env.example .env
)

echo 设置临时环境变量...
set WECHAT_PAY_APP_ID=test
set WECHAT_PAY_MCH_ID=test
set WECHAT_PAY_API_KEY=test
set WECHAT_PAY_API_V3_KEY=test
set WECHAT_PAY_NOTIFY_URL=http://localhost:3001/api/payment/notify

echo.
echo 停止现有进程...
taskkill /f /im node.exe >nul 2>&1

echo.
echo 启动简化积分服务...
echo 端口: 3001
echo 支持: 积分检查和扣除
echo 数据库: MySQL
echo 会话: Redis
echo.

npx ts-node --transpile-only --files src/server-enhanced.ts

echo.
echo 按任意键关闭...
pause 