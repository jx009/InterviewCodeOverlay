@echo off
echo 🚀 启动 InterviewCodeOverlay 增强版服务器...
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：Node.js 未安装或未添加到PATH
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查Redis是否运行
echo 🔍 检查Redis服务状态...
redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ 警告：Redis服务未运行
    echo 尝试启动Redis服务...
    
    REM 尝试启动Redis（如果已安装）
    start /min redis-server >nul 2>&1
    timeout /t 3 >nul
    
    redis-cli ping >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Redis启动失败，请手动启动Redis服务
        echo 下载地址: https://github.com/MicrosoftArchive/redis/releases
        echo 或使用Docker: docker run --name redis -p 6379:6379 -d redis
        pause
        exit /b 1
    ) else (
        echo ✅ Redis服务启动成功
    )
) else (
    echo ✅ Redis服务正在运行
)

REM 检查环境变量文件
if not exist ".env" (
    echo 📝 创建环境变量文件...
    copy "env.example" ".env"
    echo ⚠️ 请编辑 .env 文件配置SMTP邮件参数
)

REM 检查数据库配置
if not exist "config\database-config.json" (
    echo 📝 创建数据库配置文件...
    copy "config\database-config.example.json" "config\database-config.json"
    echo ⚠️ 请编辑 config\database-config.json 配置数据库参数
)

echo.
echo 🔧 安装依赖包...
npm install

echo.
echo 📦 构建TypeScript...
npm run build

echo.
echo 🗄️ 检查数据库连接...
npm run db:check

echo.
echo 🚀 启动增强版服务器...
node dist/server-enhanced.js

pause 