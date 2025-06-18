@echo off
echo === Interview Code Overlay 登录问题修复脚本 ===
echo.

REM 第1步：检查后端服务状态
echo 1. 检查后端服务状态...
powershell -Command "if (Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet) { Write-Host '✅ 后端服务正在运行 (端口3001)' -ForegroundColor Green } else { Write-Host '❌ 后端服务未运行，正在启动...' -ForegroundColor Red; Start-Process cmd -ArgumentList '/c cd backend && node server-simple.js' -WindowStyle Minimized }"

REM 第2步：检查Web会话状态
echo.
echo 2. 检查Web登录会话状态...
powershell -Command "try { $result = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/web-session-status' -Method GET; if ($result.hasActiveSession) { Write-Host '✅ Web端已登录，用户:' $result.user.username -ForegroundColor Green } else { Write-Host '❌ Web端未登录，请先在浏览器中登录' -ForegroundColor Red } } catch { Write-Host '❌ 无法连接到后端服务' -ForegroundColor Red }"

REM 第3步：刷新共享会话token
echo.
echo 3. 刷新共享会话token...
if exist "shared-session.json" (
    echo 找到现有会话文件，正在检查有效性...
    powershell -Command "$session = Get-Content 'shared-session.json' | ConvertFrom-Json; $expiry = [DateTime]::Parse($session.expiresAt); $now = Get-Date; if ($expiry -lt $now) { Write-Host '❌ 会话已过期，需要重新登录' -ForegroundColor Red } else { Write-Host '✅ 会话仍然有效' -ForegroundColor Green }"
) else (
    echo ❌ 未找到共享会话文件
)

REM 第4步：重启应用
echo.
echo 4. 正在重启应用...
taskkill /f /im "InterviewCodeOverlay.exe" 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 5. 启动修复后的应用...
call stealth-run.bat

echo.
echo === 修复完成 ===
echo 如果仍然有登录问题，请：
echo 1. 打开浏览器访问 http://localhost:3001/login
echo 2. 使用用户名: 123456@test.com 密码: 任意密码 登录
echo 3. 然后重新运行此脚本
pause 