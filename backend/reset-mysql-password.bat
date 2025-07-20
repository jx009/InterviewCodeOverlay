@echo off
echo ===========================================
echo MySQL Root密码重置脚本
echo ===========================================
echo.

echo 1. 停止MySQL服务...
net stop MySQL80

echo.
echo 2. 创建临时初始化文件...
echo ALTER USER 'root'@'localhost' IDENTIFIED BY 'Jianxin0520!'; > "%TEMP%\mysql-init.txt"
echo FLUSH PRIVILEGES; >> "%TEMP%\mysql-init.txt"

echo.
echo 3. 以安全模式启动MySQL...
start /B mysqld --init-file="%TEMP%\mysql-init.txt"

echo.
echo 4. 等待MySQL启动...
timeout /t 10 /nobreak > nul

echo.
echo 5. 重启MySQL服务...
taskkill /f /im mysqld.exe 2>nul
net start MySQL80

echo.
echo 6. 清理临时文件...
del "%TEMP%\mysql-init.txt"

echo.
echo ===========================================
echo 密码重置完成！
echo 现在可以使用以下信息连接：
echo 用户名: root
echo 密码: Jianxin0520!
echo ===========================================
pause 