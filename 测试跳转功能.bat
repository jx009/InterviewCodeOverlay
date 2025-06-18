@echo off
chcp 65001 > nul
echo =====================================
echo 测试跳转功能
echo 测试内容: 验证登录成功后的自动跳转
echo =====================================
echo.

echo 1. 启动后端服务...
start /min cmd /c "cd /d "%~dp0backend" && node server-simple.js"

echo 等待后端服务启动...
timeout /t 3 /nobreak > nul

echo 2. 启动Web前端...
start /min cmd /c "cd /d "%~dp0web" && npm run dev"

echo 等待前端服务启动...
timeout /t 5 /nobreak > nul

echo 3. 打开浏览器进行测试...
start http://localhost:5173

echo.
echo =====================================
echo 📝 测试步骤:
echo =====================================
echo 1. 页面加载后会显示登录界面
echo 2. 点击"一键填充"按钮填充预设账号
echo 3. 点击"登录"按钮
echo 4. 登录成功后应显示跳转页面:
echo    ✅ 显示"登录成功"标题
echo    ✅ 显示进度条动画
echo    ✅ 显示"立即跳转到配置中心"按钮
echo    ✅ 1.5秒后自动跳转
echo 5. 如果没有自动跳转，点击手动跳转按钮
echo 6. 最终应跳转到AI配置中心界面
echo.

echo =====================================
echo 🔧 调试信息:
echo =====================================
echo 如果遇到问题，请检查:
echo • 浏览器控制台输出
echo • 网络请求状态
echo • 认证token是否正确
echo • 服务端是否正常运行
echo.

echo 按任意键关闭服务...
pause > nul

echo 正在关闭服务...
taskkill /f /im node.exe 2>nul
taskkill /f /im cmd.exe 2>nul

echo 测试完成！
pause 