@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo    登录注册功能测试
echo ==========================================
echo.

echo 🚀 正在启动登录功能测试...
echo.

echo 📊 第一步：启动后端API服务器
echo.
cd backend
start "后端API服务器" cmd /k "node server-simple.js"
timeout /t 3 >nul

echo 📊 第二步：启动Web登录前端
echo.
cd ..\web
start "Web登录前端" cmd /k "npm run dev"
timeout /t 5 >nul

echo.
echo ✅ 所有服务已启动！
echo.
echo 📋 登录注册测试指南：
echo.
echo 🔐 预设账号快速测试：
echo    用户名: 123456
echo    密码: 123456
echo    点击"一键填充"可自动填写
echo.
echo 🔧 功能验证项目：
echo    ✅ 1. 表单验证
echo       - 空字段验证
echo       - 邮箱格式验证
echo       - 密码长度验证
echo    
echo    ✅ 2. 登录功能
echo       - 使用预设账号登录
echo       - 错误密码提示
echo       - 成功登录跳转
echo    
echo    ✅ 3. 注册功能
echo       - 新用户注册
echo       - 重复用户提示
echo       - 注册成功跳转
echo    
echo    ✅ 4. 界面交互
echo       - 登录/注册切换
echo       - 加载状态显示
echo       - 错误/成功提示
echo       - 表单验证反馈
echo.
echo 🌐 测试地址：
echo    - Web登录界面：http://localhost:3000
echo    - API健康检查：http://localhost:3001/api/health
echo.
echo 🔍 验证登录成功的标志：
echo    - 显示"登录成功！正在跳转..."
echo    - 自动切换到配置面板界面
echo    - 能看到AI模型选择界面
echo.
echo 🧪 测试步骤建议：
echo    1. 访问 http://localhost:3000
echo    2. 尝试空表单提交（验证表单验证）
echo    3. 使用预设账号登录（验证登录功能）
echo    4. 切换到注册模式（验证注册功能）
echo    5. 使用已存在邮箱注册（验证错误提示）
echo    6. 使用新邮箱注册（验证注册成功）
echo.
echo 按任意键关闭所有服务...
pause >nul

echo.
echo 🛑 正在关闭所有服务...
taskkill /f /im node.exe >nul 2>&1
echo ✅ 测试完成！ 