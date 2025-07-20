@echo off
echo 推送代码到GitHub并触发自动构建...

echo.
echo 1. 推送当前分支...
git push origin test1

echo.
echo 2. 推送标签触发构建...
git push origin v1.0.19

echo.
echo 3. 构建状态可在以下链接查看:
echo https://github.com/jx009/InterviewCodeOverlay/actions

echo.
echo 4. 构建完成后下载地址:
echo https://github.com/jx009/InterviewCodeOverlay/releases/tag/v1.0.19

pause