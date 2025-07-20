@echo off
chcp 65001 > nul
echo ================================
echo    数据库迁移问题修复工具
echo ================================
echo.

echo [1/8] 检查Node.js和npm环境...
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ 请先安装Node.js
    pause
    exit /b 1
)
npm --version > nul 2>&1
if errorlevel 1 (
    echo ❌ 请先安装npm
    pause
    exit /b 1
)
echo ✅ Node.js和npm环境正常

echo.
echo [2/8] 检查配置文件...
if not exist "config\database-config.json" (
    echo ❌ 配置文件不存在，正在创建默认配置...
    if not exist "config" mkdir config
    
    if exist "config\database-config.example.json" (
        copy "config\database-config.example.json" "config\database-config.json"
        echo ✅ 已从示例模板创建配置文件
    ) else (
        echo ❌ 配置模板文件不存在，请运行: 快速配置数据库.bat
        pause
        exit /b 1
    )
) else (
    echo ✅ 配置文件存在
)

echo.
echo [3/8] 停止现有服务进程...
taskkill /f /im node.exe > nul 2>&1
echo ✅ 已停止现有Node.js进程

echo.
echo [4/8] 清理和重新安装依赖...
if exist "node_modules" (
    echo 🧹 删除旧的node_modules...
    rmdir /s /q node_modules
)
if exist "package-lock.json" (
    echo 🧹 删除package-lock.json...
    del package-lock.json
)

echo 📦 重新安装依赖包...
call npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✅ 依赖安装完成

echo.
echo [5/8] 检查TypeScript编译...
echo 🔧 编译TypeScript代码...
call npm run build
if errorlevel 1 (
    echo ❌ TypeScript编译失败，请检查代码错误
    echo.
    echo 常见问题:
    echo 1. 类型定义错误
    echo 2. 缺少依赖包
    echo 3. 配置文件格式错误
    pause
    exit /b 1
)
echo ✅ TypeScript编译成功

echo.
echo [6/8] 检查数据库连接...
echo 🔍 测试数据库连接...
call npm run db:check
if errorlevel 1 (
    echo ❌ 数据库连接失败
    echo.
    echo 请检查以下配置:
    echo 1. MySQL服务是否启动
    echo 2. config\database-config.json 中的连接信息是否正确
    echo 3. 数据库用户权限是否正确
    echo.
    echo 修复建议:
    echo 1. 检查MySQL服务: services.msc 查找MySQL服务
    echo 2. 测试连接: mysql -u用户名 -p数据库名
    echo 3. 重新配置: 快速配置数据库.bat
    pause
    exit /b 1
)
echo ✅ 数据库连接正常

echo.
echo [7/8] 生成Prisma客户端和运行迁移...
echo 🔧 生成Prisma客户端...
call npm run generate
if errorlevel 1 (
    echo ❌ Prisma客户端生成失败
    pause
    exit /b 1
)

echo 🗄️ 运行数据库迁移...
call npm run migrate
if errorlevel 1 (
    echo ❌ 数据库迁移失败
    echo.
    echo 可能的原因:
    echo 1. 数据库结构冲突
    echo 2. 权限不足
    echo 3. 数据库版本不兼容
    echo.
    echo 解决方案:
    echo 1. 删除数据库重新创建
    echo 2. 检查用户权限
    echo 3. 运行: npm run db:reset
    pause
    exit /b 1
)
echo ✅ 数据库迁移完成

echo.
echo [8/8] 启动服务测试...
echo 🚀 启动开发服务器...
timeout /t 2 > nul

start "Backend Server" cmd /c "npm run dev"
timeout /t 5 > nul

echo 🔍 测试健康检查接口...
curl http://localhost:3001/health > nul 2>&1
if errorlevel 1 (
    echo ⚠️ 健康检查接口无响应，但服务可能正在启动中...
) else (
    echo ✅ 服务器启动成功
)

echo.
echo ================================
echo     🎉 修复完成！
echo ================================
echo.
echo 服务状态:
echo 🔗 API地址: http://localhost:3001
echo 💚 健康检查: http://localhost:3001/health
echo 🔐 登录页面: http://localhost:3001/login
echo.
echo 如果仍有问题，请检查:
echo 1. 浏览器控制台错误信息
echo 2. 后端服务器控制台日志
echo 3. config\database-config.json 配置是否正确
echo.
echo 故障排除:
echo - 查看日志: 检查后端服务器窗口的错误信息
echo - 重新配置: 运行 快速配置数据库.bat
echo - 完全重置: 删除数据库并重新创建
echo.

pause 