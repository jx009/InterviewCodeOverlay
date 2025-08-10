@echo off
chcp 65001 > nul
echo ================================
echo     服务器错误检查工具
echo ================================
echo.

echo [1/4] 检查TypeScript编译错误...
echo 🔧 编译TypeScript代码...
call npm run build 2>compile_errors.log
if errorlevel 1 (
    echo ❌ 发现TypeScript编译错误:
    echo.
    type compile_errors.log
    echo.
    echo 这可能是导致500错误的原因！
    pause
    exit /b 1
) else (
    echo ✅ TypeScript编译成功
)
if exist compile_errors.log del compile_errors.log

echo.
echo [2/4] 检查配置文件...
if exist "config\database-config.json" (
    echo ✅ 配置文件存在
    echo 📋 配置文件内容:
    type config\database-config.json
) else (
    echo ❌ 配置文件不存在！
    echo 这是导致500错误的原因。
    echo.
    echo 解决方案:
    copy config\database-config.example.json config\database-config.json
    echo ✅ 已创建配置文件，请重新启动服务器
)

echo.
echo [3/4] 测试数据库连接...
echo 🔍 测试MySQL连接:
node -e "
const { getConfig, initializeDatabase } = require('./dist/src/config/database.js');
(async () => {
  try {
    await initializeDatabase();
    console.log('✅ 数据库连接成功');
    process.exit(0);
  } catch (error) {
    console.log('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
})();
" 2>db_error.log
if errorlevel 1 (
    echo ❌ 数据库连接失败:
    type db_error.log
    echo.
    echo 这可能是导致500错误的原因！
)
if exist db_error.log del db_error.log

echo.
echo [4/4] 启动临时测试服务器...
echo 🚀 启动测试服务器来查看详细错误...
timeout /t 2 > nul

echo 启动中，请观察下面的日志输出：
echo ================================
call npm run dev

pause 