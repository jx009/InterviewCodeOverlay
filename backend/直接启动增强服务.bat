@echo off
chcp 65001 > nul
title 增强认证服务器

echo.
echo =====================================
echo  启动增强认证服务器
echo =====================================
echo.

echo 检查配置文件...
if not exist ".env" (
    echo 复制配置文件...
    copy env.example .env
)

echo 检查SMTP配置...
findstr /c:"SMTP_HOST=" ".env" >nul
if errorlevel 1 (
    echo 警告: SMTP未配置，验证码功能不可用
) else (
    echo SMTP配置已找到
)

echo 检查Redis连接...
powershell -Command "try { $client = New-Object System.Net.Sockets.TcpClient; $client.Connect('localhost', 6379); $client.Close(); Write-Host 'Redis连接正常' } catch { Write-Host 'Redis未连接，但可以继续' }"

echo.
echo 停止现有进程...
taskkill /f /im node.exe >nul 2>&1

echo.
echo 使用工作版本的配置文件启动服务器...
echo 端口: 3001
echo 支持: 邮箱验证码注册
echo 数据库: MySQL
echo 会话: Redis
echo.

REM 直接使用工作的配置文件启动
npx ts-node --transpile-only --files src/server-enhanced.ts

echo.
echo 按任意键关闭...
pause 