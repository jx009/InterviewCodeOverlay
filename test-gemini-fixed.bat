@echo off
chcp 65001 >nul
echo ========================================
echo    截图识别固定模型测试脚本
echo ========================================
echo.
echo 此脚本用于测试截图识别功能是否已固定使用 gemini-2.5-flash-preview-04-17 模型
echo.
echo 测试步骤：
echo 1. 启动客户端应用
echo 2. 进行截图识别操作
echo 3. 查看控制台日志，确认使用的模型
echo.
echo 预期日志输出：
echo "🔍 使用固定模型进行截图识别: gemini-2.5-flash-preview-04-17"
echo "🔍 使用固定模型提取编程题信息: gemini-2.5-flash-preview-04-17"
echo "🔍 使用固定模型提取选择题信息: gemini-2.5-flash-preview-04-17"
echo.
echo 按任意键启动应用进行测试...
pause >nul

echo 正在启动应用...
call start.bat 