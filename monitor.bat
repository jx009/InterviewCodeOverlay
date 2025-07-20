@echo off
chcp 65001 >nul
title Interview Code Overlay - 服务监控

:monitor_loop
cls
echo ================================================================
echo           Interview Code Overlay - 服务状态监控
echo ================================================================
echo 更新时间: %date% %time%
echo.

:: 检查后端API服务器
echo 🔍 后端API服务器 (端口 3001):
netstat -ano | findstr :3001 >nul 2>&1
if errorlevel 1 (
    echo ❌ 未运行
) else (
    echo ✅ 正在运行
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do echo    进程ID: %%a
)

echo.

:: 检查Web配置中心
echo 🔍 Web配置中心 (端口 3000):
netstat -ano | findstr :3000 >nul 2>&1
if errorlevel 1 (
    echo ❌ 未运行
) else (
    echo ✅ 正在运行
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do echo    进程ID: %%a
    
    :: 测试HTTP响应
    curl -s -o nul http://localhost:3000
    if errorlevel 1 (
        echo ⚠️  端口开放但服务未响应
    ) else (
        echo ✅ HTTP服务正常响应
    )
)

echo.

:: 检查Electron客户端
echo 🔍 Electron客户端:
tasklist | findstr electron.exe >nul 2>&1
if errorlevel 1 (
    echo ❌ 未运行
) else (
    echo ✅ 正在运行
    for /f "tokens=2" %%a in ('tasklist ^| findstr electron.exe') do echo    进程ID: %%a
)

echo.

:: 检查Node.js进程
echo 🔍 Node.js 进程总数:
for /f %%a in ('tasklist /fo csv ^| findstr "node.exe" ^| find /c /v ""') do echo    运行中的Node.js进程: %%a 个

echo.
echo ================================================================
echo 📋 快捷操作:
echo   [R] 刷新状态
echo   [S] 启动所有服务 (start-enhanced.bat)
echo   [T] 停止所有服务 (stop.bat)
echo   [W] 打开Web界面 (http://localhost:3000)
echo   [Q] 退出监控
echo ================================================================
echo.

:: 自动刷新或等待用户输入
echo 提示: 5秒后自动刷新，或按任意键立即刷新...
choice /c RSTQW /t 5 /d R /n >nul

if errorlevel 5 (
    start http://localhost:3000
    goto monitor_loop
)
if errorlevel 4 (
    exit /b 0
)
if errorlevel 3 (
    call stop.bat
    goto monitor_loop
)
if errorlevel 2 (
    call start-enhanced.bat
    goto monitor_loop
)
if errorlevel 1 (
    goto monitor_loop
)

goto monitor_loop 