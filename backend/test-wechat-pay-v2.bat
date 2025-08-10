@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo 🧪 微信支付V2测试工具
echo ========================

echo 正在检查环境...
if not exist "node_modules" (
    echo 📦 安装依赖...
    call npm install
)

echo 🚀 启动微信支付V2测试...
echo.

node test-wechat-pay-v2.js

echo.
echo 测试完成！按任意键退出...
pause > nul 