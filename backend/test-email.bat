@echo off
echo ===================================
echo 邮件服务测试工具
echo ===================================

echo 正在检查环境文件...
if not exist .env (
    echo 未找到.env文件，将复制env.example作为模板
    copy env.example .env
    echo 已创建.env文件，请编辑配置SMTP信息后重新运行此脚本
    pause
    exit /b
)

echo 正在启动邮件测试工具...
node test-email-service.js

pause 