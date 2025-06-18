@echo off
echo === 启动后端服务器 ===
cd /d "%~dp0\backend"
echo 启动路径: %cd%
node server-simple.js
pause 