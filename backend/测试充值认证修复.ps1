#!/usr/bin/env powershell
# 测试充值认证修复

Write-Host "🧪 测试充值认证修复..." -ForegroundColor Green
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
if (!(Test-Path "test-session-token-fix.js")) {
    Write-Host "❌ 错误: 未找到test-session-token-fix.js文件" -ForegroundColor Red
    Write-Host "请确保在backend目录中运行此脚本" -ForegroundColor Yellow
    exit 1
}

# 检查服务器是否运行
Write-Host "🔍 检查服务器状态..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 5
    if ($response.status -eq "ok") {
        Write-Host "✅ 服务器正在运行" -ForegroundColor Green
    } else {
        Write-Host "❌ 服务器状态异常" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 服务器未运行或无法连接" -ForegroundColor Red
    Write-Host "请先启动服务器: .\启动server-simple.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🚀 开始运行测试..." -ForegroundColor Cyan
Write-Host ""

# 运行测试脚本
try {
    node test-session-token-fix.js
} catch {
    Write-Host "❌ 测试运行失败" -ForegroundColor Red
    Write-Host "错误信息: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 