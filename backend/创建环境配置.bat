@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo 🔧 微信支付V2环境配置工具
echo ========================================

echo 正在创建 .env 文件...
echo.

(
echo # 微信支付V2配置
echo WECHAT_PAY_V2_APP_ID=wx04948e55b1c03277
echo WECHAT_PAY_V2_MCH_ID=1608730981
echo WECHAT_PAY_V2_API_KEY=Aa11111111122222222223333333333
echo WECHAT_PAY_V2_NOTIFY_URL=http://localhost:3001/api/payment/notify/wechat
echo WECHAT_PAY_V2_SIGN_TYPE=MD5
echo.
echo # 支付业务配置
echo PAYMENT_ORDER_EXPIRE_MINUTES=15
echo PAYMENT_MIN_AMOUNT=1
echo PAYMENT_MAX_AMOUNT=1000
echo PAYMENT_MIN_POINTS=10
echo PAYMENT_MAX_POINTS=10000
echo PAYMENT_POINTS_RATE=10
echo.
echo # 数据库配置
echo DATABASE_URL="mysql://username:password@localhost:3306/interview_coder"
echo.
echo # Redis配置
echo REDIS_HOST=localhost
echo REDIS_PORT=6379
echo REDIS_PASSWORD=
echo REDIS_DB=0
echo.
echo # 服务器配置
echo PORT=3001
echo NODE_ENV=development
echo.
echo # CORS配置
echo CORS_ORIGIN=http://localhost:3000,http://localhost:54321
echo.
echo # 速率限制配置
echo RATE_LIMIT_WINDOW_MS=900000
echo RATE_LIMIT_MAX_REQUESTS=100
) > .env

if exist .env (
    echo ✅ .env 文件创建成功！
    echo.
    echo 📋 验证配置...
    node test-wechat-pay-v2-simple.js
    echo.
    echo 🎉 环境配置完成！
    echo.
    echo 💡 接下来您可以：
    echo 1. 运行 npm start 启动后端服务
    echo 2. 访问前端页面测试充值功能
    echo 3. 如果需要修改配置，请编辑 .env 文件
) else (
    echo ❌ .env 文件创建失败！
    echo 请手动创建 .env 文件或检查权限。
)

echo.
echo 按任意键退出...
pause > nul 