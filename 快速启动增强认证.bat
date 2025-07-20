@echo off
chcp 65001 > nul
title 快速启动增强认证服务

echo.
echo =====================================
echo  快速启动增强认证服务
echo =====================================
echo.

echo 停止现有Node.js进程...
taskkill /f /im node.exe >nul 2>&1

echo 检查Redis服务...
powershell -Command "try { $client = New-Object System.Net.Sockets.TcpClient; $client.Connect('localhost', 6379); $client.Close(); Write-Host 'Redis服务正常' } catch { Write-Host 'Redis服务未启动，但会尝试继续启动' }"

echo 检查SMTP配置...
cd /d "%~dp0backend"
if exist ".env" (
    findstr /c:"SMTP_HOST=" ".env" >nul
    if errorlevel 1 (
        echo SMTP未配置，验证码功能将无法使用
    ) else (
        echo SMTP配置存在
    )
) else (
    echo .env文件不存在，复制示例文件...
    copy env.example .env >nul 2>&1
)

echo.
echo 启动增强认证服务...
start "增强认证服务" cmd /k "cd /d %~dp0backend && echo 启动增强认证服务... && echo 端口: 3001 && echo 支持邮箱验证码 && npx ts-node src/server-enhanced.ts"

echo 等待服务启动...
timeout /t 8 /nobreak > nul

echo.
echo 检查后端服务状态...
for /l %%i in (1,1,5) do (
    powershell -Command "try { $response = Invoke-RestMethod http://localhost:3001/api/health; Write-Host '后端服务运行正常 - 状态:' $response.status } catch { Write-Host '尝试 %%i/5 - 后端服务启动中...' }"
    timeout /t 2 /nobreak > nul
)

echo.
echo 启动Web前端...
cd /d "%~dp0web"
if not exist "node_modules" (
    echo 安装Web前端依赖...
    npm install
)
start "Web前端" cmd /k "cd /d %~dp0web && echo 启动Web前端... && echo 端口: 3000 && npm run dev"

echo 等待Web服务启动...
timeout /t 5 /nobreak > nul

echo.
echo 打开Web界面...
timeout /t 3 /nobreak > nul
start http://localhost:3000

echo.
echo =====================================
echo  启动完成！
echo =====================================
echo.
echo 运行的服务:
echo - 后端API服务: http://localhost:3001
echo - 健康检查: http://localhost:3001/api/health
echo - Web配置界面: http://localhost:3000
echo.
echo 增强认证功能:
echo - 邮箱验证码注册
echo - Redis会话管理
echo - SMTP邮件服务
echo - 传统登录兼容
echo.
echo 按任意键关闭此窗口...
pause > nul 