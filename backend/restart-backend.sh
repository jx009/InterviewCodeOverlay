#!/bin/bash

echo "🔄 重启后端服务..."

# 查找并杀死现有的node进程（充值相关）
echo "📋 查找现有进程..."
ps aux | grep "node.*server" | grep -v grep

echo "🛑 停止现有进程..."
pkill -f "node.*server" || echo "没有找到运行的服务"

# 等待进程完全停止
sleep 2

echo "🚀 启动新的后端服务..."
cd "$(dirname "$0")"

# 检查是否有package.json
if [ -f "package.json" ]; then
    echo "✅ 找到package.json，使用npm启动..."
    npm start &
    echo "🎯 后端服务已在后台启动"
elif [ -f "src/server.js" ]; then
    echo "✅ 找到server.js，直接启动..."
    node src/server.js &
    echo "🎯 后端服务已在后台启动"
elif [ -f "src/server.ts" ]; then
    echo "✅ 找到server.ts，使用ts-node启动..."
    npx ts-node src/server.ts &
    echo "🎯 后端服务已在后台启动"
else
    echo "❌ 未找到启动文件"
    exit 1
fi

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 测试服务是否正常启动
echo "🧪 测试API响应..."
curl -s https://quiz.playoffer.cn/api/recharge/packages | head -c 100
echo ""
echo "✅ 重启完成！"