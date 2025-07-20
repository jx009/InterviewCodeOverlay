@echo off
chcp 65001 > nul
echo ================================
echo     登录问题诊断工具
echo ================================
echo.

echo [1/6] 检查配置文件状态...
if exist "config\database-config.json" (
    echo ✅ 配置文件存在
    
    echo 📋 配置文件大小:
    for %%I in (config\database-config.json) do echo    %%~zI 字节
    
    echo 📋 配置文件修改时间:
    for %%I in (config\database-config.json) do echo    %%~tI
) else (
    echo ❌ 配置文件不存在！
    echo.
    echo 解决方案:
    echo 1. 运行: 快速配置数据库.bat
    echo 2. 或复制: copy config\database-config.example.json config\database-config.json
    pause
    exit /b 1
)

echo.
echo [2/6] 检查服务进程状态...
echo 🔍 检查Node.js进程:
tasklist /fi "imagename eq node.exe" | find "node.exe" > nul
if errorlevel 1 (
    echo    ❌ 没有运行中的Node.js进程
    echo    提示: 后端服务可能未启动
) else (
    echo    ✅ 发现Node.js进程
    tasklist /fi "imagename eq node.exe"
)

echo.
echo [3/6] 测试端口占用...
echo 🔍 检查端口3001状态:
netstat -an | find ":3001" > nul
if errorlevel 1 (
    echo    ❌ 端口3001未被占用
    echo    提示: 后端服务未启动或启动失败
) else (
    echo    ✅ 端口3001被占用（可能是后端服务）
    netstat -an | find ":3001"
)

echo.
echo [4/6] 测试数据库连接...
echo 🔍 测试MySQL连接:
call npm run db:check > temp_db_check.log 2>&1
if errorlevel 1 (
    echo    ❌ 数据库连接失败
    echo    错误详情:
    type temp_db_check.log
    echo.
    echo    可能原因:
    echo    1. MySQL服务未启动
    echo    2. 连接信息错误
    echo    3. 数据库不存在
    echo    4. 用户权限不足
) else (
    echo    ✅ 数据库连接正常
)
if exist temp_db_check.log del temp_db_check.log

echo.
echo [5/6] 测试API接口...
echo 🔍 测试健康检查接口:
curl -s http://localhost:3001/health > temp_api_test.log 2>&1
if errorlevel 1 (
    echo    ❌ API接口无响应
    echo    原因: 后端服务可能未启动或启动失败
) else (
    echo    ✅ API接口正常响应
    echo    响应内容:
    type temp_api_test.log
)
if exist temp_api_test.log del temp_api_test.log

echo.
echo 🔍 测试认证接口:
curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"test\",\"password\":\"test\"}" > temp_auth_test.log 2>&1
if errorlevel 1 (
    echo    ❌ 认证接口无响应
) else (
    echo    📋 认证接口响应:
    type temp_auth_test.log
)
if exist temp_auth_test.log del temp_auth_test.log

echo.
echo [6/6] 检查日志文件...
echo 🔍 查找错误日志:
if exist "logs" (
    echo    📂 日志目录存在
    dir logs /b
) else (
    echo    📂 无日志目录
)

echo.
echo ================================
echo     诊断结果汇总
echo ================================
echo.

echo 🔧 修复建议:
echo.
echo 如果配置文件问题:
echo   -> 运行: 快速配置数据库.bat
echo.
echo 如果数据库连接问题:
echo   -> 检查MySQL服务是否启动
echo   -> 验证config\database-config.json中的连接信息
echo   -> 测试命令: mysql -u用户名 -p数据库名
echo.
echo 如果服务启动问题:
echo   -> 运行: 修复数据库迁移问题.bat
echo   -> 或手动: npm install && npm run build && npm run dev
echo.
echo 如果编译错误:
echo   -> 检查TypeScript代码
echo   -> 运行: npm run build 查看详细错误
echo.
echo 如果认证问题:
echo   -> 检查JWT密钥配置
echo   -> 确认用户数据存在
echo   -> 重新生成数据库: npm run db:reset
echo.

echo 📞 获取更多帮助:
echo   1. 查看详细日志: 观察后端服务器控制台输出
echo   2. 查看浏览器控制台: F12 -> Console 选项卡
echo   3. 检查网络请求: F12 -> Network 选项卡
echo.

pause 