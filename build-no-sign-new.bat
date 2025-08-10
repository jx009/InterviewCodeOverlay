@echo off
echo 清理缓存...
rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache" 2>nul

echo 设置环境变量...
set CSC_IDENTITY_AUTO_DISCOVERY=false
set WIN_CSC_LINK=
set CSC_LINK=
set CSC_KEY_PASSWORD=
set WIN_CSC_KEY_PASSWORD=

echo 开始构建...
npm run build

echo 开始打包（跳过签名）- 应用名称: QuizCoze
npx electron-builder build --win --publish=never --config.nsis.oneClick=false --config.nsis.allowToChangeInstallationDirectory=true

echo 打包完成！生成的安装包位于 release 文件夹中
echo 文件名格式: QuizCoze-Windows-{version}.exe
pause