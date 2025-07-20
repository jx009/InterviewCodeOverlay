# 🚀 构建和发布指南

本指南详细说明如何使用GitHub Actions自动构建和发布Interview Coder的Windows和macOS客户端。

## 📋 概述

项目现已配置完整的CI/CD流水线，支持：
- ✅ 自动构建Windows和macOS客户端
- ✅ 代码签名（可选）
- ✅ 自动创建GitHub Release
- ✅ 生成详细的发布说明
- ✅ 构建状态检查

## 🔧 文件结构

```
.github/
├── workflows/
│   ├── build.yml           # 主构建流水线
│   └── check-build.yml     # 快速构建检查
├── SIGNING_GUIDE.md        # 代码签名配置指南
scripts/
└── release.sh              # 快速发布脚本
```

## 🚀 发布新版本

### 方法1: 使用发布脚本（推荐）

```bash
# 在项目根目录执行
./scripts/release.sh
```

脚本会引导你：
1. 选择版本类型（patch/minor/major）
2. 添加发布说明（可选）
3. 自动创建tag并推送

### 方法2: 手动发布

```bash
# 1. 更新版本号
npm version patch  # 或 minor/major

# 2. 推送更改
git push origin main

# 3. 创建并推送tag
git tag v1.0.20
git push origin v1.0.20
```

## 🔄 构建流程

### 触发条件
- ✅ 推送tag (`v*`)
- ✅ 推送到main/master分支
- ✅ Pull Request
- ✅ 手动触发

### 构建矩阵
| 平台 | 操作系统 | 输出文件 |
|------|----------|----------|
| Windows | windows-latest | `.exe`, `.nsis.7z` |
| macOS | macos-latest | `.dmg`, `.zip` |

### 构建步骤
1. **环境准备**: Node.js 18, Python, 构建工具
2. **依赖安装**: `npm ci`
3. **应用构建**: `npm run build`
4. **客户端打包**: `npm run package-win/mac`
5. **文件上传**: 构建产物上传到GitHub
6. **Release创建**: 自动创建GitHub Release（仅tag）

## 📦 构建产物

### Windows
- `Interview-Coder-Windows-{version}.exe` - NSIS安装包
- `Interview-Coder-Windows-{version}.nsis.7z` - 7zip压缩包

### macOS
- `Interview-Coder-{arch}.dmg` - DMG安装包（Intel/Apple Silicon）
- `Interview-Coder-{arch}.zip` - ZIP压缩包

## 🔐 代码签名（可选）

### 启用代码签名
1. 参考 `.github/SIGNING_GUIDE.md`
2. 在GitHub仓库设置中添加Secrets
3. 移除或注释 `CSC_IDENTITY_AUTO_DISCOVERY: false`

### Windows签名Secrets
```
WIN_CSC_LINK=<base64证书>
WIN_CSC_KEY_PASSWORD=<证书密码>
```

### macOS签名Secrets
```
APPLE_ID=<Apple ID>
APPLE_APP_SPECIFIC_PASSWORD=<App专用密码>
APPLE_TEAM_ID=<团队ID>
CSC_LINK=<base64证书>
CSC_KEY_PASSWORD=<证书密码>
```

## 📊 监控构建

### 查看构建状态
- GitHub Actions页面: `https://github.com/{owner}/{repo}/actions`
- 构建徽章: `![Build Status](https://github.com/{owner}/{repo}/workflows/Build%20and%20Release/badge.svg)`

### 构建失败排查
1. **依赖问题**: 检查`package.json`和`npm ci`日志
2. **构建错误**: 查看`npm run build`输出
3. **打包失败**: 检查electron-builder配置
4. **签名问题**: 验证证书和Secrets配置

## 🛠️ 本地测试

### 测试构建
```bash
# 安装依赖
npm ci

# 构建应用
npm run build

# 测试Windows打包
npm run package-win

# 测试macOS打包  
npm run package-mac
```

### 测试配置
```bash
# 验证package.json配置
node -e "console.log(JSON.stringify(require('./package.json').build, null, 2))"

# 检查electron-builder
npx electron-builder --help
```

## 📋 发布清单

发布前确认：
- [ ] 版本号已更新
- [ ] 更新日志已准备
- [ ] 代码已测试
- [ ] 构建脚本正常
- [ ] 图标文件存在
- [ ] 签名配置正确（如需要）

## 🔧 故障排除

### 常见问题

**1. 构建超时**
```yaml
# 在workflow中增加超时时间
timeout-minutes: 60
```

**2. 依赖安装失败**
```bash
# 清理缓存
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**3. Python错误**
```yaml
# 确保Python版本正确
- uses: actions/setup-python@v4
  with:
    python-version: '3.x'
```

**4. macOS签名失败**
```bash
# 检查证书
security find-identity -v -p codesigning
```

### 获取帮助
- [electron-builder文档](https://www.electron.build/)
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [项目Issues](../../issues)

## 📈 性能优化

### 构建加速
1. **缓存依赖**: 已配置npm cache
2. **并行构建**: 使用matrix策略
3. **增量构建**: 仅在必要时重新构建

### 文件大小优化
```json
{
  "build": {
    "compression": "maximum",
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

## 🎯 后续改进

- [ ] 添加自动更新功能
- [ ] 集成测试覆盖率
- [ ] 添加性能测试
- [ ] 支持Linux构建
- [ ] 添加多语言支持

---

**需要帮助？** 请查看 [构建日志](../../actions) 或提交 [Issue](../../issues/new)