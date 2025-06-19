@echo off
echo 🔧 快捷键功能测试脚本
echo.
echo 请按照以下步骤测试快捷键修复情况：
echo.
echo 1. 启动客户端应用
echo 2. 测试以下快捷键：
echo.
echo 📸 Ctrl+H        - 截取屏幕
echo 🚀 Ctrl+Enter   - 开始处理截图
echo 🔄 Ctrl+R       - 重置队列 (修复后应保持窗口可见)
echo 👁️ Ctrl+B       - 切换窗口显示/隐藏
echo ⬅️ Ctrl+Left    - 向左移动窗口
echo ➡️ Ctrl+Right   - 向右移动窗口
echo ⬆️ Ctrl+Up     - 向上移动窗口 (修复后应正常响应)
echo ⬇️ Ctrl+Down   - 向下移动窗口 (修复后应正常响应)
echo 🆘 Ctrl+Shift+R - 应急恢复窗口到屏幕中央 (新增)
echo 🔄 Ctrl+Shift+C - 手动刷新配置 (新增)
echo.
echo 🧪 测试场景：
echo - 使用 Ctrl+R 重置后，窗口是否依然可见？
echo - 多次按 Ctrl+Down 是否能正常移动窗口？
echo - 如果窗口丢失，Ctrl+Shift+R 是否能恢复？
echo - 在Web端更改配置后，使用 Ctrl+Shift+C 刷新配置
echo.
echo 📋 如果发现问题，请检查控制台日志输出
echo.
pause 