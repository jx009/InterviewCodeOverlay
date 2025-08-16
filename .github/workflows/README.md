# GitHub Actions 构建说明

本项目提供了三个 GitHub Actions 工作流来构建跨平台的 Electron 应用：

## 🚀 工作流说明

### 1. `build-mac-only.yml` - 快速 macOS 构建
**推荐用于快速测试 Mac 版本**

- **触发方式**: 手动触发
- **构建平台**: 仅 macOS
- **支持架构**: Intel (x64) 和 Apple Silicon (arm64)
- **构建时间**: ~10-15分钟

**使用步骤:**
1. 进入 GitHub 仓库的 Actions 页面
2. 选择 "Build macOS Only" 工作流
3. 点击 "Run workflow"
4. 选择目标架构 (both/x64/arm64)
5. 点击 "Run workflow" 开始构建

### 2. `build-cross-platform.yml` - 完整跨平台构建
**用于正式发布**

- **触发方式**: 手动触发 或 推送 tag
- **构建平台**: macOS, Windows, Linux
- **支持功能**: 自动创建 GitHub Release
- **构建时间**: ~20-30分钟

**使用步骤:**
```bash
# 方式1: 推送 tag 自动触发
git tag v1.0.0
git push origin v1.0.0

# 方式2: 手动触发
# 在 GitHub Actions 页面手动运行
```

### 3. `build-release.yml` - 发布版本构建
**备用发布流程**

- **触发方式**: 手动触发 或 推送 tag
- **构建平台**: macOS, Windows, Linux
- **支持功能**: 自动创建详细的 GitHub Release

## 📋 使用 macOS 构建的详细步骤

### 步骤 1: 提交代码到 GitHub
```bash
# 确保代码已提交并推送到 GitHub
git add .
git commit -m "准备构建 Mac 版本"
git push origin main
```

### 步骤 2: 运行 GitHub Actions
1. 打开你的 GitHub 仓库
2. 点击 "Actions" 标签
3. 选择 "Build macOS Only" 工作流
4. 点击 "Run workflow" 按钮
5. 选择构建架构:
   - `both`: 同时构建 Intel 和 Apple Silicon 版本
   - `x64`: 仅构建 Intel Mac 版本
   - `arm64`: 仅构建 Apple Silicon Mac 版本
6. 点击绿色的 "Run workflow" 按钮

### 步骤 3: 等待构建完成
- 构建过程大约需要 10-15 分钟
- 可以在 Actions 页面实时查看构建进度
- 构建完成后会显示绿色的 ✅ 标记

### 步骤 4: 下载构建文件
1. 构建完成后，在工作流页面向下滚动
2. 找到 "Artifacts" 部分
3. 点击下载 `macos-builds-*` 文件
4. 解压下载的 ZIP 文件，里面包含:
   - `.dmg` 文件 (推荐): 双击安装
   - `.zip` 文件: 解压后拖拽到 Applications

## 🔧 构建产物说明

### macOS 版本
- **Intel Mac**: `Interview-Coder-x64.dmg`
- **Apple Silicon Mac**: `Interview-Coder-arm64.dmg`

### Windows 版本
- **安装包**: `Interview-Coder-Windows.exe`

### Linux 版本
- **AppImage**: `Interview-Coder-Linux.AppImage`

## ⚠️ 注意事项

1. **首次运行可能需要权限**
   - macOS: 系统偏好设置 > 安全性与隐私 > 允许运行
   - Windows: Windows Defender 可能会警告，选择"仍要运行"

2. **构建失败排查**
   - 检查 package.json 中的依赖是否正确
   - 确保所有必要的图标文件存在
   - 查看 Actions 日志中的具体错误信息

3. **代码签名**
   - 当前构建的应用没有代码签名
   - 如需代码签名，需要在 GitHub Secrets 中配置证书

## 🆘 常见问题

**Q: 如何知道应该下载哪个版本？**
A: 
- Intel Mac (2020年之前): 下载 x64 版本
- Apple Silicon Mac (M1/M2/M3): 下载 arm64 版本
- 不确定的话选择 `both`，两个版本都会构建

**Q: 构建失败怎么办？**
A: 
1. 点击失败的工作流查看日志
2. 检查是否有依赖问题或代码错误
3. 修复后重新推送代码并再次运行工作流

**Q: 可以自定义应用图标吗？**
A: 可以，修改以下文件：
- macOS: `assets/icons/mac/logo_qz.icns`
- Windows: `assets/icons/win/logo_qz.ico`
- Linux: `assets/icons/png/icon-256x256.png`