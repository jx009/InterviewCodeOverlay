$headers = @{
    'Content-Type' = 'application/json'
}

$body = @{
    email = "1751940279@qq.com"
} | ConvertTo-Json

Write-Host "🧪 测试验证码发送API"
Write-Host "请求地址: http://localhost:3001/api/auth/send-verification-code"
Write-Host "邮箱: 1751940279@qq.com"
Write-Host ""

try {
    Write-Host "发送请求中..."
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/send-verification-code" -Method POST -Headers $headers -Body $body
    Write-Host "✅ 验证码发送成功!"
    Write-Host "响应消息: $($response.message)"
    if ($response.token) {
        Write-Host "验证令牌: $($response.token)"
    }
} catch {
    Write-Host "❌ 验证码发送失败"
    Write-Host "错误信息: $($_.Exception.Message)"
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP状态码: $statusCode"
        
        if ($statusCode -eq 0 -or $statusCode -eq 502 -or $statusCode -eq 503) {
            Write-Host "💡 建议: 检查后端服务是否启动"
            Write-Host "   1. 打开新的终端窗口"
            Write-Host "   2. cd backend"
            Write-Host "   3. npx ts-node --transpile-only src/server-enhanced.ts"
        }
    }
}

Write-Host ""
Write-Host "按任意键继续..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 