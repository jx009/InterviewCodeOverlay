@echo off
echo 🔧 配置同步调试脚本
echo.
echo 📋 此脚本用于调试配置读取和更新问题
echo.

echo ============================================
echo 1. 检查后端配置API
echo ============================================
echo 正在检查后端配置API...
curl -s -H "Content-Type: application/json" http://localhost:3001/api/config | python -m json.tool 2>nul || (
    echo ❌ 后端配置API无响应或格式错误
    echo 请确保：
    echo   - 后端服务正在运行
    echo   - 端口3001可访问
    echo   - 已经登录认证
)

echo.
echo ============================================
echo 2. 检查共享会话文件
echo ============================================
if exist "shared-session.json" (
    echo ✅ 找到共享会话文件
    echo 内容预览：
    type shared-session.json | head -10
) else (
    echo ❌ 未找到shared-session.json文件
    echo 这可能导致配置读取问题
)

echo.
echo ============================================
echo 3. 配置缓存调试提示
echo ============================================
echo 📝 配置缓存机制说明：
echo   - 客户端有5分钟配置缓存
echo   - Web端更改配置后，客户端可能不会立即生效
echo   - 强制刷新方法：
echo     1. 重启客户端
echo     2. 使用 Ctrl+Shift+C 快捷键刷新
echo     3. 等待缓存自动过期（5分钟）

echo.
echo ============================================
echo 4. 问题排查步骤
echo ============================================
echo 🔍 如果配置不生效，请按以下步骤调试：
echo.
echo 步骤1：在Web端更改配置并保存
echo 步骤2：检查后端是否保存成功
echo   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/config
echo.
echo 步骤3：在客户端使用 Ctrl+Shift+C 强制刷新
echo 步骤4：查看客户端控制台日志，确认：
echo   - "🔄 强制刷新用户配置以获取最新设置..."
echo   - "📥 后端返回的原始配置数据:"
echo   - "✅ 用户配置构建成功:"

echo.
echo ============================================
echo 5. 预期日志输出
echo ============================================
echo 正常的配置刷新应该看到以下日志：
echo.
echo 🔄 强制刷新用户配置以获取最新设置...
echo 📋 配置缓存状态检查:
echo   - 强制刷新: true
echo   - 缓存年龄: XXX秒
echo   - 缓存有效: false
echo   - 当前有配置: true
echo 📋 正在从后端获取用户配置...
echo 📥 后端返回的原始配置数据: {...}
echo ✅ 用户配置构建成功:
echo   - multipleChoiceModel: chatgpt-4o-latest

echo.
pause 