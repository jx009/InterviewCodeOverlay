@echo off
echo === Interview Coder - Fixed Authentication Edition ===
echo.
echo 🔧 认证问题修复版本！
echo.
echo IMPORTANT: This app is designed to be INVISIBLE by default!
echo Use the keyboard shortcuts to control it:
echo.
echo - Toggle Visibility: Ctrl+B (or Cmd+B on Mac)
echo - Take Screenshot: Ctrl+H
echo - Process Screenshots: Ctrl+Enter
echo - Move Window: Ctrl+Arrows (Left/Right/Up/Down)
echo - Adjust Opacity: Ctrl+[ (decrease) / Ctrl+] (increase)
echo - Reset View: Ctrl+R
echo - Quit App: Ctrl+Q
echo.
echo When you press Ctrl+B, the window will toggle between visible and invisible.
echo If movement shortcuts aren't working, try making the window visible first with Ctrl+B.
echo.

cd /D "%~dp0"

echo === Step 1: 检查并启动后端服务... ===
powershell -Command "if (!(Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet)) { Write-Host '启动后端服务...' -ForegroundColor Yellow; Start-Process cmd -ArgumentList '/c cd backend && node server-simple.js' -WindowStyle Minimized; Start-Sleep 3 } else { Write-Host '后端服务已运行' -ForegroundColor Green }"

echo === Step 2: 检查登录会话状态... ===
powershell -Command "try { $result = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/web-session-status' -Method GET; if ($result.hasActiveSession) { Write-Host '✅ 检测到已登录用户:' $result.user.username -ForegroundColor Green } else { Write-Host '⚠️ 当前未登录，应用启动后请先登录' -ForegroundColor Yellow } } catch { Write-Host '❌ 无法连接后端服务' -ForegroundColor Red }"

echo === Step 3: Creating required directories... ===
mkdir "%APPDATA%\interview-coder-v1\temp" 2>nul
mkdir "%APPDATA%\interview-coder-v1\cache" 2>nul
mkdir "%APPDATA%\interview-coder-v1\screenshots" 2>nul
mkdir "%APPDATA%\interview-coder-v1\extra_screenshots" 2>nul

echo === Step 4: 启动应用（已修复认证检测）... ===
echo 修复内容：
echo - ✅ 自动检测shared-session.json中的登录状态
echo - ✅ 改进OAuth登录后的状态同步
echo - ✅ 增强启动时认证检查
echo.
echo Remember: Press Ctrl+B to make it visible, Ctrl+[ and Ctrl+] to adjust opacity!
echo.
set NODE_ENV=production
start /B cmd /c "npx electron ./dist-electron/main.js"

echo App is now running with FIXED authentication! Press Ctrl+B to make it visible.
echo.
echo 🎯 认证修复说明：
echo 1. 应用现在会自动检测Web端的登录状态
echo 2. 如果您已在浏览器中登录，客户端会自动识别
echo 3. 如果检测到登录状态，可以直接使用搜题功能
echo 4. 如果未登录，会显示登录提示
echo.
echo If you encounter any issues:
echo 1. Make sure you've logged in via browser: http://localhost:3001/login
echo 2. Press Ctrl+B multiple times to toggle visibility  
echo 3. Check Task Manager to verify the app is running
pause 