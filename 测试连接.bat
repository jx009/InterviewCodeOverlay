@echo off
chcp 65001 > nul
echo.
echo 🔍 测试Web服务连接
echo.

echo 检查端口占用情况：
netstat -ano | findstr :3001
echo.

echo 测试HTTP连接：
curl -v http://localhost:3001/api/health
echo.

echo 测试完成！
pause 