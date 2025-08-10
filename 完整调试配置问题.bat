@echo off
chcp 65001 >nul
echo ====================================
echo 🐛 完整调试Web端配置保存问题
echo ====================================
echo.

echo 🚀 正在启动后端服务器...
cd /d "%~dp0"
cd InterviewCodeOverlay\backend

echo 📊 启动后端服务器 (端口3001)
start "Backend Server" cmd /k "node server-simple.js"

echo ⏳ 等待服务器启动...
timeout /t 5 >nul

echo 🐛 运行完整调试脚本...
node debug-config-save.js

echo.
echo 🌐 打开Web端进行手动验证...
start "http://localhost:3001/web"

echo.
echo ✅ 调试完成！
echo.
echo 📝 请查看上方的调试输出：
echo.
echo 🔍 如果调试显示：
echo   ✅ "配置保存测试成功！" - 问题已修复
echo   ❌ "配置保存测试失败！" - 需要进一步排查
echo.
echo 🖱️ 现在可以在Web端手动测试：
echo 1. 登录 (用户名/密码: 123456)
echo 2. 修改AI模型配置
echo 3. 刷新页面验证是否保持
echo.
pause 