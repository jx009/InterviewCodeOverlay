#!/bin/bash

# GitHub Artifacts 一键清理脚本
# 使用GitHub CLI快速清理所有artifacts

REPO="jx009/InterviewCodeOverlay"

echo "🧹 GitHub Artifacts 清理工具 (使用 GitHub CLI)"
echo "=================================================="

# 检查是否安装了gh CLI
if ! command -v gh &> /dev/null; then
    echo "❌ 错误: 需要安装GitHub CLI"
    echo ""
    echo "📦 安装方法:"
    echo "MacOS:   brew install gh"
    echo "Ubuntu:  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg"
    echo "Windows: winget install --id GitHub.cli"
    echo ""
    echo "🔗 更多信息: https://cli.github.com/"
    exit 1
fi

# 检查是否已登录
if ! gh auth status &> /dev/null; then
    echo "🔑 请先登录GitHub CLI:"
    echo "gh auth login"
    exit 1
fi

echo "🔍 获取workflow runs..."

# 获取所有workflow runs
runs=$(gh run list --repo $REPO --limit 100 --json databaseId --jq '.[].databaseId')

if [ -z "$runs" ]; then
    echo "✅ 没有找到workflow runs"
    exit 0
fi

# 计算runs数量
run_count=$(echo "$runs" | wc -l)
echo "📋 找到 $run_count 个workflow runs"

echo ""
echo "🗑️ 开始删除workflow runs (这将同时删除所有artifacts)..."
echo ""

deleted_count=0
failed_count=0

# 删除每个run
for run_id in $runs; do
    echo -n "删除 run $run_id... "
    
    if gh run delete $run_id --repo $REPO --confirm 2>/dev/null; then
        echo "✅"
        ((deleted_count++))
    else
        echo "❌"
        ((failed_count++))
    fi
    
    # 添加小延迟避免API限制
    sleep 0.2
done

echo ""
echo "🎉 清理完成!"
echo "✅ 成功删除: $deleted_count 个workflow runs"
if [ $failed_count -gt 0 ]; then
    echo "❌ 删除失败: $failed_count 个workflow runs"
fi

echo ""
echo "💾 所有artifacts已随workflow runs一起删除"
echo "⏰ 建议等待5-10分钟让GitHub更新存储配额统计"
echo "🚀 然后就可以重新运行GitHub Actions了！"