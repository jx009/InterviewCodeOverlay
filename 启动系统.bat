@echo off
chcp 65001 > nul
title 启动InterviewCodeOverlay系统

echo.
echo =====================================
echo   启动InterviewCodeOverlay系统
echo =====================================
echo.

echo 停止现有Node.js进程...
taskkill /f /im node.exe >nul 2>&1

echo.
echo 启动增强认证服务器...
start "后端服务器" cmd /k "cd /d %~dp0backend && echo 启动增强认证服务器... && node server-simple.js"

echo.
echo 等待后端服务启动...
timeout /t 5 /nobreak > nul

echo.
echo 启动Web前端...
start "Web前端" cmd /k "cd /d %~dp0web && echo 启动Web前端... && npm install && npm run dev"

echo.
echo 等待服务启动...
timeout /t 8 /nobreak > nul

echo.
echo 打开浏览器...
start http://localhost:3000

echo.
echo =====================================
echo   系统启动完成！
echo =====================================
echo.
echo 服务地址:
echo - 后端API: http://localhost:3001
echo - Web前端: http://localhost:3000
echo.
echo 增强认证API:
echo - POST /api/mail_verify     - 邮箱验证（发送验证码）
echo - POST /api/verify_code     - 验证验证码
echo - POST /api/user_register   - 增强用户注册  
echo - POST /api/login          - 增强用户登录
echo - POST /api/logout         - 增强用户登出
echo - GET  /api/session_status  - 检查会话状态
echo.
echo 配置管理API:
echo - GET  /api/config/models   - 获取AI模型列表
echo - GET  /api/config/languages - 获取编程语言列表
echo - GET  /api/config          - 获取用户配置
echo - PUT  /api/config          - 更新用户配置
echo.
echo 现在可以在Web前端测试完整的增强认证和配置管理流程了！
echo - 默认验证码：123456（开发环境）
echo - 支持邮箱验证码注册和登录
echo - 登录成功后自动跳转到配置管理页面
echo.
echo 按任意键关闭此窗口...
pause > nul 