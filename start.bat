@echo off
chcp 65001 >nul
title Interview Code Overlay - 启动脚本

echo ================================================================
echo           Interview Code Overlay - 统一启动脚本
echo ================================================================
echo.

:: 检查Node.js是否安装
echo [1/5] 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js未安装或未添加到PATH环境变量
    echo 请先安装Node.js: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js环境检查通过

:: 检查npm是否可用
echo [2/5] 检查npm环境...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm不可用
    pause
    exit /b 1
)
echo ✅ npm环境检查通过

:: 获取当前脚本所在目录的父目录
set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

echo.
echo 项目根目录: %CD%
echo.

:: 检查必要的目录是否存在
echo [3/5] 检查项目结构...
if not exist "backend" (
    echo ❌ backend目录不存在
    pause
    exit /b 1
)
if not exist "web" (
    echo ❌ web目录不存在
    pause
    exit /b 1
)
if not exist "InterviewCodeOverlay" (
    echo ❌ InterviewCodeOverlay目录不存在
    pause
    exit /b 1
)
echo ✅ 项目结构检查通过

:: 检查依赖是否安装
echo [4/5] 检查依赖安装状态...

cd backend
if not exist "node_modules" (
    echo 🔄 安装后端依赖...
    call npm install
    if errorlevel 1 (
        echo ❌ 后端依赖安装失败
        pause
        exit /b 1
    )
)

cd ..\web
if not exist "node_modules" (
    echo 🔄 安装Web前端依赖...
    call npm install
    if errorlevel 1 (
        echo ❌ Web前端依赖安装失败
        pause
        exit /b 1
    )
)

cd ..\InterviewCodeOverlay
if not exist "node_modules" (
    echo 🔄 安装客户端依赖...
    call npm install
    if errorlevel 1 (
        echo ❌ 客户端依赖安装失败
        pause
        exit /b 1
    )
)

cd ..
echo ✅ 依赖检查完成

echo.
echo [5/5] 启动所有服务...
echo.

:: 创建日志目录
if not exist "logs" mkdir logs

:: 启动后端服务器
echo 🚀 启动后端API服务器...
cd backend
start "Backend API Server" cmd /k "echo 后端API服务器 && npm run dev"
if errorlevel 1 (
    echo ❌ 后端服务器启动失败
    pause
    exit /b 1
)
echo ✅ 后端服务器启动中... (端口: 3001)

:: 等待2秒让后端启动
timeout /t 2 /nobreak >nul

:: 启动Web前端
echo 🚀 启动Web配置中心...
cd ..\web
start "Web Configuration Center" cmd /k "echo Web配置中心 && npm run dev"
if errorlevel 1 (
    echo ❌ Web前端启动失败
    pause
    exit /b 1
)
echo ✅ Web配置中心启动中... (端口: 3000)

:: 等待3秒让Web前端启动
timeout /t 3 /nobreak >nul

:: 启动Electron客户端
echo 🚀 启动Electron客户端...
cd ..\InterviewCodeOverlay
start "Electron Client" cmd /k "echo Electron客户端 && npm run dev"
if errorlevel 1 (
    echo ❌ Electron客户端启动失败
    pause
    exit /b 1
)
echo ✅ Electron客户端启动中...

echo.
echo ================================================================
echo                    🎉 启动完成！
echo ================================================================
echo.
echo 📋 服务状态:
echo   🔥 后端API服务器:     http://localhost:3001
echo   🌐 Web配置中心:       http://localhost:3000  
echo   💻 Electron客户端:    已启动
echo.
echo 📝 使用说明:
echo   1. 等待所有服务完全启动 (约10-30秒)
echo   2. Electron客户端会自动打开
echo   3. 首次使用需要在Web界面创建账号并登录
echo   4. 登录后即可在Electron客户端中使用所有功能
echo.
echo 🔧 故障排除:
echo   - 如果端口被占用，请先关闭占用端口的程序
echo   - 如果启动失败，请检查Node.js版本是否为16+
echo   - 可以手动打开 http://localhost:3000 访问Web界面
echo.
echo 🛑 停止服务:
echo   - 关闭所有命令行窗口即可停止服务
echo   - 或者按Ctrl+C在各个窗口中停止对应服务
echo.

:: 等待用户按键
echo 按任意键退出启动脚本...
pause >nul

:: 回到原始目录
cd "%~dp0" 