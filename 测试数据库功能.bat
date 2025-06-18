@echo off
chcp 65001 > nul
echo =====================================
echo 测试数据库持久化功能
echo =====================================
echo.

echo 1. 启动后端服务（带数据库）...
cd /d "%~dp0backend"
start /min cmd /c "node server-simple.js"

echo 等待后端服务启动...
timeout /t 5 /nobreak > nul

echo.
echo 2. 测试API连接...
curl -X GET http://localhost:3001/api/health
echo.

echo 3. 测试用户注册...
curl -X POST http://localhost:3001/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"testpass\"}"
echo.

echo 4. 测试用户登录...
curl -X POST http://localhost:3001/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser\",\"password\":\"testpass\"}"
echo.

echo 5. 检查数据库文件是否创建...
if exist "interview_overlay.db" (
    echo ✅ 数据库文件已创建
    dir interview_overlay.db
) else (
    echo ❌ 数据库文件未创建
)

echo.
echo 6. 启动Web前端进行综合测试...
cd /d "%~dp0web"
start /min cmd /c "npm run dev"

echo 等待前端服务启动...
timeout /t 3 /nobreak > nul

echo 7. 打开浏览器进行测试...
start http://localhost:5173

echo.
echo =====================================
echo 📝 测试说明:
echo =====================================
echo 1. 后端服务启动后会自动创建SQLite数据库
echo 2. 自动创建默认测试用户: 123456/123456
echo 3. 用户数据和配置都会持久化存储
echo 4. 重启服务后数据不会丢失
echo 5. Web配置更改会实时同步到桌面客户端
echo.

echo =====================================
echo 🧪 手动测试步骤:
echo =====================================
echo 1. 在Web界面登录 (123456/123456)
echo 2. 修改AI模型配置
echo 3. 重启后端服务
echo 4. 再次登录，检查配置是否保留
echo 5. 启动桌面客户端，验证配置同步
echo.

echo 按任意键关闭所有服务...
pause > nul

echo 正在关闭服务...
taskkill /f /im node.exe 2>nul
taskkill /f /im cmd.exe 2>nul

echo 测试完成！
pause 