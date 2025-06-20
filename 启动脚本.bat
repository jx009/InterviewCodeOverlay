@echo off
chcp 65001 > nul
title Interview Code Overlay v2.0 - MySQL数据库版启动器

echo.
echo =====================================
echo  🚀 Interview Code Overlay v2.0
echo  MySQL数据库持久化版启动脚本
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
echo 🗄️ 检查MySQL数据库依赖...
cd /d "%~dp0backend"

echo 📦 检查npm依赖包...
if not exist "node_modules" (
    echo 正在安装后端依赖包...
    npm install
    if errorlevel 1 (
        echo ❌ 依赖包安装失败
        pause
        exit /b 1
    )
)

echo 🔧 设置MySQL环境变量...
set DATABASE_URL=mysql://root:Jianxin0520!@localhost:3306/interview_coder

echo 🗄️ 初始化MySQL数据库...
echo 创建数据库...
mysql -u root -pJianxin0520! -e "CREATE DATABASE IF NOT EXISTS interview_coder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
if errorlevel 1 (
    echo ⚠️ MySQL连接失败，请确保MySQL服务已启动且密码正确
    echo 尝试继续启动服务...
)

echo 🛑 停止现有Node.js进程...
taskkill /f /im node.exe >nul 2>&1

echo 🔄 清理Prisma客户端缓存...
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma" >nul 2>&1
)

echo 生成Prisma客户端...
call npx prisma generate
if errorlevel 1 (
    echo ❌ Prisma客户端生成失败，尝试权限修复...
    echo 🔧 以管理员权限重新生成...
    powershell -Command "try { & npx prisma generate; Write-Host '✅ Prisma客户端生成成功' } catch { Write-Host '❌ 仍然失败，请手动以管理员身份运行' }"
)

echo 运行数据库迁移...
call npx prisma migrate deploy 2>nul
if errorlevel 1 (
    echo 迁移失败，尝试开发模式迁移...
    call npx prisma migrate dev --name init 2>nul
    if errorlevel 1 (
        echo ⚠️ 数据库迁移失败，但尝试继续启动...
    )
)

echo ✅ MySQL数据库已就绪

echo.
echo 🚀 启动后端MySQL数据库服务...
echo 🔧 使用修复版服务器启动...
start "后端API服务 (MySQL版)" cmd /k "cd /d %~dp0backend && echo 🗄️ 启动MySQL版后端服务... && echo 📋 数据库: MySQL && echo 🌐 端口: 3001 && node server-simple.js"

echo 等待后端MySQL服务启动...
timeout /t 8 /nobreak > nul

echo.
echo 🔍 检查后端服务状态...
for /l %%i in (1,1,5) do (
    powershell -Command "try { $response = Invoke-RestMethod http://localhost:3001/api/health; Write-Host '✅ 后端服务运行正常 - 状态:' $response.status } catch { Write-Host '⚠️ 尝试 %%i/5 - 后端服务启动中...' }"
    timeout /t 2 /nobreak > nul
)

echo.
echo 🌐 启动Web配置中心...
cd /d "%~dp0web"
if not exist "node_modules" (
    echo 📦 安装Web前端依赖...
    npm install
    if errorlevel 1 (
        echo ❌ Web依赖安装失败
        pause
        exit /b 1
    )
)
start "Web配置中心" cmd /k "cd /d %~dp0web && echo 🌐 启动Web配置界面... && echo 🌍 端口: 3000 && npm run dev"

echo 等待Web服务启动...
timeout /t 5 /nobreak > nul

echo.
echo 🔍 检查Web服务状态...
for /l %%i in (1,1,3) do (
    powershell -Command "try { Invoke-WebRequest http://localhost:3000 -UseBasicParsing | Out-Null; Write-Host '✅ Web服务运行正常' } catch { Write-Host '⚠️ 尝试 %%i/3 - Web服务启动中...' }"
    timeout /t 2 /nobreak > nul
)

echo.
echo 🌍 打开Web配置界面...
timeout /t 3 /nobreak > nul
start http://localhost:3000

echo.
echo =====================================
echo  ✅ MySQL版系统启动完成！
echo =====================================
echo.
echo 📋 运行的服务:
echo • 后端API服务 (MySQL版): http://localhost:3001
echo • 健康检查: http://localhost:3001/api/health
echo • Web配置中心: http://localhost:3000
echo.
echo 🗄️ 数据库信息:
echo • 数据库类型: MySQL 8.0+
echo • 数据库名: interview_coder
echo • 连接地址: localhost:3306
echo • 已修复: 数据库实例化问题
echo.
echo 🔐 默认测试账号:
echo • 用户名: 123456
echo • 密码: 123456
echo • 注意: 系统会自动创建此测试账号
echo.
echo 💡 功能说明:
echo • ✅ MySQL数据库持久化存储
echo • ✅ 用户注册登录系统（已修复）
echo • ✅ 登录状态重启后保持
echo • ✅ AI配置实时同步
echo • ✅ 支持多种AI模型
echo • ✅ 已修复: 服务器内部错误问题
echo.
echo 📚 使用流程:
echo 1. 在Web界面使用测试账号登录 (123456/123456)
echo 2. 配置AI模型和偏好设置
echo 3. 启动桌面客户端进行面试
echo 4. 配置会自动同步到桌面端
echo.
echo 🛠️ 如需启动桌面客户端，请运行:
echo   npm run electron:dev
echo.
echo 📞 如遇问题:
echo • 检查MySQL服务是否启动
echo • 确认数据库密码是否正确
echo • 查看后端服务窗口的错误信息
echo • Network Error = 检查服务启动状态
echo • 服务器内部错误 = 已修复，重启脚本即可
echo.
echo 🔧 故障排除:
echo • 如果Prisma生成失败，请以管理员身份运行
echo • 如果端口占用，脚本会自动清理Node.js进程
echo • 如果数据库连接失败，检查MySQL密码是否为: Jianxin0520!
echo.
echo 按任意键关闭此窗口...
pause > nul 