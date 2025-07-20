@echo off
title Interview Code Overlay - 快速启动

echo 🚀 启动 Interview Code Overlay...
echo.

:: 获取项目根目录
set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

:: 启动后端
echo 启动后端服务器...
cd backend
start "Backend" cmd /k "npm run dev"

:: 启动Web前端
echo 启动Web配置中心...
cd ..\web
start "Web" cmd /k "npm run dev"

:: 启动客户端
echo 启动Electron客户端...
cd ..\InterviewCodeOverlay
start "Client" cmd /k "npm run dev"

echo.
echo ✅ 所有服务已启动！
echo 📝 请等待各服务完全启动后使用
echo.
pause 