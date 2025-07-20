# 🔐 代码签名配置指南

此文档说明如何配置GitHub Actions进行代码签名，以提供更安全的应用分发。

## 📋 概述

代码签名可以：
- 证明应用来源的真实性
- 防止应用被恶意修改
- 减少用户安装时的安全警告
- 支持自动更新功能

## 🪟 Windows 代码签名

### 1. 获取代码签名证书

**选项A: 购买商业证书（推荐）**
- DigiCert
- Sectigo (原Comodo)
- GlobalSign

**选项B: 自签名证书（测试用）**
```bash
# 生成自签名证书（仅用于测试）
New-SelfSignedCertificate -DnsName "Your Company" -Type CodeSigning -CertStoreLocation "Cert:\CurrentUser\My"
```

### 2. 配置GitHub Secrets

在GitHub仓库设置中添加以下Secrets：

```
WIN_CSC_LINK=<base64编码的.p12证书文件>
WIN_CSC_KEY_PASSWORD=<证书密码>
```

### 3. 获取证书的base64编码

```bash
# Windows PowerShell
[Convert]::ToBase64String((Get-Content -Path "certificate.p12" -Encoding Byte))

# macOS/Linux
base64 certificate.p12
```

## 🍎 macOS 代码签名和公证

### 1. 获取Apple开发者证书

1. 加入Apple Developer Program ($99/年)
2. 在Keychain Access中创建证书签名请求
3. 在Apple Developer Portal创建证书
4. 下载并安装证书到Keychain

### 2. 配置GitHub Secrets

```
APPLE_ID=<你的Apple ID>
APPLE_APP_SPECIFIC_PASSWORD=<App专用密码>
APPLE_TEAM_ID=<开发者团队ID>
CSC_LINK=<base64编码的.p12证书>
CSC_KEY_PASSWORD=<证书密码>
```

### 3. 生成App专用密码

1. 登录 [appleid.apple.com](https://appleid.apple.com)
2. 在"登录和安全性"中生成App专用密码
3. 记录密码，只会显示一次

### 4. 导出证书

```bash
# 从Keychain导出证书
security find-identity -v -p codesigning
security export -t p12 -f pkcs12 -k login.keychain -P <密码> -o certificate.p12 <证书名称>
```

## 🔧 electron-builder配置

确保`package.json`中的build配置正确：

```json
{
  "build": {
    "mac": {
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "notarize": true,
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    },
    "win": {
      "certificateFile": null,
      "certificatePassword": null,
      "signingHashAlgorithms": ["sha256"],
      "signDlls": true
    }
  }
}
```

## 🚀 使用说明

### 启用代码签名

在GitHub Actions中，代码签名会在以下条件下自动启用：
- 设置了相应的环境变量
- `CSC_IDENTITY_AUTO_DISCOVERY`未设置为`false`

### 禁用代码签名

如果暂时不需要代码签名（如测试阶段），设置：
```yaml
env:
  CSC_IDENTITY_AUTO_DISCOVERY: false
```

## 🧪 测试代码签名

### Windows

```bash
# 检查签名
signtool verify /pa /v "path\to\your\app.exe"
```

### macOS

```bash
# 检查签名
codesign -dv --verbose=4 "path/to/your/app.app"

# 检查公证状态
spctl -a -t exec -vv "path/to/your/app.app"
```

## ❗ 注意事项

1. **证书安全**: 
   - 永远不要在代码中暴露证书或密码
   - 使用GitHub Secrets安全存储敏感信息

2. **证书有效期**:
   - 定期检查证书有效期
   - 及时更新即将过期的证书

3. **首次公证**:
   - macOS首次公证可能需要较长时间
   - 确保网络连接稳定

4. **测试环境**:
   - 可以在fork的仓库中先测试配置
   - 使用自签名证书进行本地测试

## 🔗 相关链接

- [electron-builder代码签名文档](https://www.electron.build/code-signing)
- [Apple公证指南](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Windows代码签名最佳实践](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)