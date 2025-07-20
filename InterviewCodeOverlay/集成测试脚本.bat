@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo    Interview Code Overlay 集成测试
echo ==========================================
echo.

echo 🔧 正在启动集成测试...
echo.

echo 📊 第一步：启动后端API服务器
echo.
cd backend
start "后端API服务器" cmd /k "node server-simple.js"
timeout /t 3 >nul

echo 📊 第二步：启动Web配置前端
echo.
cd ..\web
start "Web配置前端" cmd /k "npm run dev"
timeout /t 3 >nul

echo 📊 第三步：启动桌面客户端
echo.
cd ..
start "桌面客户端" cmd /k "npm run electron:dev"
timeout /t 3 >nul

echo.
echo ✅ 所有服务已启动！
echo.
echo 📋 测试步骤：
echo    1. 等待所有服务完全启动（约10-15秒）
echo    2. 打开桌面客户端设置（按 Ctrl+S 或点击设置按钮）
echo    3. 点击"登录Web配置中心"
echo    4. 在Web界面中注册/登录账户
echo    5. 在Web界面中选择AI模型（如 Claude Sonnet 4）
echo    6. 返回桌面客户端，尝试截图处理功能
echo    7. 验证是否使用了Web配置的AI模型
echo.
echo 🌐 Web地址：
echo    - 配置中心：http://localhost:3000
echo    - API文档：http://localhost:3001/api/health
echo.
echo 🔍 验证集成成功的标志：
echo    - 桌面客户端显示Web登录状态
echo    - 处理截图时使用Web配置的AI模型
echo    - 模型选择在Web界面生效
echo.
echo 按任意键关闭所有服务...
pause >nul

echo.
echo 🛑 正在关闭所有服务...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im electron.exe >nul 2>&1
echo ✅ 测试完成！ 