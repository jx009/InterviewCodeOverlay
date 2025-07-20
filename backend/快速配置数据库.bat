@echo off
chcp 65001 > nul
echo ================================
echo     数据库快速配置向导
echo ================================
echo.

:: 检查配置文件是否存在
if exist "config\database-config.json" (
    echo ⚠️ 发现现有配置文件 config\database-config.json
    set /p overwrite="是否覆盖现有配置？(y/N): "
    if /i not "%overwrite%"=="y" (
        echo 取消配置，退出...
        pause
        exit /b 0
    )
)

:: 创建config目录
if not exist "config" mkdir config

echo.
echo [1/6] MySQL数据库配置
echo ================================
set /p mysql_host="MySQL服务器地址 (默认: localhost): "
if "%mysql_host%"=="" set mysql_host=localhost

set /p mysql_port="MySQL端口 (默认: 3306): "
if "%mysql_port%"=="" set mysql_port=3306

set /p mysql_username="MySQL用户名 (默认: root): "
if "%mysql_username%"=="" set mysql_username=root

set /p mysql_password="MySQL密码: "
if "%mysql_password%"=="" (
    echo ❌ MySQL密码不能为空
    pause
    exit /b 1
)

set /p mysql_database="数据库名称 (默认: interview_coder): "
if "%mysql_database%"=="" set mysql_database=interview_coder

echo.
echo [2/6] Redis配置
echo ================================
set /p redis_host="Redis服务器地址 (默认: localhost): "
if "%redis_host%"=="" set redis_host=localhost

set /p redis_port="Redis端口 (默认: 6379): "
if "%redis_port%"=="" set redis_port=6379

set /p redis_password="Redis密码 (默认: 无密码，直接回车): "

echo.
echo [3/6] 邮件服务配置
echo ================================
echo 选择邮件服务提供商：
echo 1. Gmail
echo 2. QQ邮箱
echo 3. 163邮箱
echo 4. 自定义
set /p email_provider="请选择 (1-4): "

if "%email_provider%"=="1" (
    set smtp_host=smtp.gmail.com
    set smtp_port=587
    set smtp_secure=false
) else if "%email_provider%"=="2" (
    set smtp_host=smtp.qq.com
    set smtp_port=587
    set smtp_secure=false
) else if "%email_provider%"=="3" (
    set smtp_host=smtp.163.com
    set smtp_port=465
    set smtp_secure=true
) else (
    set /p smtp_host="SMTP服务器地址: "
    set /p smtp_port="SMTP端口: "
    set /p smtp_secure="是否使用SSL (true/false): "
)

set /p email_user="邮箱地址: "
set /p email_pass="邮箱密码/应用密码: "

echo.
echo [4/6] 安全配置
echo ================================
echo 正在生成随机密钥...

:: 生成随机JWT密钥（简化版）
set jwt_secret=interview_coder_jwt_%RANDOM%%RANDOM%%RANDOM%
set jwt_refresh_secret=interview_coder_refresh_%RANDOM%%RANDOM%%RANDOM%

echo ✅ JWT密钥已生成

echo.
echo [5/6] 应用配置
echo ================================
set /p app_name="应用名称 (默认: 面试代码助手): "
if "%app_name%"=="" set app_name=面试代码助手

set /p app_env="运行环境 (development/production，默认: development): "
if "%app_env%"=="" set app_env=development

echo.
echo [6/6] 生成配置文件
echo ================================

:: 创建配置文件内容
(
echo {
echo   "mysql": {
echo     "host": "%mysql_host%",
echo     "port": %mysql_port%,
echo     "username": "%mysql_username%",
echo     "password": "%mysql_password%",
echo     "database": "%mysql_database%",
echo     "charset": "utf8mb4",
echo     "collation": "utf8mb4_unicode_ci",
echo     "timezone": "+08:00",
echo     "connectionLimit": 10,
echo     "acquireTimeout": 60000,
echo     "timeout": 60000,
echo     "reconnect": true,
echo     "ssl": false
echo   },
echo   "redis": {
echo     "host": "%redis_host%",
echo     "port": %redis_port%,
echo     "password": "%redis_password%",
echo     "database": 0,
echo     "keyPrefix": "interview_coder:",
echo     "retryDelayOnFailover": 100,
echo     "maxRetriesPerRequest": 3,
echo     "lazyConnect": true,
echo     "keepAlive": 30000
echo   },
echo   "session": {
echo     "secret": "%jwt_secret%",
echo     "expiresIn": 3600,
echo     "refreshExpiresIn": 604800,
echo     "cookieName": "interview_session",
echo     "secure": false,
echo     "httpOnly": true,
echo     "sameSite": "lax"
echo   },
echo   "email": {
echo     "smtp": {
echo       "host": "%smtp_host%",
echo       "port": %smtp_port%,
echo       "secure": %smtp_secure%,
echo       "auth": {
echo         "user": "%email_user%",
echo         "pass": "%email_pass%"
echo       }
echo     },
echo     "from": "%email_user%",
echo     "verification": {
echo       "codeLength": 6,
echo       "expiresMinutes": 5,
echo       "template": "default"
echo     }
echo   },
echo   "security": {
echo     "bcryptRounds": 12,
echo     "jwtSecret": "%jwt_secret%",
echo     "jwtRefreshSecret": "%jwt_refresh_secret%",
echo     "passwordMinLength": 6,
echo     "maxLoginAttempts": 5,
echo     "lockoutDuration": 900
echo   },
echo   "app": {
echo     "name": "%app_name%",
echo     "version": "1.0.0",
echo     "environment": "%app_env%",
echo     "debug": true,
echo     "logLevel": "info"
echo   }
echo }
) > config\database-config.json

echo ✅ 配置文件已生成: config\database-config.json

echo.
echo ================================
echo     🎉 配置完成！
echo ================================
echo.
echo 接下来的步骤：
echo 1. 确保MySQL服务器正在运行
echo 2. 确保Redis服务器正在运行 (可选)
echo 3. 运行: npm run db:init (初始化数据库)
echo 4. 运行: npm run generate (生成Prisma客户端)
echo 5. 运行: npm run migrate (创建数据表)
echo 6. 运行: npm run dev (启动开发服务器)
echo.
echo 或者运行一键安装: npm run db:setup
echo.

pause 