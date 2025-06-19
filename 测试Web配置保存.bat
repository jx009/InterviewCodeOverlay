@echo off
chcp 65001 >nul
echo ====================================
echo 🔧 测试Web端配置保存功能
echo ====================================
echo.

echo 📋 测试步骤：
echo 1. 启动后端服务器
echo 2. 运行API自动化测试
echo 3. 打开Web端页面进行手动测试
echo.

echo 🚀 正在启动后端服务器...
cd /d "%~dp0"
cd backend

echo 📊 启动后端服务器 (端口3001)
start "Backend Server" cmd /k "node server-simple.js"

echo ⏳ 等待服务器启动...
timeout /t 5 >nul

echo 🧪 运行API自动化测试...
node test-web-config.js

echo.
echo 🌐 打开Web端配置页面进行手动测试...
start "http://localhost:3001/web"

echo.
echo ✅ 测试环境已启动！
echo.
echo 📝 API自动化测试已完成，请查看上方结果
echo.
echo 🖱️ 现在可以进行手动测试：
echo 1. 在浏览器中登录 (用户名/密码: 123456)
echo 2. 修改"编程题模型"为不同的模型 (如GPT-4o)
echo 3. 修改"选择题模型"为不同的模型 (如Claude 3 Sonnet)
echo 4. 点击保存后刷新页面
echo 5. 检查配置是否保持不变（不再变回原来的设置）
echo.
echo 🔍 如果修复成功：
echo   - API测试应该显示"✅ 配置保存测试成功！"
echo   - Web端配置修改后刷新不会变回去
echo   - 后端日志显示"✅ 用户 X 配置已更新"
echo.
echo ❌ 如果还有问题：
echo   - API测试显示失败信息
echo   - Web端配置刷新后又变回去
echo   - 后端日志显示错误信息
echo.
pause 