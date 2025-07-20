-- =====================================================
-- InterviewCodeOverlay 数据库迁移脚本
-- 目标服务器: 159.75.174.234:3306
-- 数据库名: interview_coder
-- 生成时间: 2025-07-19
-- =====================================================

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `interview_coder` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE `interview_coder`;

-- =====================================================
-- 用户系统相关表
-- =====================================================

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('user','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `points` int NOT NULL DEFAULT '100',
  `invite_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `inviter_id` int DEFAULT NULL,
  `invited_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`),
  UNIQUE KEY `users_email_key` (`email`),
  UNIQUE KEY `users_invite_code_key` (`invite_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户配置表
CREATE TABLE IF NOT EXISTS `user_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `programming_model` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  `multiple_choice_model` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  `ai_model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'claude-3-5-sonnet-20241022',
  `selected_provider` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'claude',
  `extraction_model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'claude-sonnet-4-20250514',
  `solution_model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'claude-sonnet-4-20250514',
  `debugging_model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'claude-sonnet-4-20250514',
  `language` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'python',
  `theme` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `opacity` double NOT NULL DEFAULT '1',
  `show_copy_button` tinyint(1) NOT NULL DEFAULT '1',
  `shortcuts` text COLLATE utf8mb4_unicode_ci,
  `display` text COLLATE utf8mb4_unicode_ci,
  `processing` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_configs_user_id_key` (`user_id`),
  CONSTRAINT `user_configs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户会话表
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refresh_token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_sessions_token_key` (`token`),
  UNIQUE KEY `user_sessions_refresh_token_key` (`refresh_token`),
  KEY `user_sessions_user_id_fkey` (`user_id`),
  CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- AI系统相关表
-- =====================================================

-- 使用记录表
CREATE TABLE IF NOT EXISTS `usage_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokens_used` int DEFAULT NULL,
  `success` tinyint(1) NOT NULL DEFAULT '1',
  `error_msg` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `usage_records_user_id_fkey` (`user_id`),
  CONSTRAINT `usage_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI模型表
CREATE TABLE IF NOT EXISTS `ai_models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `model_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `priority` int NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_models_model_id_key` (`model_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 认证系统相关表
-- =====================================================

-- 邮箱验证码表
CREATE TABLE IF NOT EXISTS `email_verification_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_verification_codes_token_key` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Redis会话备份表
CREATE TABLE IF NOT EXISTS `redis_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `data` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `redis_sessions_session_id_key` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 积分系统相关表
-- =====================================================

-- 模型积分配置表
CREATE TABLE IF NOT EXISTS `model_point_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `model_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_type` enum('multiple_choice','programming') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cost` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `model_point_configs_model_name_question_type_key` (`model_name`,`question_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 积分交易记录表
CREATE TABLE IF NOT EXISTS `point_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `transaction_type` enum('consume','recharge','refund','reward') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int NOT NULL,
  `balance_after` int NOT NULL,
  `model_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `question_type` enum('multiple_choice','programming') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `metadata` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `point_transactions_user_id_fkey` (`user_id`),
  CONSTRAINT `point_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 支付系统相关表
-- =====================================================

-- 支付套餐表
CREATE TABLE IF NOT EXISTS `payment_packages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `amount` decimal(10,2) NOT NULL,
  `points` int NOT NULL,
  `bonus_points` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `icon` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` text COLLATE utf8mb4_unicode_ci,
  `is_recommended` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `payment_packages_is_active_idx` (`is_active`),
  KEY `payment_packages_sort_order_idx` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 支付订单表
CREATE TABLE IF NOT EXISTS `payment_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_no` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `out_trade_no` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `points` int NOT NULL,
  `bonus_points` int NOT NULL DEFAULT '0',
  `payment_method` enum('wechat_pay','alipay') COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_status` enum('pending','paid','failed','cancelled','refunded','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `transaction_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_time` datetime(3) DEFAULT NULL,
  `notify_time` datetime(3) DEFAULT NULL,
  `expire_time` datetime(3) NOT NULL,
  `package_id` int DEFAULT NULL,
  `metadata` text COLLATE utf8mb4_unicode_ci,
  `fail_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_orders_order_no_key` (`order_no`),
  UNIQUE KEY `payment_orders_out_trade_no_key` (`out_trade_no`),
  KEY `payment_orders_user_id_idx` (`user_id`),
  KEY `payment_orders_order_no_idx` (`order_no`),
  KEY `payment_orders_payment_status_idx` (`payment_status`),
  KEY `payment_orders_created_at_idx` (`created_at`),
  KEY `payment_orders_package_id_fkey` (`package_id`),
  CONSTRAINT `payment_orders_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `payment_packages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `payment_orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 支付回调日志表
CREATE TABLE IF NOT EXISTS `payment_notify_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_no` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_method` enum('wechat_pay','alipay') COLLATE utf8mb4_unicode_ci NOT NULL,
  `notify_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_headers` text COLLATE utf8mb4_unicode_ci,
  `response_status` int NOT NULL DEFAULT '200',
  `process_status` enum('pending','success','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `process_time` datetime(3) DEFAULT NULL,
  `retry_count` int NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `payment_notify_logs_order_no_idx` (`order_no`),
  KEY `payment_notify_logs_process_status_idx` (`process_status`),
  KEY `payment_notify_logs_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 邀请系统相关表
-- =====================================================

-- 邀请记录表
CREATE TABLE IF NOT EXISTS `invite_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inviter_id` int NOT NULL,
  `invitee_id` int NOT NULL,
  `invite_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'REGISTERED',
  `first_recharge_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `commission_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `commission_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invite_records_invitee_id_key` (`invitee_id`),
  KEY `invite_records_inviter_id_idx` (`inviter_id`),
  KEY `invite_records_status_idx` (`status`),
  CONSTRAINT `invite_records_invitee_id_fkey` FOREIGN KEY (`invitee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invite_records_inviter_id_fkey` FOREIGN KEY (`inviter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 邀请奖励记录表
CREATE TABLE IF NOT EXISTS `invite_rewards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inviter_id` int NOT NULL,
  `invitee_id` int NOT NULL,
  `reward_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reward_amount` int NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GRANTED',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `invite_rewards_inviter_id_idx` (`inviter_id`),
  KEY `invite_rewards_reward_type_idx` (`reward_type`),
  KEY `invite_rewards_status_idx` (`status`),
  CONSTRAINT `invite_rewards_invitee_id_fkey` FOREIGN KEY (`invitee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invite_rewards_inviter_id_fkey` FOREIGN KEY (`inviter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 初始数据插入
-- =====================================================

-- 插入默认AI模型配置
INSERT IGNORE INTO `ai_models` (`model_id`, `name`, `provider`, `category`, `is_active`, `priority`) VALUES
('claude-sonnet-4-20250514', 'Claude Sonnet 4', 'claude', 'general', 1, 100),
('claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'claude', 'general', 1, 90),
('gpt-4', 'GPT-4', 'openai', 'general', 1, 80),
('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', 'general', 1, 70);

-- 插入默认积分配置
INSERT IGNORE INTO `model_point_configs` (`model_name`, `question_type`, `cost`, `description`) VALUES
('claude-sonnet-4-20250514', 'programming', 5, 'Claude Sonnet 4 编程题分析'),
('claude-sonnet-4-20250514', 'multiple_choice', 2, 'Claude Sonnet 4 选择题分析'),
('claude-3-5-sonnet-20241022', 'programming', 4, 'Claude 3.5 Sonnet 编程题分析'),
('claude-3-5-sonnet-20241022', 'multiple_choice', 2, 'Claude 3.5 Sonnet 选择题分析'),
('gpt-4', 'programming', 4, 'GPT-4 编程题分析'),
('gpt-4', 'multiple_choice', 2, 'GPT-4 选择题分析'),
('gpt-3.5-turbo', 'programming', 3, 'GPT-3.5 Turbo 编程题分析'),
('gpt-3.5-turbo', 'multiple_choice', 1, 'GPT-3.5 Turbo 选择题分析');

-- 插入默认支付套餐
INSERT IGNORE INTO `payment_packages` (`name`, `description`, `amount`, `points`, `bonus_points`, `is_active`, `sort_order`, `is_recommended`) VALUES
('基础套餐', '适合轻度使用', 10.00, 100, 10, 1, 1, 0),
('标准套餐', '适合日常使用', 30.00, 350, 50, 1, 2, 1),
('高级套餐', '适合重度使用', 50.00, 600, 100, 1, 3, 0),
('专业套餐', '适合专业用户', 100.00, 1300, 300, 1, 4, 0);

-- =====================================================
-- 创建测试用户（可选）
-- =====================================================

-- 创建默认管理员用户 (密码: admin123456)
INSERT IGNORE INTO `users` (`username`, `email`, `password`, `role`, `points`) VALUES
('admin', 'admin@interview-coder.com', '$2b$10$XhZmhzQy5Bi1HzJZKHVuEOXKd1n2Qo3qp4r7YsC8vMWxN9ZVBtG6W', 'admin', 1000);

-- 为管理员用户创建配置
INSERT IGNORE INTO `user_configs` (`user_id`, `language`, `theme`) 
SELECT id, 'python', 'system' FROM `users` WHERE `username` = 'admin' AND NOT EXISTS (
    SELECT 1 FROM `user_configs` WHERE `user_id` = (SELECT id FROM `users` WHERE `username` = 'admin')
);

-- =====================================================
-- 索引优化
-- =====================================================

-- 创建常用查询的索引
CREATE INDEX IF NOT EXISTS `idx_users_created_at` ON `users` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_usage_records_created_at` ON `usage_records` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_point_transactions_created_at` ON `point_transactions` (`created_at`);

-- =====================================================
-- 完成信息
-- =====================================================

SELECT 'Database migration completed successfully!' AS message,
       NOW() AS completed_at,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'interview_coder') AS total_tables;