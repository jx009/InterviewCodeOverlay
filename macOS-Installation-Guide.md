# macOS 安装指南

## ⚠️ 重要：解决"应用已损坏"错误

由于应用未经 Apple 公证，macOS 会显示"QuizCoze-2025.08.16 已损坏"的错误。

### 🔧 一键解决方法

下载后在终端执行这个命令（复制粘贴即可）：

```bash
# 方法1：针对 DMG 文件
find ~/Downloads -name "QuizCoze-2025.08.16-*.dmg" -exec xattr -d com.apple.quarantine {} \;

# 方法2：如果已经安装到应用程序文件夹
sudo xattr -rd com.apple.quarantine /Applications/QuizCoze-2025.08.16.app

# 方法3：万能命令（推荐）
sudo spctl --master-disable && sudo xattr -rd com.apple.quarantine /Applications/QuizCoze-2025.08.16.app && sudo spctl --master-enable
```

#### 方法2：系统设置允许
1. 尝试打开应用
2. 出现警告后，进入 **系统偏好设置** → **安全性与隐私** → **通用**
3. 点击 "仍要打开" 按钮

#### 方法3：右键打开
1. 右键点击应用
2. 选择 "打开"
3. 在弹出的对话框中选择 "打开"

### 为什么会出现这个问题？

- 应用未经 Apple 开发者证书签名
- macOS Gatekeeper 默认阻止未签名的应用
- 这是正常的安全机制，不影响应用功能

### 安全说明

此应用是开源软件，代码可在 GitHub 上查看。移除隔离属性是安全的。

---

## 安装步骤

1. 下载对应架构的 DMG 文件：
   - Intel Mac: `QuizCoze-2025.08.16-x64.dmg`
   - Apple Silicon Mac: `QuizCoze-2025.08.16-arm64.dmg`

2. 双击 DMG 文件挂载

3. 将 QuizCoze-2025.08.16 拖拽到 Applications 文件夹

4. 如果遇到"已损坏"错误，按照上述方法解决

5. 在 Launchpad 或 Applications 文件夹中找到并启动应用