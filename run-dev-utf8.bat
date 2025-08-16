@echo off
echo Setting UTF-8 encoding for Windows console...
chcp 65001 > nul
echo Console encoding set to UTF-8 (Code Page 65001)
echo.
echo Starting development server with UTF-8 support...
npm run dev