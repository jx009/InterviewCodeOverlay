@echo off
chcp 65001 >nul
title SMTP配置向导 - InterviewCodeOverlay

echo.
echo ========================================
echo     SMTP邮件服务配置向导
echo ========================================
echo.
echo 这个工具将帮助您快速配置邮件服务
echo 支持Gmail、Outlook、QQ邮箱等主流邮件服务商
echo.
echo 按任意键开始配置...
pause >nul

echo.
echo 正在启动配置向导...
node configure-smtp.js

echo.
echo 配置完成！按任意键退出...
pause >nul 