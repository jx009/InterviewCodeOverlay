@echo off
chcp 65001 > nul
echo ================================
echo    数据库迁移到MySQL
echo ================================
echo.

echo [1/6] 检查Node.js环境...
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ 请先安装Node.js
    pause
    exit /b 1
)
echo ✅ Node.js环境正常

echo.
echo [2/6] 安装项目依赖...
call npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✅ 依赖安装完成

echo.
echo [3/6] 检查环境配置...
if not exist ".env" (
    echo ⚠️ 未找到.env文件，正在复制示例配置...
    copy "env.example" ".env"
    echo ❌ 请先配置.env文件中的数据库连接信息
    echo    DATABASE_URL="mysql://username:password@localhost:3306/interview_coder"
    pause
    exit /b 1
)
echo ✅ 环境配置文件存在

echo.
echo [4/6] 初始化MySQL数据库...
call npm run db:init
if errorlevel 1 (
    echo ❌ 数据库初始化失败，请检查：
    echo    1. MySQL服务是否启动
    echo    2. .env文件中的数据库配置是否正确
    echo    3. 数据库用户是否有足够权限
    pause
    exit /b 1
)
echo ✅ 数据库初始化完成

echo.
echo [5/6] 生成Prisma客户端和运行迁移...
call npm run generate
if errorlevel 1 (
    echo ❌ Prisma客户端生成失败
    pause
    exit /b 1
)

call npm run migrate
if errorlevel 1 (
    echo ❌ 数据库迁移失败
    pause
    exit /b 1
)
echo ✅ 数据库迁移完成

echo.
echo [6/6] 验证迁移结果...
call npm run db:check
if errorlevel 1 (
    echo ❌ 数据库连接验证失败
    pause
    exit /b 1
)

echo.
echo ================================
echo     🎉 MySQL迁移成功完成！
echo ================================
echo.
echo 迁移完成的功能：
echo ✅ MySQL数据库替换SQLite
echo ✅ 用户认证系统
echo ✅ 配置管理系统  
echo ✅ 会话管理系统
echo ✅ 邮箱验证码功能
echo ✅ Redis缓存支持
echo.
echo 下一步：
echo 1. 配置Redis服务器（可选）
echo 2. 配置邮件SMTP设置（用于验证码）
echo 3. 运行 npm run dev 启动开发服务器
echo.

pause 