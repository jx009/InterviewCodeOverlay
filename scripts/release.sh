#!/bin/bash

# Interview Coder - 快速发布脚本
# 用于创建新版本并触发GitHub Actions构建

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数定义
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查是否在正确的目录
if [[ ! -f "package.json" ]]; then
    log_error "错误：请在项目根目录下运行此脚本"
    exit 1
fi

# 检查git状态
if [[ -n $(git status --porcelain) ]]; then
    log_warning "工作目录有未提交的更改"
    echo "未提交的文件："
    git status --short
    echo ""
    read -p "是否继续发布？(y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "发布已取消"
        exit 0
    fi
fi

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
log_info "当前版本: v$CURRENT_VERSION"

# 获取版本类型
echo ""
echo "选择版本更新类型："
echo "1) patch  (修复bug): v$CURRENT_VERSION -> v$(npm version patch --dry-run | cut -d'v' -f2)"
echo "2) minor  (新功能): v$CURRENT_VERSION -> v$(npm version minor --dry-run | cut -d'v' -f2)"
echo "3) major  (重大更新): v$CURRENT_VERSION -> v$(npm version major --dry-run | cut -d'v' -f2)"
echo "4) 自定义版本号"
echo "5) 仅构建当前版本（不更新版本号）"
echo ""

read -p "请选择 (1-5): " -n 1 -r
echo ""

case $REPLY in
    1)
        VERSION_TYPE="patch"
        ;;
    2)
        VERSION_TYPE="minor"
        ;;
    3)
        VERSION_TYPE="major"
        ;;
    4)
        read -p "请输入版本号 (例如: 1.2.3): " CUSTOM_VERSION
        if [[ ! $CUSTOM_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            log_error "版本号格式错误"
            exit 1
        fi
        VERSION_TYPE="--new-version $CUSTOM_VERSION"
        ;;
    5)
        log_info "仅构建当前版本 v$CURRENT_VERSION"
        VERSION_TYPE=""
        ;;
    *)
        log_error "无效选择"
        exit 1
        ;;
esac

# 更新版本号（如果需要）
if [[ -n $VERSION_TYPE ]]; then
    log_info "正在更新版本号..."
    if [[ $VERSION_TYPE == *"--new-version"* ]]; then
        NEW_VERSION=$(npm version $CUSTOM_VERSION --no-git-tag-version)
    else
        NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
    fi
    NEW_VERSION=${NEW_VERSION#v}  # 移除v前缀
    log_success "版本已更新到 v$NEW_VERSION"
else
    NEW_VERSION=$CURRENT_VERSION
fi

# 生成更新日志
echo ""
read -p "是否添加发布说明？(y/N): " -n 1 -r
echo ""
RELEASE_NOTES=""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "请输入发布说明（支持Markdown格式，按Ctrl+D结束）："
    RELEASE_NOTES=$(cat)
fi

# 确认发布
echo ""
log_info "=== 发布确认 ==="
echo "版本: v$NEW_VERSION"
echo "标签: v$NEW_VERSION"
if [[ -n $RELEASE_NOTES ]]; then
    echo "发布说明: 已添加"
else
    echo "发布说明: 无"
fi
echo ""

read -p "确认发布？(y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "发布已取消"
    exit 0
fi

# 提交更改（如果有版本更新）
if [[ $NEW_VERSION != $CURRENT_VERSION ]]; then
    log_info "提交版本更新..."
    git add package.json package-lock.json
    git commit -m "chore: bump version to v$NEW_VERSION"
fi

# 创建标签
log_info "创建标签 v$NEW_VERSION..."
if [[ -n $RELEASE_NOTES ]]; then
    git tag -a "v$NEW_VERSION" -m "$RELEASE_NOTES"
else
    git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
fi

# 推送到远程
log_info "推送到远程仓库..."
git push origin main
git push origin "v$NEW_VERSION"

log_success "🎉 发布完成！"
echo ""
log_info "GitHub Actions将自动开始构建："
echo "   📦 Windows安装包"
echo "   📦 macOS安装包"
echo ""
log_info "查看构建进度: https://github.com/$(git config remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"
echo ""
log_info "构建完成后，GitHub Release将自动创建并包含下载链接"