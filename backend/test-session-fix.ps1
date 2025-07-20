Write-Host "🔧 测试session_status端点修复" -ForegroundColor Green
Write-Host ""

Write-Host "📝 修复说明：" -ForegroundColor Yellow
Write-Host "1. 修复了session_status端点中的SessionManager导入问题"
Write-Host "2. 使用正确的redis-simple.ts导入路径"
Write-Host "3. 修复了JWT secret的获取方式"
Write-Host ""

Write-Host "🚀 启动后端服务..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$PSScriptRoot`" && npm run start:enhanced" -WindowStyle Minimized

Write-Host "⏳ 等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🔍 测试session_status端点..." -ForegroundColor Green
node test-session-status.js

Write-Host ""
Write-Host "📋 测试完成！" -ForegroundColor Green
Write-Host "🌐 请在浏览器中访问充值页面验证修复效果" -ForegroundColor Cyan
Write-Host "💡 如果仍有问题，请检查Redis服务是否正在运行" -ForegroundColor Yellow
Write-Host ""
pause 