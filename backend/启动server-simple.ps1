#!/usr/bin/env powershell
# 启动server-simple.js服务器

Write-Host "🚀 启动server-simple.js服务器..." -ForegroundColor Green
Write-Host ""

# 检查Node.js是否已安装
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: 未找到Node.js" -ForegroundColor Red
    Write-Host "请先安装Node.js: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# 检查是否在backend目录中
if (!(Test-Path "server-simple.js")) {
    Write-Host "❌ 错误: 未找到server-simple.js文件" -ForegroundColor Red
    Write-Host "请确保在backend目录中运行此脚本" -ForegroundColor Yellow
    exit 1
}

# 检查端口3001是否被占用
$portCheck = netstat -an | Select-String ":3001 "
if ($portCheck) {
    Write-Host "⚠️  警告: 端口3001已被占用" -ForegroundColor Yellow
    Write-Host "正在尝试启动服务器..." -ForegroundColor Yellow
    Write-Host ""
}

# 启动服务器
Write-Host "🔄 正在启动服务器..." -ForegroundColor Cyan
Write-Host "📋 服务器信息:" -ForegroundColor White
Write-Host "   - 端口: 3001" -ForegroundColor White  
Write-Host "   - 文件: server-simple.js" -ForegroundColor White
Write-Host "   - 地址: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "💡 提示: 按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""

# 启动Node.js服务器
try {
    node server-simple.js
} catch {
    Write-Host "❌ 服务器启动失败" -ForegroundColor Red
    Write-Host "错误信息: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 