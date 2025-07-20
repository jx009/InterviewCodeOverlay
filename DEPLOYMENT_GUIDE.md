# GitHub Actions 自动打包部署指南

## 当前状态
✅ GitHub Actions 工作流已配置完成
✅ 图标已更新为 logo_qz 文件
✅ 所有代码已提交到本地 git
✅ 版本标签 v1.0.19 已创建

## 立即执行以下命令：

### 1. 设置认证（已包含token）
```bash
cd /mnt/c/jxProject/InterviewCodeOverlay1111/InterviewCodeOverlay
git remote set-url origin https://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@github.com/jx009/InterviewCodeOverlay.git
```

### 2. 推送代码
```bash
# 推送分支
git push origin test1

# 推送标签（这会触发自动构建）
git push origin v1.0.19
```

### 3. 如果网络问题，尝试：
```bash
# 设置代理（如果有）
git config --global http.proxy http://proxy.company.com:8080

# 或者使用 SSH（需要配置 SSH key）
git remote set-url origin git@github.com:jx009/InterviewCodeOverlay.git
```

## 构建监控

### 查看构建状态：
- GitHub Actions: https://github.com/jx009/InterviewCodeOverlay/actions
- 工作流名称: "Build and Release"

### 构建完成后下载：
- Release页面: https://github.com/jx009/InterviewCodeOverlay/releases/tag/v1.0.19
- 文件包含:
  - `Interview-Coder-Windows-1.0.19.exe` (Windows安装包)
  - `Interview-Coder-x64.dmg` (macOS安装包)
  - `Interview-Coder-arm64.dmg` (macOS Apple Silicon)

## 构建配置详情

GitHub Actions 会自动：
1. 在 Windows 和 macOS 环境下并行构建
2. 安装 Node.js 20 和项目依赖
3. 执行 `npm run build` 构建应用
4. 执行 `npm run package-win` 和 `npm run package-mac` 打包
5. 上传构建产物到 GitHub Release
6. 跳过代码签名（设置了 CSC_IDENTITY_AUTO_DISCOVERY=false）

## 故障排除

如果构建失败，检查：
1. GitHub Actions 日志中的错误信息
2. package.json 中的依赖版本
3. Node.js 版本兼容性（已设置为 20）

## 手动触发构建
如果需要重新构建，可以：
1. 访问 Actions 页面
2. 选择 "Build and Release" 工作流
3. 点击 "Run workflow" 手动触发