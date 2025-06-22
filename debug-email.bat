@echo off
cd /d "%~dp0"

echo ====================================================================
echo InterviewCodeOverlay 邮箱验证码发送问题调试工具
echo ====================================================================
echo.
echo 此工具将帮您排查邮箱验证码发送失败的问题...
echo.

node debug-email-verification.js

echo.
echo 调试完成。按任意键关闭窗口...
pause >nul 