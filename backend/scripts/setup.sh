#!/bin/bash

echo "🚀 设置 Interview Coder 后端服务..."

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js 18+ 版本"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 18+ 版本，当前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $(node -v)"

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚙️ 创建环境变量文件..."
    cp env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
else
    echo "✅ 环境变量文件已存在"
fi

# 生成 Prisma 客户端
echo "🗄️ 生成 Prisma 客户端..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Prisma 客户端生成失败"
    exit 1
fi

echo "✅ Prisma 客户端生成完成"

# 检查数据库连接并运行迁移（如果数据库已配置）
if grep -q "DATABASE_URL.*postgresql://" .env; then
    echo "🗄️ 运行数据库迁移..."
    npx prisma migrate dev --name init
    
    if [ $? -eq 0 ]; then
        echo "✅ 数据库迁移完成"
        
        echo "🌱 运行种子数据..."
        npm run seed 2>/dev/null || echo "⚠️ 种子数据运行失败，请手动运行: npm run seed"
    else
        echo "⚠️ 数据库迁移失败，请检查数据库连接配置"
    fi
else
    echo "⚠️ 未检测到有效的数据库配置，请在 .env 文件中配置 DATABASE_URL"
fi

echo ""
echo "🎉 后端服务设置完成！"
echo ""
echo "📋 下一步操作："
echo "   1. 配置 .env 文件中的数据库连接和其他设置"
echo "   2. 运行数据库迁移：npm run migrate"
echo "   3. 启动开发服务器：npm run dev"
echo ""
echo "🔗 有用的命令："
echo "   - npm run dev     # 启动开发服务器"
echo "   - npm run build   # 构建生产版本"
echo "   - npm run studio  # 打开 Prisma Studio"
echo "   - npm run seed    # 运行种子数据"
echo "" 