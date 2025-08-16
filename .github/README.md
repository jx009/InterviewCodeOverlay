# GitHub Actions 自动构建指南

本项目提供了三个 GitHub Actions 工作流来自动构建应用程序：

## 工作流说明

### 1. `build-mac.yml` - macOS 基础构建
- 仅构建 macOS 版本（未签名）
- 适用于测试和开发

### 2. `build-multiplatform.yml` - 多平台构建
- 同时构建 macOS、Windows、Linux 版本
- 推荐用于发布版本

### 3. `build-mac-signed.yml` - macOS 签名构建
- 构建并签名 macOS 版本
- 需要配置 Apple 开发者证书

## 使用方法

### 手动触发构建
1. 进入 GitHub 仓库的 Actions 标签页
2. 选择对应的工作流
3. 点击 "Run workflow" 按钮

### 自动触发
- 推送到 `main` 或 `master` 分支
- 创建 tag（如 `v1.0.0`）
- 创建 Pull Request

## macOS 代码签名配置（可选）

如果要发布到 Mac App Store 或需要公证，需要配置以下 GitHub Secrets：

### 必需的 Secrets
在仓库设置 → Secrets and variables → Actions 中添加：

1. `CSC_LINK` - Base64 编码的 .p12 证书文件
2. `CSC_KEY_PASSWORD` - 证书密码
3. `APPLE_ID` - Apple ID 邮箱
4. `APPLE_APP_SPECIFIC_PASSWORD` - 应用专用密码
5. `APPLE_TEAM_ID` - Apple Team ID

### 获取证书文件
```bash
# 导出证书为 base64
base64 -i YourCertificate.p12 | pbcopy
```

### 生成应用专用密码
1. 访问 [Apple ID 账户页面](https://appleid.apple.com/)
2. 登录并进入"登录和安全"
3. 在"应用专用密码"部分生成新密码

## 构建产物

成功构建后，你可以在以下位置找到安装包：

1. **Actions 页面的 Artifacts**
   - 每次构建都会上传产物
   - 保留 30 天

2. **Releases 页面**（仅当推送 tag 时）
   - 自动创建 GitHub Release
   - 包含所有平台的安装包

## 支持的构建命令

项目支持以下 npm 脚本：
- `npm run package-mac` - 构建 macOS 版本
- `npm run package-win` - 构建 Windows 版本
- `npm run package` - 构建当前平台版本

## 故障排除

### 常见问题
1. **构建失败** - 检查 package.json 中的依赖版本
2. **签名失败** - 确保证书和密码正确配置
3. **上传失败** - 检查 release 目录是否存在构建产物

### 查看构建日志
1. 进入 Actions 页面
2. 点击失败的工作流
3. 展开相应步骤查看详细日志