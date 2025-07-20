# GitHub Actions 故障排除指南

## 🔍 可能的原因：

### 1. 标签未推送
GitHub Actions配置为仅在推送标签时触发 (`tags: v*`)

**解决方案**：确保推送了标签
```bash
# 检查本地标签
git tag -l

# 推送标签
git push origin v1.0.19

# 或者推送所有标签
git push origin --tags
```

### 2. Actions权限未开启
仓库可能禁用了GitHub Actions

**解决方案**：
1. 访问 https://github.com/jx009/InterviewCodeOverlay/settings/actions
2. 确保 "Actions permissions" 设置为 "Allow all actions and reusable workflows"

### 3. 工作流文件不在默认分支
Actions需要工作流文件在默认分支(main/master)

**解决方案**：
```bash
# 切换到main分支并合并
git checkout main
git merge test1
git push origin main
```

### 4. 手动触发构建
由于配置了 `workflow_dispatch`，可以手动触发

**操作步骤**：
1. 访问 https://github.com/jx009/InterviewCodeOverlay/actions
2. 点击 "Build and Release" 工作流
3. 点击 "Run workflow" 按钮
4. 选择分支并点击 "Run workflow"

## 🚀 立即解决方案：

### 方案1：推送到main分支
```bash
cd /mnt/c/jxProject/InterviewCodeOverlay1111/InterviewCodeOverlay

# 切换到main分支
git checkout main

# 合并test1分支的更改
git merge test1

# 推送到main分支
git push origin main

# 推送标签
git push origin v1.0.19
```

### 方案2：修改触发条件
添加push到test1分支的触发条件：

```yaml
on:
  push:
    branches: [test1, main]
    tags:
      - 'v*'
  workflow_dispatch:
```

## 🔗 检查链接：

1. **Actions页面**: https://github.com/jx009/InterviewCodeOverlay/actions
2. **设置页面**: https://github.com/jx009/InterviewCodeOverlay/settings/actions
3. **分支页面**: https://github.com/jx009/InterviewCodeOverlay/branches

## ⏱️ 预期结果：

推送标签或手动触发后，应该看到：
- 工作流出现在Actions页面
- 两个并行任务：Windows和macOS构建
- 构建完成后自动创建Release