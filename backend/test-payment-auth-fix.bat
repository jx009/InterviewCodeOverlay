@echo off
chcp 65001 > nul
echo 🔧 支付API认证修复测试
echo.

echo 📝 修复说明：
echo 1. 修复了支付API的认证逻辑，现在使用和client-credits.ts相同的认证方式
echo 2. 支持JWT token和sessionId两种认证方式
echo 3. 修复了数据库表名和字段名问题
echo 4. 确保前端token获取逻辑正常工作
echo.

echo 🚀 启动后端服务...
cd /d %~dp0
start "后端服务" cmd /k "npm run start:enhanced"

echo ⏳ 等待服务启动...
timeout /t 5 /nobreak > nul

echo 🔍 测试支付API认证修复...
node test-payment-fix.js

echo.
echo 📋 测试完成！
echo 🌐 请在浏览器中访问充值页面验证修复效果
echo.
pause 