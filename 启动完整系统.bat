@echo off
chcp 65001 > nul
echo =====================================
echo 🚀 Interview Code Overlay 完整系统启动
echo 版本: v2.0 (带数据库持久化)
echo =====================================
echo.

echo 📋 检查环境...
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

echo ✅ Node.js 环境正常

echo.
echo 🗄️ 启动后端数据库服务...
cd /d "%~dp0backend"

REM 检查依赖是否安装
if not exist "node_modules\mysql2" (
    echo 📦 安装MySQL数据库依赖...
    npm install mysql2
)

REM 启动后端服务（带MySQL数据库）
echo 🚀 启动后端API服务 (端口:3001)
start "后端API服务" cmd /c "node server-simple.js & pause"

echo 等待后端服务启动...
timeout /t 3 /nobreak > nul

REM 检查后端健康状态
echo 🔍 检查后端服务状态...
curl -s http://localhost:3001/api/health > nul
if errorlevel 1 (
    echo ⚠️ 后端服务启动可能有问题，但继续启动其他服务...
) else (
    echo ✅ 后端服务运行正常
)

echo.
echo 🌐 启动Web配置中心...
cd /d "%~dp0web"

REM 检查Web依赖
if not exist "node_modules" (
    echo 📦 安装Web依赖...
    npm install
)

echo 🚀 启动Web配置中心 (端口:5173)
start "Web配置中心" cmd /c "npm run dev & pause"

echo 等待Web服务启动...
timeout /t 5 /nobreak > nul

echo.
echo 🖥️ 启动桌面客户端...
cd /d "%~dp0"

REM 检查桌面端依赖
if not exist "node_modules" (
    echo 📦 安装桌面端依赖...
    npm install
)

echo 🚀 启动桌面客户端
start "桌面客户端" cmd /c "npm run electron:dev & pause"

echo.
echo 🌍 打开Web配置界面...
timeout /t 2 /nobreak > nul
start http://localhost:5173

echo.
echo =====================================
echo ✅ 系统启动完成！
echo =====================================
echo 📋 运行的服务:
echo • 后端API服务: http://localhost:3001
echo • Web配置中心: http://localhost:5173
echo • 桌面客户端: Electron应用
echo.
echo 🔐 默认测试账号:
echo • 用户名: 123456
echo • 密码: 123456
echo.
echo 📚 使用流程:
echo 1. 在Web界面登录并配置AI模型
echo 2. 桌面客户端会自动同步Web配置
echo 3. 数据持久化存储，重启不丢失
echo.
echo =====================================
echo 🛠️ 系统管理:
echo =====================================
echo • 查看数据库: MySQL数据库 (localhost:3306)
echo • 后端日志: 后端API服务窗口
echo • Web日志: Web配置中心窗口
echo • 桌面日志: 桌面客户端窗口
echo.

echo 按任意键查看系统状态...
pause > nul

echo.
echo 🔍 检查系统状态...
echo.

echo 📊 后端API健康检查:
curl -s http://localhost:3001/api/health

echo.
echo 📊 Web服务状态:
curl -s http://localhost:5173 > nul
if errorlevel 1 (
    echo ❌ Web服务无响应
) else (
    echo ✅ Web服务正常
)

echo.
echo 📊 数据库状态:
cd /d "%~dp0backend"
echo ✅ 使用MySQL数据库
echo 📄 连接地址: localhost:3306/interview_coder

echo.
echo 按任意键关闭所有服务...
pause > nul

echo.
echo 🛑 关闭所有服务...
taskkill /f /im node.exe 2>nul
taskkill /f /im electron.exe 2>nul

echo ✅ 系统已关闭
pause 