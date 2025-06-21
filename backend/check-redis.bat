@echo off
chcp 65001 > nul
title Redis 服务检查和启动

echo.
echo =====================================
echo  🔌 Redis 服务检查和启动
echo =====================================
echo.

echo 🔍 检查Redis服务...
powershell -Command "try { $client = New-Object System.Net.Sockets.TcpClient; $client.Connect('localhost', 6379); $client.Close(); Write-Host '✅ Redis服务正在运行'; exit 0 } catch { Write-Host '❌ Redis服务未启动'; exit 1 }"

if errorlevel 1 (
    echo.
    echo 🚀 尝试启动Redis服务...
    
    REM 检查是否安装了Redis
    where redis-server >nul 2>&1
    if errorlevel 1 (
        echo ⚠️ Redis未安装或不在PATH中
        echo.
        echo 📥 安装Redis的方法：
        echo 1. 使用Chocolatey（推荐）:
        echo    choco install redis-64
        echo.
        echo 2. 手动下载安装:
        echo    访问: https://redis.io/download
        echo    下载Windows版本并安装
        echo.
        echo 3. 使用Docker（如果已安装）:
        echo    docker run -d -p 6379:6379 redis
        echo.
        pause
        exit /b 1
    )
    
    echo ✅ 找到Redis，正在启动...
    start "Redis Server" redis-server
    
    echo 等待Redis启动...
    timeout /t 3 /nobreak > nul
    
    echo 🔍 再次检查Redis服务...
    powershell -Command "try { $client = New-Object System.Net.Sockets.TcpClient; $client.Connect('localhost', 6379); $client.Close(); Write-Host '✅ Redis服务启动成功' } catch { Write-Host '❌ Redis服务启动失败' }"
) else (
    echo Redis服务已在运行
)

echo.
echo 📋 Redis状态检查完成
pause 