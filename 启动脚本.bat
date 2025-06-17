@echo off
chcp 65001 > nul
title Interview Code Overlay - 开发服务器

echo.
echo ================================
echo  Interview Code Overlay
echo  开发服务器启动脚本
echo ================================
echo.

echo 正在启动后端服务器...
start "后端服务器" cmd /k "cd /d %~dp0backend && node server-simple.js"

echo 等待后端启动...
timeout /t 3 /nobreak > nul

echo.
echo 正在启动前端服务器...
start "前端服务器" cmd /k "cd /d %~dp0web && npm run dev"

echo.
echo ================================
echo  服务器启动完成！
echo ================================
echo.
echo 后端服务: http://localhost:3001
echo 前端服务: http://localhost:3000
echo.
echo 按任意键关闭此窗口...
pause > nul 