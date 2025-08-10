@echo off
chcp 65001 > nul
title 完整认证服务器

echo.
echo =====================================
echo  启动完整认证服务器
echo =====================================
echo.

echo 检查Redis服务...
powershell -Command "try { $client = New-Object System.Net.Sockets.TcpClient; $client.Connect('localhost', 6379); $client.Close(); Write-Host 'Redis服务正常运行' } catch { Write-Host 'Redis服务未启动，请先启动Redis服务'; Write-Host '位置: C:\Program Files\Redis\redis-server.exe' }"

echo.
echo 检查MySQL服务...
powershell -Command "try { $client = New-Object System.Net.Sockets.TcpClient; $client.Connect('localhost', 3306); $client.Close(); Write-Host 'MySQL服务正常运行' } catch { Write-Host 'MySQL服务未启动，请先启动MySQL服务' }"

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
    echo 请运行: node configure-smtp.js
) else (
    echo SMTP配置已找到
)

echo.
echo 停止现有Node.js进程...
taskkill /f /im node.exe >nul 2>&1

echo.
echo =====================================
echo  启动完整认证服务器
echo =====================================
echo.
echo 技术栈:
echo - Redis: 真实Redis服务 (C:\Program Files\Redis)
echo - MySQL: 用户数据存储
echo - SMTP: 邮件发送服务
echo - bcrypt: 密码加密
echo - 30位session_id: 会话管理
echo.
echo 流程图API:
echo - POST /api/mail_verify     - 邮箱验证
echo - POST /api/user_register   - 用户注册
echo - POST /api/login          - 用户登录
echo.

node complete-auth-server.js

echo.
echo 按任意键关闭...
pause 