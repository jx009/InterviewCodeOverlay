-- 创建Navicat专用用户
CREATE USER IF NOT EXISTS 'jx'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Jianxin0520!';

-- 授权访问interview_coder数据库
GRANT ALL PRIVILEGES ON interview_coder.* TO 'navicat_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示创建的用户
SELECT User, Host, plugin FROM mysql.user WHERE User = 'navicat_user'; 