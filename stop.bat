@echo off
chcp 65001 >nul
title Interview Code Overlay - 停止脚本

echo ================================================================
echo           Interview Code Overlay - 停止所有服务
echo ================================================================
echo.

echo 🛑 正在停止所有相关进程...
echo.

:: 停止Node.js进程 (包含backend和web)
echo 停止Node.js进程...
taskkill /f /im node.exe >nul 2>&1
if errorlevel 1 (
    echo ⚠️  没有找到运行中的Node.js进程
) else (
    echo ✅ Node.js进程已停止
)

:: 停止Electron进程
echo 停止Electron进程...
taskkill /f /im electron.exe >nul 2>&1
if errorlevel 1 (
    echo ⚠️  没有找到运行中的Electron进程
) else (
    echo ✅ Electron进程已停止
)

:: 停止可能的开发服务器进程
echo 停止开发服务器进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /f /pid %%a >nul 2>&1

:: 关闭相关的命令行窗口
echo 关闭相关窗口...
taskkill /f /fi "WindowTitle eq Backend API Server*" >nul 2>&1
taskkill /f /fi "WindowTitle eq Web Configuration Center*" >nul 2>&1
taskkill /f /fi "WindowTitle eq Electron Client*" >nul 2>&1
taskkill /f /fi "WindowTitle eq Backend*" >nul 2>&1
taskkill /f /fi "WindowTitle eq Web*" >nul 2>&1
taskkill /f /fi "WindowTitle eq Client*" >nul 2>&1

echo.
echo ================================================================
echo                    ✅ 停止完成！
echo ================================================================
echo.
echo 📋 已停止的服务:
echo   🔥 后端API服务器
echo   🌐 Web配置中心
echo   💻 Electron客户端
echo.
echo 📝 说明:
echo   - 所有相关进程已被终止
echo   - 端口3000和3001已被释放
echo   - 可以安全地重新启动服务
echo.

pause 