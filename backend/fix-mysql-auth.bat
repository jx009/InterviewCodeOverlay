@echo off
chcp 65001 > nul
echo.
echo ========================================
echo    MySQL 认证插件修复工具
echo ========================================
echo.

cd /d "%~dp0"

echo 🔧 正在修复 MySQL 认证插件问题...
echo.

node fix-mysql-auth.js fix

echo.
echo ========================================
echo 修复完成！现在测试数据库连接...
echo ========================================
echo.

timeout /t 2 /nobreak > nul

node fix-mysql-auth.js test

echo.
echo ========================================
echo 如果连接测试成功，现在可以重新启动应用程序
echo ========================================
echo.
pause 