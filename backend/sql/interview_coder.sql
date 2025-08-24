/*
 Navicat Premium Dump SQL

 Source Server         : 服务器mysql
 Source Server Type    : MySQL
 Source Server Version : 80036 (8.0.36)
 Source Host           : 159.75.174.234:3306
 Source Schema         : interview_coder

 Target Server Type    : MySQL
 Target Server Version : 80036 (8.0.36)
 File Encoding         : 65001

 Date: 10/08/2025 21:12:15
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for ai_models
-- ----------------------------
DROP TABLE IF EXISTS `ai_models`;
CREATE TABLE `ai_models`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `model_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `priority` int NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `ai_models_model_id_key`(`model_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of ai_models
-- ----------------------------
INSERT INTO `ai_models` VALUES (1, 'claude-sonnet-4-20250514', 'Claude Sonnet 4', 'claude', 'general', 1, 100, '2025-07-20 02:36:54.053', '2025-07-20 02:36:54.053');
INSERT INTO `ai_models` VALUES (2, 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'claude', 'general', 1, 90, '2025-07-20 02:36:54.053', '2025-07-20 02:36:54.053');
INSERT INTO `ai_models` VALUES (3, 'gpt-4', 'GPT-4', 'openai', 'general', 1, 80, '2025-07-20 02:36:54.053', '2025-07-20 02:36:54.053');
INSERT INTO `ai_models` VALUES (4, 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', 'general', 1, 70, '2025-07-20 02:36:54.053', '2025-07-20 02:36:54.053');

-- ----------------------------
-- Table structure for announcements
-- ----------------------------
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `priority` int NOT NULL DEFAULT 0,
  `show_style` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `start_time` datetime(3) NULL DEFAULT NULL,
  `end_time` datetime(3) NULL DEFAULT NULL,
  `created_by` int NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `announcements_is_active_idx`(`is_active` ASC) USING BTREE,
  INDEX `announcements_priority_idx`(`priority` ASC) USING BTREE,
  INDEX `announcements_start_time_idx`(`start_time` ASC) USING BTREE,
  INDEX `announcements_end_time_idx`(`end_time` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of announcements
-- ----------------------------
INSERT INTO `announcements` VALUES (2, '内测，全场1折', '通知：工具内测阶段，8月份充值，全场价格限时低至于 <strong style=\"color:red\">2 折</strong>，利用本软件，轻松拿下笔试！加群可以免费领取 200 积分：<a target=\"_blank\" href=\"https://shuaidi-picture-1257337429.cos.ap-guangzhou.myqcloud.com/img/202508081438031.png\">点击加群</a>', 1, 0, 'success', NULL, NULL, NULL, '2025-07-28 11:33:42.000', '2025-08-09 14:54:07.503');

-- ----------------------------
-- Table structure for email_verification_codes
-- ----------------------------
DROP TABLE IF EXISTS `email_verification_codes`;
CREATE TABLE `email_verification_codes`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `email_verification_codes_token_key`(`token` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of email_verification_codes
-- ----------------------------

-- ----------------------------
-- Table structure for invite_records
-- ----------------------------
DROP TABLE IF EXISTS `invite_records`;
CREATE TABLE `invite_records`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `inviter_id` int NOT NULL,
  `invitee_id` int NOT NULL,
  `invite_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'REGISTERED',
  `first_recharge_amount` decimal(10, 2) NOT NULL DEFAULT 0.00,
  `commission_amount` decimal(10, 2) NOT NULL DEFAULT 0.00,
  `commission_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `invite_records_invitee_id_key`(`invitee_id` ASC) USING BTREE,
  INDEX `invite_records_inviter_id_idx`(`inviter_id` ASC) USING BTREE,
  INDEX `invite_records_status_idx`(`status` ASC) USING BTREE,
  CONSTRAINT `invite_records_invitee_id_fkey` FOREIGN KEY (`invitee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invite_records_inviter_id_fkey` FOREIGN KEY (`inviter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of invite_records
-- ----------------------------

-- ----------------------------
-- Table structure for invite_rewards
-- ----------------------------
DROP TABLE IF EXISTS `invite_rewards`;
CREATE TABLE `invite_rewards`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `inviter_id` int NOT NULL,
  `invitee_id` int NOT NULL,
  `reward_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reward_amount` int NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GRANTED',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `invite_rewards_inviter_id_idx`(`inviter_id` ASC) USING BTREE,
  INDEX `invite_rewards_reward_type_idx`(`reward_type` ASC) USING BTREE,
  INDEX `invite_rewards_status_idx`(`status` ASC) USING BTREE,
  INDEX `invite_rewards_invitee_id_fkey`(`invitee_id` ASC) USING BTREE,
  CONSTRAINT `invite_rewards_invitee_id_fkey` FOREIGN KEY (`invitee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invite_rewards_inviter_id_fkey` FOREIGN KEY (`inviter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of invite_rewards
-- ----------------------------

-- ----------------------------
-- Table structure for llm_config
-- ----------------------------
DROP TABLE IF EXISTS `llm_config`;
CREATE TABLE `llm_config`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '配置键名',
  `config_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '配置值',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '配置描述',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `config_key`(`config_key` ASC) USING BTREE,
  INDEX `is_active`(`is_active` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 14 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = 'LLM配置表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of llm_config
-- ----------------------------
INSERT INTO `llm_config` VALUES (1, 'base_url', 'https://ismaque.org/v1', 'LLM API基础URL', 1, '2025-08-03 13:14:31', '2025-08-09 15:17:32');
INSERT INTO `llm_config` VALUES (2, 'api_key', 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP', 'LLM API密钥', 1, '2025-08-03 13:14:31', '2025-08-09 15:17:33');
INSERT INTO `llm_config` VALUES (3, 'max_retries', '2', '最大重试次数', 1, '2025-08-03 13:14:31', '2025-08-03 13:14:31');
INSERT INTO `llm_config` VALUES (4, 'timeout', '300000', '请求超时时间(毫秒)', 1, '2025-08-03 13:14:31', '2025-08-03 15:06:44');
INSERT INTO `llm_config` VALUES (5, 'provider', 'ismaque', '提供商名称', 1, '2025-08-03 13:14:31', '2025-08-03 13:14:31');

-- ----------------------------
-- Table structure for model_point_configs
-- ----------------------------
DROP TABLE IF EXISTS `model_point_configs`;
CREATE TABLE `model_point_configs`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `model_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_type` enum('multiple_choice','programming') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cost` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `model_point_configs_model_name_question_type_key`(`model_name` ASC, `question_type` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 48 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of model_point_configs
-- ----------------------------
INSERT INTO `model_point_configs` VALUES (1, 'claude-sonnet-4-20250514', 'programming', 12, 1, 'Claude Sonnet 4 编程题分析', '2025-07-20 02:36:54.078', '2025-07-28 13:09:29.185');
INSERT INTO `model_point_configs` VALUES (2, 'claude-sonnet-4-20250514', 'multiple_choice', 8, 1, 'Claude Sonnet 4 选择题分析', '2025-07-20 02:36:54.078', '2025-07-28 13:09:19.642');
INSERT INTO `model_point_configs` VALUES (33, 'gpt-4o', 'multiple_choice', 6, 1, 'GPT-4 选择题分析', '2025-07-23 13:18:03.978', '2025-07-28 13:10:41.424');
INSERT INTO `model_point_configs` VALUES (34, 'gpt-4o', 'programming', 10, 1, 'GPT-4 编程题分析', '2025-07-23 13:18:12.285', '2025-07-28 13:10:49.308');
INSERT INTO `model_point_configs` VALUES (35, 'gemini-2.5-pro-exp-03-25', 'multiple_choice', 30, 1, '选择题', '2025-07-23 13:18:53.539', '2025-07-28 13:18:27.460');
INSERT INTO `model_point_configs` VALUES (36, 'gemini-2.5-pro-exp-03-25', 'programming', 40, 1, '编程题', '2025-07-23 13:19:03.047', '2025-07-28 13:18:48.742');
INSERT INTO `model_point_configs` VALUES (37, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', 8, 1, '选择题', '2025-07-23 13:19:24.286', '2025-08-07 16:51:02.688');
INSERT INTO `model_point_configs` VALUES (38, 'gemini-2.5-flash-preview-04-17', 'programming', 12, 1, '编程题', '2025-07-23 13:19:30.775', '2025-08-07 16:51:19.427');
INSERT INTO `model_point_configs` VALUES (39, 'gpt-4o-mini', 'multiple_choice', 3, 1, '选择题', '2025-07-23 13:19:46.966', '2025-08-03 15:39:47.946');
INSERT INTO `model_point_configs` VALUES (40, 'gpt-4o-mini', 'programming', 4, 1, '编程题', '2025-07-23 13:20:03.110', '2025-08-03 15:39:53.581');
INSERT INTO `model_point_configs` VALUES (41, 'o4-mini-high-all', 'multiple_choice', 150, 1, '选择题', '2025-07-23 13:20:19.680', '2025-07-28 13:28:40.489');
INSERT INTO `model_point_configs` VALUES (42, 'o4-mini-high-all', 'programming', 250, 1, '编程题', '2025-07-23 13:20:37.155', '2025-07-28 13:29:00.397');
INSERT INTO `model_point_configs` VALUES (46, 'o4-mini-all', 'multiple_choice', 30, 1, '', '2025-08-03 15:40:02.646', '2025-08-03 15:40:02.646');
INSERT INTO `model_point_configs` VALUES (47, 'o4-mini-all', 'programming', 40, 1, '', '2025-08-03 15:40:11.916', '2025-08-03 15:40:11.916');

-- ----------------------------
-- Table structure for payment_notify_logs
-- ----------------------------
DROP TABLE IF EXISTS `payment_notify_logs`;
CREATE TABLE `payment_notify_logs`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_no` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_method` enum('wechat_pay','alipay') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notify_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_headers` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `response_status` int NOT NULL DEFAULT 200,
  `process_status` enum('pending','success','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `process_time` datetime(3) NULL DEFAULT NULL,
  `retry_count` int NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `payment_notify_logs_order_no_idx`(`order_no` ASC) USING BTREE,
  INDEX `payment_notify_logs_process_status_idx`(`process_status` ASC) USING BTREE,
  INDEX `payment_notify_logs_created_at_idx`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of payment_notify_logs
-- ----------------------------

-- ----------------------------
-- Table structure for payment_orders
-- ----------------------------
DROP TABLE IF EXISTS `payment_orders`;
CREATE TABLE `payment_orders`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_no` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `out_trade_no` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `amount` decimal(10, 2) NOT NULL,
  `points` int NOT NULL,
  `bonus_points` int NOT NULL DEFAULT 0,
  `payment_method` enum('wechat_pay','alipay') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_status` enum('pending','paid','failed','cancelled','refunded','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `transaction_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `payment_time` datetime(3) NULL DEFAULT NULL,
  `notify_time` datetime(3) NULL DEFAULT NULL,
  `expire_time` datetime(3) NOT NULL,
  `package_id` int NULL DEFAULT NULL,
  `metadata` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `fail_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `payment_orders_order_no_key`(`order_no` ASC) USING BTREE,
  UNIQUE INDEX `payment_orders_out_trade_no_key`(`out_trade_no` ASC) USING BTREE,
  INDEX `payment_orders_user_id_idx`(`user_id` ASC) USING BTREE,
  INDEX `payment_orders_order_no_idx`(`order_no` ASC) USING BTREE,
  INDEX `payment_orders_payment_status_idx`(`payment_status` ASC) USING BTREE,
  INDEX `payment_orders_created_at_idx`(`created_at` ASC) USING BTREE,
  INDEX `payment_orders_package_id_fkey`(`package_id` ASC) USING BTREE,
  CONSTRAINT `payment_orders_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `payment_packages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `payment_orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 21 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of payment_orders
-- ----------------------------
INSERT INTO `payment_orders` VALUES (1, 'ORDER17530050715807489', 'RECHARGE_ORDER17530050715807489', 8, 0.01, 1000, 0, 'wechat_pay', 'paid', '4200002724202507202351391940', '2025-07-20 09:51:25.000', '2025-07-20 09:51:28.220', '2025-07-20 10:21:11.580', NULL, '{\"packageName\":\"测试套餐\",\"clientIp\":\"223.104.67.139\"}', NULL, '2025-07-20 09:51:11.593', '2025-07-20 09:51:28.221');
INSERT INTO `payment_orders` VALUES (2, 'ORDER17530055201146597', 'RECHARGE_ORDER17530055201146597', 1, 0.01, 1000, 0, 'wechat_pay', 'pending', NULL, NULL, NULL, '2025-07-20 10:28:40.115', NULL, '{\"packageName\":\"测试套餐\",\"clientIp\":\"223.104.67.139\"}', NULL, '2025-07-20 09:58:40.116', '2025-07-20 09:58:40.116');
INSERT INTO `payment_orders` VALUES (3, 'ORDER17530111707199277', 'RECHARGE_ORDER17530111707199277', 1, 29.90, 300, 50, 'wechat_pay', 'pending', NULL, NULL, NULL, '2025-07-20 12:02:50.719', NULL, '{\"packageName\":\"标准套餐\",\"clientIp\":\"120.229.36.62\"}', NULL, '2025-07-20 11:32:50.720', '2025-07-20 11:32:50.720');
INSERT INTO `payment_orders` VALUES (4, 'ORDER17530283904101204', 'RECHARGE_ORDER17530283904101204', 1, 0.01, 1000, 0, 'wechat_pay', 'paid', '4200002792202507211325209249', '2025-07-20 16:21:14.000', '2025-07-20 16:21:15.581', '2025-07-20 16:49:50.410', NULL, '{\"packageName\":\"测试套餐\",\"clientIp\":\"163.125.146.23\"}', NULL, '2025-07-20 16:19:50.411', '2025-07-20 16:21:15.582');
INSERT INTO `payment_orders` VALUES (5, 'ORDER17530306563277760', 'RECHARGE_ORDER17530306563277760', 8, 0.01, 1000, 0, 'wechat_pay', 'pending', NULL, NULL, NULL, '2025-07-20 17:27:36.327', NULL, '{\"packageName\":\"测试套餐\",\"clientIp\":\"223.104.67.139\"}', NULL, '2025-07-20 16:57:36.328', '2025-07-20 16:57:36.328');
INSERT INTO `payment_orders` VALUES (6, 'ORDER17535441801496487', 'RECHARGE_ORDER17535441801496487', 9, 0.01, 1000, 0, 'wechat_pay', 'paid', '4200002782202507263484924444', '2025-07-26 15:36:30.000', '2025-07-26 15:36:30.478', '2025-07-26 16:06:20.149', NULL, '{\"packageName\":\"测试套餐\",\"clientIp\":\"163.125.136.27\"}', NULL, '2025-07-26 15:36:20.150', '2025-07-26 15:36:30.479');
INSERT INTO `payment_orders` VALUES (7, 'ORDER17535509056355969', 'RECHARGE_ORDER17535509056355969', 9, 0.01, 1000, 0, 'wechat_pay', 'paid', '4200002744202507271874686826', '2025-07-26 17:28:47.000', '2025-07-26 17:28:47.960', '2025-07-26 17:58:25.635', NULL, '{\"packageName\":\"测试套餐\",\"clientIp\":\"163.125.136.27\"}', NULL, '2025-07-26 17:28:25.636', '2025-07-26 17:28:47.961');
INSERT INTO `payment_orders` VALUES (8, 'ORDER17535514599960249', 'RECHARGE_ORDER17535514599960249', 9, 9.90, 100, 10, 'wechat_pay', 'paid', '4200002744202507270237461561', '2025-07-26 17:37:51.000', '2025-07-26 17:37:53.449', '2025-07-26 18:07:39.996', NULL, '{\"packageName\":\"体验套餐\",\"clientIp\":\"163.125.136.27\"}', NULL, '2025-07-26 17:37:39.997', '2025-07-26 17:37:53.450');
INSERT INTO `payment_orders` VALUES (9, 'ORDER17535956003876185', 'RECHARGE_ORDER17535956003876185', 8, 0.01, 1000, 0, 'wechat_pay', 'pending', NULL, NULL, NULL, '2025-07-27 06:23:20.387', NULL, '{\"packageName\":\"测试套餐\",\"clientIp\":\"223.104.76.147\"}', NULL, '2025-07-27 05:53:20.388', '2025-07-27 05:53:20.388');
INSERT INTO `payment_orders` VALUES (10, 'ORDER17535959005808494', 'RECHARGE_ORDER17535959005808494', 8, 0.01, 1000, 0, 'wechat_pay', 'paid', '4200002777202507273378547419', '2025-07-27 05:58:32.000', '2025-07-27 05:58:33.662', '2025-07-27 06:28:20.580', NULL, '{\"packageName\":\"测试套餐\",\"clientIp\":\"223.104.76.147\"}', NULL, '2025-07-27 05:58:20.581', '2025-07-27 05:58:33.662');
INSERT INTO `payment_orders` VALUES (11, 'ORDER17535960904316868', 'RECHARGE_ORDER17535960904316868', 8, 0.01, 1000, 0, 'wechat_pay', 'paid', '4200002775202507276606676418', '2025-07-27 06:01:40.000', '2025-07-27 06:01:43.503', '2025-07-27 06:31:30.431', NULL, '{\"packageName\":\"测试套餐\",\"clientIp\":\"223.104.76.147\"}', NULL, '2025-07-27 06:01:30.432', '2025-07-27 06:01:43.504');
INSERT INTO `payment_orders` VALUES (12, 'ORDER17538923642617793', 'RECHARGE_ORDER17538923642617793', 8, 9.91, 100, 20, 'wechat_pay', 'pending', NULL, NULL, NULL, '2025-07-30 16:49:24.261', 20, '{\"packageName\":\"体验包\",\"clientIp\":\"223.104.78.254\"}', NULL, '2025-07-30 16:19:24.262', '2025-07-30 16:19:24.262');
INSERT INTO `payment_orders` VALUES (13, 'ORDER17538934903489382', 'RECHARGE_ORDER17538934903489382', 8, 9.90, 100, 20, 'wechat_pay', 'pending', NULL, NULL, NULL, '2025-07-30 17:08:10.348', 20, '{\"packageName\":\"体验包2\",\"clientIp\":\"223.104.78.254\"}', NULL, '2025-07-30 16:38:10.349', '2025-07-30 16:38:10.349');
INSERT INTO `payment_orders` VALUES (14, 'ORDER17539573309355893', 'RECHARGE_ORDER17539573309355893', 9, 9.90, 100, 150, 'wechat_pay', 'pending', NULL, NULL, NULL, '2025-07-31 10:52:10.935', 20, '{\"packageName\":\"体验包\",\"clientIp\":\"27.38.157.155\"}', NULL, '2025-07-31 10:22:10.936', '2025-07-31 10:22:10.936');
INSERT INTO `payment_orders` VALUES (15, 'ORDER17546381735228355', 'RECHARGE_ORDER17546381735228355', 14, 39.90, 400, 900, 'wechat_pay', 'paid', '4200002774202508088364965631', '2025-08-08 07:29:46.000', '2025-08-08 07:29:47.382', '2025-08-08 07:59:33.522', 21, '{\"packageName\":\"实战包\",\"clientIp\":\"114.246.198.87\"}', NULL, '2025-08-08 07:29:33.523', '2025-08-08 07:29:47.383');
INSERT INTO `payment_orders` VALUES (16, 'ORDER17546397234003353', 'RECHARGE_ORDER17546397234003353', 14, 99.90, 1000, 4000, 'wechat_pay', 'paid', '4200002743202508082687036137', '2025-08-08 07:55:36.000', '2025-08-08 07:55:37.419', '2025-08-08 08:25:23.400', 22, '{\"packageName\":\"上岸包\",\"clientIp\":\"114.246.198.87\"}', NULL, '2025-08-08 07:55:23.401', '2025-08-08 07:55:37.420');
INSERT INTO `payment_orders` VALUES (17, 'ORDER17547244549395274', 'RECHARGE_ORDER17547244549395274', 29, 9.90, 100, 150, 'wechat_pay', 'paid', '4200002772202508096415468255', '2025-08-09 07:27:50.000', '2025-08-09 07:27:51.710', '2025-08-09 07:57:34.939', 20, '{\"packageName\":\"体验包\",\"clientIp\":\"111.76.254.91\"}', NULL, '2025-08-09 07:27:34.940', '2025-08-09 07:27:51.710');
INSERT INTO `payment_orders` VALUES (18, 'ORDER17548034280358260', 'RECHARGE_ORDER17548034280358260', 42, 99.90, 1000, 4000, 'wechat_pay', 'pending', NULL, NULL, NULL, '2025-08-10 05:53:48.035', 22, '{\"packageName\":\"上岸包\",\"clientIp\":\"112.96.224.119\"}', NULL, '2025-08-10 05:23:48.036', '2025-08-10 05:23:48.036');
INSERT INTO `payment_orders` VALUES (19, 'ORDER17548035824730866', 'RECHARGE_ORDER17548035824730866', 42, 99.90, 1000, 4000, 'wechat_pay', 'paid', '4200002759202508103929748512', '2025-08-10 05:26:35.000', '2025-08-10 05:26:36.703', '2025-08-10 05:56:22.473', 22, '{\"packageName\":\"上岸包\",\"clientIp\":\"112.96.224.119\"}', NULL, '2025-08-10 05:26:22.474', '2025-08-10 05:26:36.704');
INSERT INTO `payment_orders` VALUES (20, 'ORDER17548080754030759', 'RECHARGE_ORDER17548080754030759', 49, 39.90, 400, 900, 'wechat_pay', 'pending', NULL, NULL, NULL, '2025-08-10 07:11:15.403', 21, '{\"packageName\":\"实战包\",\"clientIp\":\"118.78.151.124\"}', NULL, '2025-08-10 06:41:15.403', '2025-08-10 06:41:15.403');

-- ----------------------------
-- Table structure for payment_packages
-- ----------------------------
DROP TABLE IF EXISTS `payment_packages`;
CREATE TABLE `payment_packages`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `amount` decimal(10, 2) NOT NULL,
  `points` int NOT NULL,
  `bonus_points` int NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int NOT NULL DEFAULT 0,
  `icon` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `is_recommended` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `label` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `label_color` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `payment_packages_is_active_idx`(`is_active` ASC) USING BTREE,
  INDEX `payment_packages_sort_order_idx`(`sort_order` ASC) USING BTREE,
  INDEX `payment_packages_is_recommended_idx`(`is_recommended` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 26 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of payment_packages
-- ----------------------------
INSERT INTO `payment_packages` VALUES (20, '体验包', '4折优惠，冲100送150', 9.90, 100, 150, 1, 1, NULL, 0, '2025-07-27 06:16:03.029', '2025-07-31 04:25:26.065', 'best_value', 'blue');
INSERT INTO `payment_packages` VALUES (21, '实战包', '3折优惠，冲400送900', 39.90, 400, 900, 1, 2, NULL, 1, '2025-07-27 06:16:03.029', '2025-07-31 04:28:38.936', 'hot_sale', 'red');
INSERT INTO `payment_packages` VALUES (22, '上岸包', '2折优惠，从1000送4000', 99.90, 1000, 4000, 1, 3, NULL, 0, '2025-07-27 06:16:03.029', '2025-07-31 04:29:12.809', 'limited_time', 'orange');

-- ----------------------------
-- Table structure for point_transactions
-- ----------------------------
DROP TABLE IF EXISTS `point_transactions`;
CREATE TABLE `point_transactions`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `transaction_type` enum('consume','recharge','refund','reward') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int NOT NULL,
  `balance_after` int NOT NULL,
  `model_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `question_type` enum('multiple_choice','programming') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `metadata` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `point_transactions_user_id_fkey`(`user_id` ASC) USING BTREE,
  CONSTRAINT `point_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 469 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of point_transactions
-- ----------------------------
INSERT INTO `point_transactions` VALUES (1, 8, 'recharge', 1000, 1100, NULL, NULL, '充值成功 - 订单ORDER17530050715807489', '{\"orderNo\":\"ORDER17530050715807489\",\"packageId\":null,\"basePoints\":1000,\"bonusPoints\":0,\"transactionId\":\"4200002724202507202351391940\"}', '2025-07-20 09:51:28.279');
INSERT INTO `point_transactions` VALUES (2, 1, 'recharge', 1000, 2000, NULL, NULL, '充值成功 - 订单ORDER17530283904101204', '{\"orderNo\":\"ORDER17530283904101204\",\"packageId\":null,\"basePoints\":1000,\"bonusPoints\":0,\"transactionId\":\"4200002792202507211325209249\"}', '2025-07-20 16:21:15.605');
INSERT INTO `point_transactions` VALUES (3, 9, 'consume', -4, 92, 'claude-3-5-sonnet-20241022', 'programming', '搜题操作 [prog_b29e9496-a2ef-4461-9652-12fdd01bdfbf]: 使用claude-3-5-sonnet-20241022模型处理编程题', NULL, '2025-07-22 04:22:24.450');
INSERT INTO `point_transactions` VALUES (4, 9, 'consume', -4, 84, 'claude-3-5-sonnet-20241022', 'programming', '搜题操作 [prog_de785a83-b511-4c5f-96e3-b14682d2ebf0]: 使用claude-3-5-sonnet-20241022模型处理编程题', NULL, '2025-07-22 04:27:09.341');
INSERT INTO `point_transactions` VALUES (5, 9, 'consume', -4, 76, 'claude-3-5-sonnet-20241022', 'programming', '搜题操作 [prog_79e204bb-ded6-4b57-8443-7d00396bd958]: 使用claude-3-5-sonnet-20241022模型处理编程题', NULL, '2025-07-22 04:45:03.188');
INSERT INTO `point_transactions` VALUES (6, 9, 'consume', -4, 68, 'claude-3-5-sonnet-20241022', 'programming', '搜题操作 [prog_8168b31a-fcdb-4109-99f0-d960f84712a2]: 使用claude-3-5-sonnet-20241022模型处理编程题', NULL, '2025-07-22 05:03:43.234');
INSERT INTO `point_transactions` VALUES (7, 9, 'consume', -4, 60, 'claude-3-5-sonnet-20241022', 'programming', '搜题操作 [prog_5edc3663-27c3-44c4-979e-98d874004371]: 使用claude-3-5-sonnet-20241022模型处理编程题', NULL, '2025-07-22 05:32:06.429');
INSERT INTO `point_transactions` VALUES (8, 9, 'consume', -4, 52, 'claude-3-5-sonnet-20241022', 'programming', '搜题操作 [prog_e8e9f493-50c4-440b-ae55-8ab2bf41e5b4]: 使用claude-3-5-sonnet-20241022模型处理编程题', NULL, '2025-07-22 05:34:44.175');
INSERT INTO `point_transactions` VALUES (9, 9, 'consume', -2, 30, 'claude-3-5-sonnet-20241022', 'multiple_choice', '搜题操作 [mcq_f7e86be6-4971-4ab3-b62b-f4bb92dfd670]: 使用claude-3-5-sonnet-20241022模型处理选择题', NULL, '2025-07-23 11:09:04.545');
INSERT INTO `point_transactions` VALUES (10, 9, 'consume', -2, 22, 'claude-3-5-sonnet-20241022', 'multiple_choice', '搜题操作 [mcq_0bc102ed-655b-4959-900e-e8a46cdcfcd8]: 使用claude-3-5-sonnet-20241022模型处理选择题', NULL, '2025-07-23 11:25:16.931');
INSERT INTO `point_transactions` VALUES (11, 9, 'consume', -2, 18, 'claude-3-5-sonnet-20241022', 'multiple_choice', '搜题操作 [mcq_92a6919c-c135-44a9-8506-0ebf5ba02c58]: 使用claude-3-5-sonnet-20241022模型处理选择题', NULL, '2025-07-23 11:26:35.961');
INSERT INTO `point_transactions` VALUES (12, 9, 'consume', -2, 14, 'claude-3-5-sonnet-20241022', 'multiple_choice', '搜题操作 [mcq_c4629c2a-051b-473f-ba86-8e622be73e70]: 使用claude-3-5-sonnet-20241022模型处理选择题', NULL, '2025-07-23 11:27:34.965');
INSERT INTO `point_transactions` VALUES (13, 9, 'consume', -2, 10, 'claude-3-5-sonnet-20241022', 'multiple_choice', '搜题操作 [mcq_750b89a9-35e4-4850-99fd-f2fa80314404]: 使用claude-3-5-sonnet-20241022模型处理选择题', NULL, '2025-07-23 11:30:50.053');
INSERT INTO `point_transactions` VALUES (14, 9, 'consume', -2, 6, 'claude-3-5-sonnet-20241022', 'multiple_choice', '搜题操作 [mcq_ecbdd71c-b892-4d0f-909f-552cec7f1114]: 使用claude-3-5-sonnet-20241022模型处理选择题', NULL, '2025-07-23 11:32:41.812');
INSERT INTO `point_transactions` VALUES (15, 8, 'consume', -10, 1080, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [prog_0327e7d3-fd41-416d-9061-2a9e43c896d6]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-07-24 16:52:39.513');
INSERT INTO `point_transactions` VALUES (16, 8, 'consume', -10, 1060, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [prog_8f321e1b-bcb5-4f1e-a6f7-e2af7416a2e3]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-07-24 16:53:24.371');
INSERT INTO `point_transactions` VALUES (17, 8, 'consume', -10, 1040, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [prog_4096a83e-5df7-49f2-9710-14335c22495c]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-07-24 17:02:59.868');
INSERT INTO `point_transactions` VALUES (18, 8, 'consume', -10, 1020, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [prog_ed48d291-dedb-40e7-b277-8131944c15f7]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-07-24 17:10:14.845');
INSERT INTO `point_transactions` VALUES (19, 9, 'recharge', 1000, 1006, NULL, NULL, '充值成功 - 订单ORDER17535441801496487', '{\"orderNo\":\"ORDER17535441801496487\",\"packageId\":null,\"basePoints\":1000,\"bonusPoints\":0,\"transactionId\":\"4200002782202507263484924444\"}', '2025-07-26 15:36:30.483');
INSERT INTO `point_transactions` VALUES (20, 9, 'consume', -2, 932, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_5dc950f6-20fc-4f96-afea-2d8a95e81cc1]: 使用gpt-4o模型处理选择题', NULL, '2025-07-26 16:07:52.600');
INSERT INTO `point_transactions` VALUES (21, 9, 'consume', -2, 908, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_ce086b95-43a4-4c7b-bf8f-8ee59495b6e3]: 使用gpt-4o模型处理选择题', NULL, '2025-07-26 16:22:52.875');
INSERT INTO `point_transactions` VALUES (22, 9, 'consume', -2, 904, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_07026520-eabf-4b92-bb2a-f74b931c32c5]: 使用gpt-4o模型处理选择题', NULL, '2025-07-26 16:24:12.065');
INSERT INTO `point_transactions` VALUES (23, 9, 'consume', -2, 900, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_937b569e-4794-400c-be8a-149b4a537d3d]: 使用gpt-4o模型处理选择题', NULL, '2025-07-26 16:25:07.973');
INSERT INTO `point_transactions` VALUES (24, 9, 'consume', -2, 896, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_e98d9ad4-ce5f-4bfa-aeff-f7650cd965f0]: 使用gpt-4o模型处理选择题', NULL, '2025-07-26 16:27:34.852');
INSERT INTO `point_transactions` VALUES (25, 9, 'consume', -2, 892, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_a6677125-75c5-4f09-acc7-7b671c2e6656]: 使用gpt-4o模型处理选择题', NULL, '2025-07-26 16:28:58.911');
INSERT INTO `point_transactions` VALUES (26, 9, 'consume', -2, 888, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_5e65bdd4-3cc4-4b46-83a0-5e214590a9a6]: 使用gpt-4o模型处理选择题', NULL, '2025-07-26 16:30:33.007');
INSERT INTO `point_transactions` VALUES (27, 9, 'recharge', 1000, 1858, NULL, NULL, '充值成功 - 订单ORDER17535509056355969', '{\"orderNo\":\"ORDER17535509056355969\",\"packageId\":null,\"basePoints\":1000,\"bonusPoints\":0,\"transactionId\":\"4200002744202507271874686826\"}', '2025-07-26 17:28:47.965');
INSERT INTO `point_transactions` VALUES (28, 9, 'recharge', 110, 1968, NULL, NULL, '充值成功 - 订单ORDER17535514599960249', '{\"orderNo\":\"ORDER17535514599960249\",\"packageId\":1,\"basePoints\":100,\"bonusPoints\":10,\"transactionId\":\"4200002744202507270237461561\"}', '2025-07-26 17:37:53.458');
INSERT INTO `point_transactions` VALUES (29, 8, 'recharge', 1000, 1930, NULL, NULL, '充值成功 - 订单ORDER17535959005808494', '{\"orderNo\":\"ORDER17535959005808494\",\"packageId\":null,\"basePoints\":1000,\"bonusPoints\":0,\"transactionId\":\"4200002777202507273378547419\"}', '2025-07-27 05:58:33.666');
INSERT INTO `point_transactions` VALUES (30, 8, 'recharge', 1000, 2930, NULL, NULL, '充值成功 - 订单ORDER17535960904316868', '{\"orderNo\":\"ORDER17535960904316868\",\"packageId\":null,\"basePoints\":1000,\"bonusPoints\":0,\"transactionId\":\"4200002775202507276606676418\"}', '2025-07-27 06:01:43.507');
INSERT INTO `point_transactions` VALUES (31, 8, 'reward', 10, 2940, NULL, NULL, '管理员增加积分', NULL, '2025-07-27 19:06:17.554');
INSERT INTO `point_transactions` VALUES (32, 12, 'reward', 10, 110, NULL, NULL, '测试', NULL, '2025-07-28 09:58:52.976');
INSERT INTO `point_transactions` VALUES (33, 9, 'reward', 100, 2068, NULL, NULL, '测试', NULL, '2025-07-28 10:00:11.339');
INSERT INTO `point_transactions` VALUES (34, 9, 'reward', 1000, 3068, NULL, NULL, '测试', NULL, '2025-07-28 10:00:53.523');
INSERT INTO `point_transactions` VALUES (35, 9, 'reward', 1000, 4068, NULL, NULL, '管理员增加积分', NULL, '2025-07-28 12:50:18.162');
INSERT INTO `point_transactions` VALUES (36, 8, 'consume', -12, 1738, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754234545231_jeo7r69dl]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-03 15:22:40.156');
INSERT INTO `point_transactions` VALUES (37, 8, 'consume', -8, 1730, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754234720031_h805h2sif]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-03 15:25:20.816');
INSERT INTO `point_transactions` VALUES (38, 9, 'consume', -12, 3996, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754315264919_1nj8zusn9]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-04 13:47:54.394');
INSERT INTO `point_transactions` VALUES (39, 9, 'consume', -12, 3984, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754315547449_pm4o4cruv]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-04 13:52:37.092');
INSERT INTO `point_transactions` VALUES (40, 9, 'consume', -40, 3944, 'o4-mini-all', 'programming', '搜题操作 [ai_call_1754316294390_2mhvd0ghv]: 使用o4-mini-all模型处理编程题', NULL, '2025-08-04 14:05:02.936');
INSERT INTO `point_transactions` VALUES (41, 9, 'consume', -250, 3694, 'o4-mini-high-all', 'programming', '搜题操作 [ai_call_1754316780702_ukgyjyf4s]: 使用o4-mini-high-all模型处理编程题', NULL, '2025-08-04 14:13:07.819');
INSERT INTO `point_transactions` VALUES (42, 9, 'consume', -40, 3654, 'gemini-2.5-pro-exp-03-25', 'programming', '搜题操作 [ai_call_1754317335462_jwmnqjhx8]: 使用gemini-2.5-pro-exp-03-25模型处理编程题', NULL, '2025-08-04 14:22:24.131');
INSERT INTO `point_transactions` VALUES (43, 9, 'consume', -12, 3642, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754318609873_edtvcbemm]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-04 14:43:38.252');
INSERT INTO `point_transactions` VALUES (44, 9, 'consume', -12, 3630, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754319509276_3ew3l2lvl]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-04 14:58:38.871');
INSERT INTO `point_transactions` VALUES (45, 9, 'consume', -8, 3622, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754320428713_3jh193l32]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-04 15:13:58.251');
INSERT INTO `point_transactions` VALUES (46, 8, 'consume', -12, 1718, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754320569488_zzxp8cvt1]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-04 15:16:17.405');
INSERT INTO `point_transactions` VALUES (47, 9, 'consume', -8, 3614, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754320979164_w0tk1mmil]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-04 15:23:09.398');
INSERT INTO `point_transactions` VALUES (48, 9, 'consume', -8, 3606, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_7a3475bf-a396-4dc6-ab14-971de75a376c]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-04 15:23:28.481');
INSERT INTO `point_transactions` VALUES (49, 9, 'consume', -8, 3598, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754321038776_efvtov167]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-04 15:24:09.227');
INSERT INTO `point_transactions` VALUES (50, 9, 'consume', -8, 3590, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_a7607014-cd6d-4b6d-848b-694b04e0d3e1]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-04 15:24:25.489');
INSERT INTO `point_transactions` VALUES (51, 9, 'consume', -8, 3582, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754321169063_pfzou2hoa]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-04 15:26:17.175');
INSERT INTO `point_transactions` VALUES (52, 9, 'consume', -8, 3574, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_7304f2ff-a7bb-4258-927d-5cc338941492]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-04 15:26:23.269');
INSERT INTO `point_transactions` VALUES (53, 9, 'consume', -6, 3568, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754321214101_qhnms3rcg]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:27:01.166');
INSERT INTO `point_transactions` VALUES (54, 9, 'consume', -6, 3562, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_0409c48d-fb81-483c-8965-34d9dbd76251]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:27:08.420');
INSERT INTO `point_transactions` VALUES (55, 9, 'consume', -6, 3556, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754321302077_xvcrdky86]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:28:30.305');
INSERT INTO `point_transactions` VALUES (56, 8, 'consume', -8, 1710, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754321380837_p2d7pnddh]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-04 15:29:50.899');
INSERT INTO `point_transactions` VALUES (57, 8, 'consume', -8, 1702, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_fd7d99c8-2fb8-44e1-981f-21455be5e335]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-04 15:29:59.112');
INSERT INTO `point_transactions` VALUES (58, 9, 'consume', -6, 3550, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_df6bfe8f-0fd5-471e-b761-673847c45a96]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:32:24.089');
INSERT INTO `point_transactions` VALUES (59, 9, 'consume', -6, 3544, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754321629914_np84ufr8l]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:33:56.698');
INSERT INTO `point_transactions` VALUES (60, 9, 'consume', -6, 3538, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_c56fc0f5-5757-4e0f-8d9a-3fe41f841886]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:34:12.286');
INSERT INTO `point_transactions` VALUES (61, 9, 'consume', -6, 3532, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754321711998_hnv5cjjcu]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:35:20.654');
INSERT INTO `point_transactions` VALUES (62, 9, 'consume', -6, 3526, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_6005a74f-7c5c-4ee7-9cec-3209c75ac6f0]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:35:32.651');
INSERT INTO `point_transactions` VALUES (63, 9, 'consume', -6, 3520, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754321774624_epl3j7eyz]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:36:22.121');
INSERT INTO `point_transactions` VALUES (64, 9, 'consume', -6, 3514, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_409454ab-fab7-46f9-9b94-7258511586ba]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:36:36.471');
INSERT INTO `point_transactions` VALUES (65, 9, 'consume', -6, 3508, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754321834741_m9r9w3sob]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:37:14.590');
INSERT INTO `point_transactions` VALUES (66, 9, 'consume', -6, 3502, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754321871307_x9ghdqlv1]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:37:51.150');
INSERT INTO `point_transactions` VALUES (67, 9, 'consume', -6, 3496, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754321927924_233sqnivg]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:38:47.784');
INSERT INTO `point_transactions` VALUES (68, 9, 'consume', -6, 3490, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754321994116_jd3zm57ez]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:39:54.241');
INSERT INTO `point_transactions` VALUES (69, 9, 'consume', -6, 3484, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754322054397_ulx9h0qjz]: 使用gpt-4o模型处理选择题', NULL, '2025-08-04 15:40:54.240');
INSERT INTO `point_transactions` VALUES (70, 9, 'consume', -5, 3479, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754322724337_nkzg8qf5w]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 15:52:11.527');
INSERT INTO `point_transactions` VALUES (71, 9, 'consume', -5, 3474, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_5053106b-e71c-4d71-a413-27ae7574f309]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 15:52:22.418');
INSERT INTO `point_transactions` VALUES (72, 9, 'consume', -5, 3469, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754322917513_9ajqxoy0q]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 15:55:27.297');
INSERT INTO `point_transactions` VALUES (73, 9, 'consume', -5, 3464, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_a9b629f2-4bd6-4b00-874e-64722f722e87]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 15:55:37.023');
INSERT INTO `point_transactions` VALUES (74, 9, 'consume', -5, 3459, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754323122122_3ty8oquyc]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 15:58:54.223');
INSERT INTO `point_transactions` VALUES (75, 9, 'consume', -5, 3454, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_e33696c1-540f-4784-9467-081c8b60acec]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 15:59:09.209');
INSERT INTO `point_transactions` VALUES (76, 9, 'consume', -5, 3449, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754323414832_03nz0luaw]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:03:41.641');
INSERT INTO `point_transactions` VALUES (77, 9, 'consume', -5, 3444, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_419866ae-2d88-41ca-86d9-9401efe667e1]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:03:59.799');
INSERT INTO `point_transactions` VALUES (78, 9, 'consume', -5, 3439, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754323525669_o8c7w2njb]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:05:34.255');
INSERT INTO `point_transactions` VALUES (79, 9, 'consume', -5, 3434, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_a1b2af35-dd5f-49a8-85ed-099d638d806b]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:05:43.928');
INSERT INTO `point_transactions` VALUES (80, 9, 'consume', -5, 3429, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754323636974_w95hep0c9]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:07:30.893');
INSERT INTO `point_transactions` VALUES (81, 9, 'consume', -5, 3424, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_74173955-3e1e-4052-9c7e-d228b23cbbe4]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:07:44.416');
INSERT INTO `point_transactions` VALUES (82, 9, 'consume', -5, 3419, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754323814532_rudenizhr]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:10:14.358');
INSERT INTO `point_transactions` VALUES (83, 9, 'consume', -5, 3414, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754323892578_xj66hgz77]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:11:32.395');
INSERT INTO `point_transactions` VALUES (84, 9, 'consume', -5, 3409, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754323950341_l2irj5suv]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:12:37.727');
INSERT INTO `point_transactions` VALUES (85, 9, 'consume', -5, 3404, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_d76abc58-62f5-4a5d-aba4-3600e42f06f1]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:12:57.242');
INSERT INTO `point_transactions` VALUES (86, 9, 'consume', -5, 3399, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754324037865_hd0bk6z2x]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:13:57.671');
INSERT INTO `point_transactions` VALUES (87, 9, 'consume', -5, 3394, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754324160039_m9c74f1xc]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:16:07.502');
INSERT INTO `point_transactions` VALUES (88, 9, 'consume', -5, 3389, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_c4c0660b-1bcd-44ac-a537-10b2cee6f0d6]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:16:21.921');
INSERT INTO `point_transactions` VALUES (89, 9, 'consume', -5, 3384, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754324277804_4ldvqh1ps]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:17:57.622');
INSERT INTO `point_transactions` VALUES (90, 9, 'consume', -5, 3379, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754324382640_50jdy70gz]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:19:49.352');
INSERT INTO `point_transactions` VALUES (91, 9, 'consume', -5, 3374, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_a4a6306a-cf8e-492a-9c9b-7943fe0c29f2]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:19:58.444');
INSERT INTO `point_transactions` VALUES (92, 9, 'consume', -5, 3369, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754324468876_qomgdpblj]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:21:08.658');
INSERT INTO `point_transactions` VALUES (93, 9, 'consume', -5, 3364, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754324535708_gpj0ye0h0]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-04 16:22:15.498');
INSERT INTO `point_transactions` VALUES (94, 8, 'consume', -12, 1690, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754410299665_rcaqfszwf]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-05 16:11:51.717');
INSERT INTO `point_transactions` VALUES (95, 8, 'consume', -12, 1678, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754410975176_dkyaalxuv]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-05 16:23:04.487');
INSERT INTO `point_transactions` VALUES (96, 8, 'consume', -12, 1666, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754411386089_0nf5tzbjs]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-05 16:29:56.434');
INSERT INTO `point_transactions` VALUES (97, 8, 'consume', -12, 1654, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754411604988_4ucmot78n]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-05 16:33:35.956');
INSERT INTO `point_transactions` VALUES (98, 8, 'consume', -12, 1642, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754411780335_wkbzia8mt]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-05 16:36:27.216');
INSERT INTO `point_transactions` VALUES (99, 8, 'consume', -8, 1634, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754411944903_80cl65mss]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-05 16:39:16.159');
INSERT INTO `point_transactions` VALUES (100, 8, 'consume', -8, 1626, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_e727de09-888f-4258-a3db-7ba311adfa0e]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-05 16:39:27.537');
INSERT INTO `point_transactions` VALUES (101, 8, 'consume', -6, 1620, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754412000348_puixk743e]: 使用gpt-4o模型处理选择题', NULL, '2025-08-05 16:40:06.436');
INSERT INTO `point_transactions` VALUES (102, 8, 'consume', -6, 1614, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_c43ce3d5-6cb3-4172-bfb2-0d99ca398932]: 使用gpt-4o模型处理选择题', NULL, '2025-08-05 16:40:16.568');
INSERT INTO `point_transactions` VALUES (103, 8, 'consume', -8, 1606, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754412054336_agmefdy06]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-05 16:41:01.144');
INSERT INTO `point_transactions` VALUES (104, 8, 'consume', -8, 1598, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_56655e3d-b7d9-4e98-87df-5a5ca61e7710]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-05 16:41:11.832');
INSERT INTO `point_transactions` VALUES (105, 8, 'consume', -8, 1590, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754412112125_y7clhn6f0]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-05 16:41:46.787');
INSERT INTO `point_transactions` VALUES (106, 8, 'consume', -8, 1582, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754412295572_lhkbb6hhq]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-05 16:45:06.182');
INSERT INTO `point_transactions` VALUES (107, 8, 'consume', -8, 1574, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_bcb1ab7b-f947-4d31-a5fe-4242672f0db8]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-05 16:45:16.095');
INSERT INTO `point_transactions` VALUES (108, 8, 'consume', -8, 1566, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754412342377_6mob5cld3]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-05 16:46:04.651');
INSERT INTO `point_transactions` VALUES (109, 8, 'consume', -8, 1558, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_5ee1e6b2-5fe7-4404-b1d6-782143d2b98e]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-05 16:46:16.317');
INSERT INTO `point_transactions` VALUES (110, 8, 'consume', -6, 1552, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754412410246_n06btt3b4]: 使用gpt-4o模型处理选择题', NULL, '2025-08-05 16:46:56.966');
INSERT INTO `point_transactions` VALUES (111, 8, 'consume', -6, 1546, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_f554f0a1-d317-4379-8527-2b0d113b0334]: 使用gpt-4o模型处理选择题', NULL, '2025-08-05 16:47:05.767');
INSERT INTO `point_transactions` VALUES (112, 8, 'consume', -12, 1534, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754414702439_hpbbzj4zz]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-05 17:26:48.415');
INSERT INTO `point_transactions` VALUES (113, 8, 'consume', -8, 1526, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754415420490_hqvtlrycf]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-05 17:37:07.404');
INSERT INTO `point_transactions` VALUES (114, 8, 'consume', -8, 1518, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_03b89346-1c8d-4aaa-bead-e48970ced038]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-05 17:37:17.974');
INSERT INTO `point_transactions` VALUES (115, 8, 'consume', -12, 1506, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754491421633_dwk4hm45r]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-06 14:43:49.621');
INSERT INTO `point_transactions` VALUES (116, 8, 'consume', -12, 1494, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754491767787_v8zicz5md]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-06 14:50:13.433');
INSERT INTO `point_transactions` VALUES (117, 8, 'consume', -12, 1482, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754492004869_q4lub3kjj]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-06 14:53:29.108');
INSERT INTO `point_transactions` VALUES (118, 8, 'consume', -12, 1470, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754492213882_8jihbtn8e]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-06 14:56:54.926');
INSERT INTO `point_transactions` VALUES (119, 8, 'consume', -12, 1458, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754492593597_xetd0mhr4]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-06 15:03:13.110');
INSERT INTO `point_transactions` VALUES (120, 8, 'consume', -12, 1446, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754492778827_7m72y9fwk]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-06 15:06:32.661');
INSERT INTO `point_transactions` VALUES (121, 8, 'consume', -12, 1434, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754492991355_0r0bm9v9l]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-06 15:09:51.945');
INSERT INTO `point_transactions` VALUES (122, 8, 'consume', -12, 1422, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754493193593_rkbavxk82]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-06 15:13:14.388');
INSERT INTO `point_transactions` VALUES (123, 8, 'consume', -12, 1410, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754493509116_japw2ffau]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-06 15:18:27.528');
INSERT INTO `point_transactions` VALUES (124, 8, 'consume', -12, 1398, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754493790297_08i22e9by]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-06 15:23:14.867');
INSERT INTO `point_transactions` VALUES (125, 9, 'consume', -8, 3356, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754546985819_19z5ls2nv]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-07 06:12:10.417');
INSERT INTO `point_transactions` VALUES (126, 9, 'consume', -8, 3348, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754547396421_p646erwkm]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-07 06:16:47.927');
INSERT INTO `point_transactions` VALUES (127, 9, 'consume', -8, 3340, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754547570336_gi6rmengs]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-07 06:19:38.373');
INSERT INTO `point_transactions` VALUES (128, 9, 'consume', -8, 3332, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754547676516_cnb92l1pp]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-07 06:21:25.477');
INSERT INTO `point_transactions` VALUES (129, 9, 'consume', -12, 3320, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754548140451_v8x5xoiwc]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-07 06:29:12.172');
INSERT INTO `point_transactions` VALUES (130, 8, 'reward', 110, 1508, NULL, NULL, '管理员增加积分', NULL, '2025-08-07 08:20:19.699');
INSERT INTO `point_transactions` VALUES (131, 8, 'consume', -12, 1496, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754583657311_t3tfzj0al]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-07 16:20:51.916');
INSERT INTO `point_transactions` VALUES (132, 8, 'consume', -12, 1484, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754584006502_euf3jvu3m]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-07 16:26:42.284');
INSERT INTO `point_transactions` VALUES (133, 9, 'consume', -8, 3312, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754585435079_ic57nisrq]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 16:50:41.620');
INSERT INTO `point_transactions` VALUES (134, 9, 'consume', -8, 3304, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_774d9d27-9b87-425c-b6f8-c87ff1af90d0]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 16:50:50.775');
INSERT INTO `point_transactions` VALUES (135, 9, 'consume', -8, 3296, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754585518187_vigcoxy4r]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 16:52:04.344');
INSERT INTO `point_transactions` VALUES (136, 9, 'consume', -8, 3288, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_39db1786-8591-4864-b0e6-f86a9c6f24ce]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 16:52:17.222');
INSERT INTO `point_transactions` VALUES (137, 9, 'consume', -8, 3280, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754585595935_qyl945va0]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 16:53:23.276');
INSERT INTO `point_transactions` VALUES (138, 9, 'consume', -8, 3272, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_223035d9-bb7e-40df-a4a0-9a47d3e1e6f2]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 16:53:33.171');
INSERT INTO `point_transactions` VALUES (139, 9, 'consume', -8, 3264, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754585646970_re3dox885]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 16:54:14.280');
INSERT INTO `point_transactions` VALUES (140, 9, 'consume', -8, 3256, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_24fb5857-0d39-417b-ad25-ef9daeeda8e7]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 16:54:24.000');
INSERT INTO `point_transactions` VALUES (141, 9, 'consume', -8, 3248, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754585843279_dpnfvio69]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 16:57:31.210');
INSERT INTO `point_transactions` VALUES (142, 9, 'consume', -8, 3240, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_897c2da7-e40d-4966-858b-5f3ac5928adf]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 16:57:42.642');
INSERT INTO `point_transactions` VALUES (143, 9, 'consume', -8, 3232, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754585914509_dtpk38opy]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 16:58:41.271');
INSERT INTO `point_transactions` VALUES (144, 9, 'consume', -8, 3224, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_6b24572c-90ea-4b23-96e6-8b358efc4533]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 16:58:50.785');
INSERT INTO `point_transactions` VALUES (145, 9, 'consume', -8, 3216, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754586109900_xbvl7mscs]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:01:56.243');
INSERT INTO `point_transactions` VALUES (146, 9, 'consume', -8, 3208, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_b6c704ac-7a15-48e9-b198-6c74924b8d87]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:02:03.470');
INSERT INTO `point_transactions` VALUES (147, 9, 'consume', -8, 3200, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754586289555_td2hc9cxr]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:04:56.811');
INSERT INTO `point_transactions` VALUES (148, 9, 'consume', -8, 3192, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_ac6f020f-eada-430c-8c2e-505ab4cbba52]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:05:07.012');
INSERT INTO `point_transactions` VALUES (149, 9, 'consume', -8, 3184, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754586374292_6qbvwhu26]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:06:23.022');
INSERT INTO `point_transactions` VALUES (150, 9, 'consume', -8, 3176, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_00068dca-2555-4e70-af71-278621f33868]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:06:40.585');
INSERT INTO `point_transactions` VALUES (151, 9, 'consume', -8, 3168, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754586457337_1i7lxspa9]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:07:36.942');
INSERT INTO `point_transactions` VALUES (152, 9, 'consume', -8, 3160, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754586663070_tcv1ehff9]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:11:02.746');
INSERT INTO `point_transactions` VALUES (153, 9, 'consume', -8, 3152, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754586787656_v8ftad8te]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:13:07.237');
INSERT INTO `point_transactions` VALUES (154, 9, 'consume', -8, 3144, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754586870142_i679k7t6j]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:14:29.735');
INSERT INTO `point_transactions` VALUES (155, 9, 'consume', -8, 3136, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754586907603_1d8blib9i]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:15:07.214');
INSERT INTO `point_transactions` VALUES (156, 9, 'consume', -8, 3128, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754586961985_uvcr61kw4]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:16:01.642');
INSERT INTO `point_transactions` VALUES (157, 9, 'consume', -8, 3120, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754587079750_928g23es6]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:17:59.364');
INSERT INTO `point_transactions` VALUES (158, 9, 'consume', -8, 3112, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_multiple_choice_1754587131266_g6ffgsg70]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:18:50.898');
INSERT INTO `point_transactions` VALUES (159, 9, 'consume', -8, 3104, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754587462245_b1x6og7yx]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:24:28.975');
INSERT INTO `point_transactions` VALUES (160, 9, 'consume', -8, 3096, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_7931ab41-f0f3-4527-aa79-3d1266ba48f5]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:24:38.666');
INSERT INTO `point_transactions` VALUES (161, 9, 'consume', -8, 3088, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754587501655_zez8ledft]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:25:09.386');
INSERT INTO `point_transactions` VALUES (162, 9, 'consume', -8, 3080, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_4024a4a0-8bc6-42b9-a144-fbd4a6e41bb9]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:25:19.219');
INSERT INTO `point_transactions` VALUES (163, 9, 'consume', -8, 3072, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754587635603_60u6s94kj]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:27:25.631');
INSERT INTO `point_transactions` VALUES (164, 9, 'consume', -8, 3064, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_45d6d996-aab2-4c76-9fca-17488d5fa1d5]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:27:37.652');
INSERT INTO `point_transactions` VALUES (165, 9, 'consume', -8, 3056, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754587698904_ojrj6ao3c]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:28:26.105');
INSERT INTO `point_transactions` VALUES (166, 9, 'consume', -8, 3048, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_b1d51292-7f43-4e5d-95f4-6bd92f5c0854]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:28:36.868');
INSERT INTO `point_transactions` VALUES (167, 9, 'consume', -8, 3040, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754587755649_1z3r281ix]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:29:24.052');
INSERT INTO `point_transactions` VALUES (168, 9, 'consume', -8, 3032, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_d12ded8e-9e95-422b-aa75-582423ca31a6]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:29:43.205');
INSERT INTO `point_transactions` VALUES (169, 9, 'consume', -6, 3026, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754587905837_yckfvcwcb]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:31:55.510');
INSERT INTO `point_transactions` VALUES (170, 9, 'consume', -6, 3020, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_e3370226-1653-4231-866d-03f50aebc802]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:32:10.810');
INSERT INTO `point_transactions` VALUES (171, 9, 'consume', -6, 3014, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754588007894_88ix5cper]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:33:34.798');
INSERT INTO `point_transactions` VALUES (172, 9, 'consume', -6, 3008, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_dd4089a5-e39c-4f87-bcba-b9b77c63a949]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:33:46.265');
INSERT INTO `point_transactions` VALUES (173, 9, 'consume', -6, 3002, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754588049048_7r4mesbkr]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:34:15.606');
INSERT INTO `point_transactions` VALUES (174, 9, 'consume', -6, 2996, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_f33931ba-f55d-4fda-8c45-e92a89883690]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:34:26.549');
INSERT INTO `point_transactions` VALUES (175, 9, 'consume', -6, 2990, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754588094357_7yc147p29]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:35:00.654');
INSERT INTO `point_transactions` VALUES (176, 9, 'consume', -6, 2984, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_6ec30644-90d5-41c0-b0ab-68b8347c06f2]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:35:13.250');
INSERT INTO `point_transactions` VALUES (177, 9, 'consume', -6, 2978, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754588161355_35olvy0hm]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:36:07.762');
INSERT INTO `point_transactions` VALUES (178, 9, 'consume', -6, 2972, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_1dd8cd52-29ad-4b5a-9211-f273f14ec759]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:36:21.409');
INSERT INTO `point_transactions` VALUES (179, 9, 'consume', -3, 2969, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754588370080_mudfsioxi]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-07 17:39:37.894');
INSERT INTO `point_transactions` VALUES (180, 9, 'consume', -3, 2966, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_d62d548a-f96f-4ce8-8810-4cf44fe3e224]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-07 17:39:46.640');
INSERT INTO `point_transactions` VALUES (181, 9, 'consume', -3, 2963, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754588441266_qf6krcy6r]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-07 17:40:48.558');
INSERT INTO `point_transactions` VALUES (182, 9, 'consume', -3, 2960, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_0aaf49ff-f4f5-48c5-99ba-ca6ac857286f]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-07 17:40:59.455');
INSERT INTO `point_transactions` VALUES (183, 9, 'consume', -3, 2957, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754588482298_46tji9zfr]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-07 17:41:29.052');
INSERT INTO `point_transactions` VALUES (184, 9, 'consume', -3, 2954, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_1c9d05c9-4f67-4af7-a793-faf12695b8aa]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-07 17:41:41.024');
INSERT INTO `point_transactions` VALUES (185, 9, 'consume', -3, 2951, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754588526329_rc5s936y7]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-07 17:42:13.201');
INSERT INTO `point_transactions` VALUES (186, 9, 'consume', -3, 2948, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_c5721dc9-7584-417b-a8bd-92b8311ae0a9]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-07 17:42:20.272');
INSERT INTO `point_transactions` VALUES (187, 9, 'consume', -3, 2945, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754588573286_jg8tja86t]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-07 17:43:01.324');
INSERT INTO `point_transactions` VALUES (188, 9, 'consume', -3, 2942, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_a078f25c-0c0c-4b4d-beb5-27b6edb522b6]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-07 17:43:13.821');
INSERT INTO `point_transactions` VALUES (189, 9, 'consume', -8, 2934, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754588636165_9jh6ah3ik]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:44:01.942');
INSERT INTO `point_transactions` VALUES (190, 9, 'consume', -8, 2926, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_3f0dac30-3a97-4efb-a8c5-9b0d70941477]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 17:44:15.382');
INSERT INTO `point_transactions` VALUES (191, 9, 'consume', -8, 2918, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754588715229_08b4dmgz0]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-07 17:45:22.774');
INSERT INTO `point_transactions` VALUES (192, 9, 'consume', -8, 2910, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_eadbc5f6-0401-4120-b5c8-87da03a8ece4]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-07 17:45:37.827');
INSERT INTO `point_transactions` VALUES (193, 9, 'consume', -8, 2902, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754588986885_falkbvnly]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-07 17:49:55.940');
INSERT INTO `point_transactions` VALUES (194, 9, 'consume', -8, 2894, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_f3dbd277-e07d-410e-a11a-7752be8feda3]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-07 17:50:03.605');
INSERT INTO `point_transactions` VALUES (195, 9, 'consume', -8, 2886, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754589072666_5tv3o0i4p]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-07 17:51:18.906');
INSERT INTO `point_transactions` VALUES (196, 9, 'consume', -8, 2878, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_70d5bc6b-5458-4083-bc17-9b697e898a45]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-07 17:51:28.187');
INSERT INTO `point_transactions` VALUES (197, 9, 'consume', -6, 2872, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754589267440_nte12ki6s]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:54:36.546');
INSERT INTO `point_transactions` VALUES (198, 9, 'consume', -6, 2866, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_eed208c0-e8a2-4a4b-849c-90d8c48baabe]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:54:45.116');
INSERT INTO `point_transactions` VALUES (199, 9, 'consume', -6, 2860, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754589394850_aoi5qhii8]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:56:41.858');
INSERT INTO `point_transactions` VALUES (200, 9, 'consume', -6, 2854, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_e1c2c79f-a1bb-4de3-90fc-8e12ae1cd8dc]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:56:55.329');
INSERT INTO `point_transactions` VALUES (201, 9, 'consume', -6, 2848, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754589499938_ymd6lfvxl]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:58:27.718');
INSERT INTO `point_transactions` VALUES (202, 9, 'consume', -6, 2842, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_76eeb9ad-c2d0-45aa-9af2-dac44d07bd85]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:58:35.093');
INSERT INTO `point_transactions` VALUES (203, 9, 'consume', -6, 2836, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754589553099_kth46dx49]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:59:20.425');
INSERT INTO `point_transactions` VALUES (204, 9, 'consume', -6, 2830, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_8915985b-362f-4dbe-a54f-a69bb035e446]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 17:59:31.308');
INSERT INTO `point_transactions` VALUES (205, 9, 'consume', -6, 2824, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754589616371_fx2o9d370]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:00:22.335');
INSERT INTO `point_transactions` VALUES (206, 9, 'consume', -6, 2818, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_d6f9a798-5e9e-4a12-b4bb-3bfa941d0ae8]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:00:28.950');
INSERT INTO `point_transactions` VALUES (207, 9, 'consume', -6, 2812, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754589777118_q0qlpicfk]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:03:04.671');
INSERT INTO `point_transactions` VALUES (208, 9, 'consume', -6, 2806, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_1f17b7c1-a7a8-4ffe-97b4-676703323b76]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:03:13.245');
INSERT INTO `point_transactions` VALUES (209, 9, 'consume', -6, 2800, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754589822920_63qmiu83i]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:03:49.995');
INSERT INTO `point_transactions` VALUES (210, 9, 'consume', -6, 2794, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_a560480a-3343-42b8-b9ca-a3498373ee71]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:03:56.471');
INSERT INTO `point_transactions` VALUES (211, 9, 'consume', -6, 2788, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754589884000_7na3d8bj6]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:04:50.646');
INSERT INTO `point_transactions` VALUES (212, 9, 'consume', -6, 2782, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_168e813f-c1b7-4df0-b99c-64cac1fdc2ff]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:04:59.406');
INSERT INTO `point_transactions` VALUES (213, 9, 'consume', -6, 2776, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754589924900_ieajspbyw]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:05:32.201');
INSERT INTO `point_transactions` VALUES (214, 9, 'consume', -6, 2770, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_f3e0dbfb-cd3c-4194-8e06-d4ef71380f16]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:05:39.224');
INSERT INTO `point_transactions` VALUES (215, 9, 'consume', -6, 2764, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754590003286_uapsy8kzt]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:06:50.575');
INSERT INTO `point_transactions` VALUES (216, 9, 'consume', -6, 2758, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_781ccdd2-d625-4c28-8d32-c17b66b76042]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:06:58.712');
INSERT INTO `point_transactions` VALUES (217, 9, 'consume', -6, 2752, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754590174775_wr8laj57e]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:09:48.597');
INSERT INTO `point_transactions` VALUES (218, 9, 'consume', -6, 2746, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_1712a739-42dd-4c66-a579-408658676cbb]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:09:55.877');
INSERT INTO `point_transactions` VALUES (219, 9, 'consume', -6, 2740, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754590229545_5eu5clmoh]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:10:36.009');
INSERT INTO `point_transactions` VALUES (220, 9, 'consume', -6, 2734, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_0f6d7c2f-f275-40b8-a08c-f02e519fb038]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:10:42.545');
INSERT INTO `point_transactions` VALUES (221, 9, 'consume', -6, 2728, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754590329348_f232hr86i]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:12:16.213');
INSERT INTO `point_transactions` VALUES (222, 9, 'consume', -6, 2722, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_ed473c20-5565-4a2a-9a6a-943e12a4624d]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:12:24.828');
INSERT INTO `point_transactions` VALUES (223, 9, 'consume', -6, 2716, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754590374921_jncvisn1h]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:13:01.777');
INSERT INTO `point_transactions` VALUES (224, 9, 'consume', -6, 2710, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_d52c7258-7dac-429e-9aef-8aea8bff1533]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:13:09.911');
INSERT INTO `point_transactions` VALUES (225, 9, 'consume', -6, 2704, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754590413057_q4xlwh8so]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:13:40.133');
INSERT INTO `point_transactions` VALUES (226, 9, 'consume', -6, 2698, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_9263d1c4-9232-4f53-b286-3d931c58f260]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:13:49.781');
INSERT INTO `point_transactions` VALUES (227, 9, 'consume', -6, 2692, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754590456960_xq3sdst6q]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:14:24.158');
INSERT INTO `point_transactions` VALUES (228, 9, 'consume', -6, 2686, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_afd9bc93-8adb-4e49-9436-fc1bb248b05c]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:14:30.801');
INSERT INTO `point_transactions` VALUES (229, 9, 'consume', -6, 2680, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754590629992_kf8uyyg60]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:17:16.018');
INSERT INTO `point_transactions` VALUES (230, 9, 'consume', -6, 2674, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_7b8dca09-3b31-4add-860a-7d0c88df11e8]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:17:25.635');
INSERT INTO `point_transactions` VALUES (231, 9, 'consume', -6, 2668, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754590696273_rsdvzww98]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:18:23.256');
INSERT INTO `point_transactions` VALUES (232, 9, 'consume', -6, 2662, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_0734c9b7-cc42-4ce2-979f-4cac8d77081d]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:18:31.566');
INSERT INTO `point_transactions` VALUES (233, 9, 'consume', -6, 2656, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754590760814_qx229g739]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:19:28.342');
INSERT INTO `point_transactions` VALUES (234, 9, 'consume', -6, 2650, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_ecc90baa-04a1-4830-8325-f47cb11e3c7b]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:19:37.682');
INSERT INTO `point_transactions` VALUES (235, 9, 'consume', -6, 2644, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754590808180_fbjmfc6ki]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:20:14.874');
INSERT INTO `point_transactions` VALUES (236, 9, 'consume', -6, 2638, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_fdceaa47-b2e1-4a7d-a872-0ea4aaee7679]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:20:22.420');
INSERT INTO `point_transactions` VALUES (237, 9, 'consume', -6, 2632, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754590841864_9n2pvza5b]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:20:48.694');
INSERT INTO `point_transactions` VALUES (238, 9, 'consume', -6, 2626, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_0f367851-919f-4c04-a116-345aa330c539]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:20:57.778');
INSERT INTO `point_transactions` VALUES (239, 9, 'consume', -6, 2620, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754591037146_me2o2gv63]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:24:03.648');
INSERT INTO `point_transactions` VALUES (240, 9, 'consume', -6, 2614, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_9e227ef7-8da7-4446-bbe0-d9bb0fec463f]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:24:10.305');
INSERT INTO `point_transactions` VALUES (241, 9, 'consume', -6, 2608, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754591083254_1atavooof]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:24:51.060');
INSERT INTO `point_transactions` VALUES (242, 9, 'consume', -6, 2602, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_8b589931-8090-4458-9785-a1e6b4eedc78]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:24:59.548');
INSERT INTO `point_transactions` VALUES (243, 9, 'consume', -6, 2596, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754591120201_chi5e5qky]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:25:28.750');
INSERT INTO `point_transactions` VALUES (244, 9, 'consume', -6, 2590, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_756e0afe-aec2-42be-8997-7fcab2d02ec9]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:25:36.801');
INSERT INTO `point_transactions` VALUES (245, 9, 'consume', -6, 2584, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754591168399_g30ecr1rd]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:26:15.688');
INSERT INTO `point_transactions` VALUES (246, 9, 'consume', -6, 2578, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_4d63bb81-8d8f-4fbd-8064-2076e483a8ab]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:26:22.074');
INSERT INTO `point_transactions` VALUES (247, 9, 'consume', -6, 2572, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754591213644_nyk6u0gw2]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:26:59.970');
INSERT INTO `point_transactions` VALUES (248, 9, 'consume', -6, 2566, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_f25e0f4a-6db4-4e80-9ebb-cbbf6d53eb68]: 使用gpt-4o模型处理选择题', NULL, '2025-08-07 18:27:05.937');
INSERT INTO `point_transactions` VALUES (249, 9, 'consume', -8, 2558, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754591405864_ugn4d8amc]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 18:30:12.799');
INSERT INTO `point_transactions` VALUES (250, 9, 'consume', -8, 2550, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_6bf54dff-fbd4-472c-a632-0273ffeaef03]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 18:30:22.790');
INSERT INTO `point_transactions` VALUES (251, 9, 'consume', -8, 2542, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754591477431_2cnhvnv3w]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 18:31:56.143');
INSERT INTO `point_transactions` VALUES (252, 9, 'consume', -8, 2534, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_a4dffe66-f70d-41ad-a665-25c8f1ffab73]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 18:32:03.684');
INSERT INTO `point_transactions` VALUES (253, 9, 'consume', -8, 2526, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754591552890_nlfxt6010]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 18:32:39.831');
INSERT INTO `point_transactions` VALUES (254, 9, 'consume', -8, 2518, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_4821b8dd-b6ea-4e17-ad42-a136c41cc7d8]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 18:32:48.434');
INSERT INTO `point_transactions` VALUES (255, 9, 'consume', -8, 2510, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754591593072_pafei9jio]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 18:33:18.793');
INSERT INTO `point_transactions` VALUES (256, 9, 'consume', -8, 2502, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_e1b65bd0-d9a2-4978-b168-fb020a3a5ba8]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 18:33:28.988');
INSERT INTO `point_transactions` VALUES (257, 9, 'consume', -8, 2494, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754591633857_9l0tq3tyz]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 18:34:00.928');
INSERT INTO `point_transactions` VALUES (258, 9, 'consume', -8, 2486, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_e37de6b4-044d-426b-a776-777bb783740a]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 18:34:09.948');
INSERT INTO `point_transactions` VALUES (259, 9, 'consume', -8, 2478, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754591704773_3fmqyco31]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 18:35:11.006');
INSERT INTO `point_transactions` VALUES (260, 9, 'consume', -8, 2470, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_de16a99d-05c6-4b7a-a83a-747c07ffac45]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-07 18:35:37.119');
INSERT INTO `point_transactions` VALUES (261, 14, 'consume', -12, 88, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754619564489_at7rxj1rr]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 02:19:47.663');
INSERT INTO `point_transactions` VALUES (262, 14, 'consume', -12, 76, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754619862940_16pso5xug]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 02:24:44.995');
INSERT INTO `point_transactions` VALUES (263, 14, 'consume', -12, 64, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754620786819_8yd4hz1u4]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 02:40:05.188');
INSERT INTO `point_transactions` VALUES (264, 14, 'consume', -10, 54, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754623059852_j3ashhld6]: 使用gpt-4o模型处理编程题', NULL, '2025-08-08 03:18:00.578');
INSERT INTO `point_transactions` VALUES (265, 14, 'consume', -40, 14, 'gemini-2.5-pro-exp-03-25', 'programming', '搜题操作 [ai_call_1754637840430_p081tsc31]: 使用gemini-2.5-pro-exp-03-25模型处理编程题', NULL, '2025-08-08 07:24:24.209');
INSERT INTO `point_transactions` VALUES (266, 14, 'recharge', 1300, 1314, NULL, NULL, '充值成功 - 订单ORDER17546381735228355', '{\"orderNo\":\"ORDER17546381735228355\",\"packageId\":21,\"basePoints\":400,\"bonusPoints\":900,\"transactionId\":\"4200002774202508088364965631\"}', '2025-08-08 07:29:47.387');
INSERT INTO `point_transactions` VALUES (267, 14, 'consume', -40, 1274, 'o4-mini-all', 'programming', '搜题操作 [ai_call_1754638253620_k7a381hfe]: 使用o4-mini-all模型处理编程题', NULL, '2025-08-08 07:31:17.459');
INSERT INTO `point_transactions` VALUES (268, 14, 'consume', -250, 1024, 'o4-mini-high-all', 'programming', '搜题操作 [ai_call_1754638442871_snpqezp55]: 使用o4-mini-high-all模型处理编程题', NULL, '2025-08-08 07:34:31.231');
INSERT INTO `point_transactions` VALUES (269, 14, 'consume', -12, 1012, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754638884325_ojroxzx65]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-08 07:46:33.129');
INSERT INTO `point_transactions` VALUES (270, 14, 'consume', -4, 1008, 'gpt-4o-mini', 'programming', '搜题操作 [ai_call_1754639502144_r62vkcywc]: 使用gpt-4o-mini模型处理编程题', NULL, '2025-08-08 07:52:08.601');
INSERT INTO `point_transactions` VALUES (271, 14, 'recharge', 5000, 6008, NULL, NULL, '充值成功 - 订单ORDER17546397234003353', '{\"orderNo\":\"ORDER17546397234003353\",\"packageId\":22,\"basePoints\":1000,\"bonusPoints\":4000,\"transactionId\":\"4200002743202508082687036137\"}', '2025-08-08 07:55:37.424');
INSERT INTO `point_transactions` VALUES (272, 14, 'reward', 1000, 7008, NULL, NULL, '积分赠送', NULL, '2025-08-08 09:00:26.991');
INSERT INTO `point_transactions` VALUES (273, 19, 'consume', -12, 88, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754665461152_3jcnamq8e]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 15:04:35.356');
INSERT INTO `point_transactions` VALUES (274, 19, 'consume', -12, 76, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754665518541_ugly1hg8t]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 15:05:46.084');
INSERT INTO `point_transactions` VALUES (275, 8, 'consume', -12, 1472, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754666001964_9dyz2zdm8]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 15:13:48.199');
INSERT INTO `point_transactions` VALUES (276, 19, 'reward', 200, 276, NULL, NULL, '管理员增加积分', NULL, '2025-08-08 15:16:24.497');
INSERT INTO `point_transactions` VALUES (277, 8, 'consume', -10, 1462, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754666270223_kaif4p61q]: 使用gpt-4o模型处理编程题', NULL, '2025-08-08 15:18:41.744');
INSERT INTO `point_transactions` VALUES (278, 19, 'consume', -10, 266, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754666344096_adyd5dui1]: 使用gpt-4o模型处理编程题', NULL, '2025-08-08 15:19:31.224');
INSERT INTO `point_transactions` VALUES (279, 8, 'consume', -10, 1452, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754666473153_qms5u74a7]: 使用gpt-4o模型处理编程题', NULL, '2025-08-08 15:21:40.545');
INSERT INTO `point_transactions` VALUES (280, 20, 'consume', -12, 88, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754666596211_t8nzw97qi]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 15:23:37.451');
INSERT INTO `point_transactions` VALUES (281, 21, 'consume', -12, 88, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754672661062_lms4tckj6]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 17:05:01.443');
INSERT INTO `point_transactions` VALUES (282, 21, 'consume', -12, 76, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754672967502_68ir5luha]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-08 17:10:04.333');
INSERT INTO `point_transactions` VALUES (283, 21, 'consume', -12, 64, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754673287897_gr7wewgf8]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-08 17:15:11.249');
INSERT INTO `point_transactions` VALUES (284, 21, 'consume', -12, 52, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754673488508_8ob2vrs4n]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 17:18:34.528');
INSERT INTO `point_transactions` VALUES (285, 21, 'consume', -12, 40, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754674029489_hcp913vvj]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 17:27:34.683');
INSERT INTO `point_transactions` VALUES (286, 21, 'consume', -12, 28, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754674214176_ehha5ofui]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 17:30:36.174');
INSERT INTO `point_transactions` VALUES (287, 18, 'consume', -12, 88, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754674215956_09c25sfn2]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 17:30:36.469');
INSERT INTO `point_transactions` VALUES (288, 21, 'consume', -12, 16, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754674582757_lp3aeqt8g]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 17:36:47.476');
INSERT INTO `point_transactions` VALUES (289, 21, 'reward', 200, 216, NULL, NULL, '管理员增加积分', NULL, '2025-08-08 17:44:28.537');
INSERT INTO `point_transactions` VALUES (290, 21, 'consume', -12, 204, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754675063703_e1ozaq7hm]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-08 17:44:42.182');
INSERT INTO `point_transactions` VALUES (291, 24, 'consume', -12, 88, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754677632104_82bmly8m4]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 18:27:31.137');
INSERT INTO `point_transactions` VALUES (292, 24, 'consume', -12, 76, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754677788748_4zdxdm0eq]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-08 18:30:15.395');
INSERT INTO `point_transactions` VALUES (293, 25, 'consume', -6, 94, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754703185843_m9tnows9p]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 01:33:32.775');
INSERT INTO `point_transactions` VALUES (294, 25, 'consume', -6, 88, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_bcecb0a0-9e19-4e6b-bd33-6a8e59c84612]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 01:33:55.266');
INSERT INTO `point_transactions` VALUES (295, 25, 'consume', -6, 82, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754703345842_y9lzvmjpt]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 01:36:12.225');
INSERT INTO `point_transactions` VALUES (296, 25, 'consume', -6, 76, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_5304baa6-d954-4c83-8365-d202aa6091df]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 01:36:31.785');
INSERT INTO `point_transactions` VALUES (297, 25, 'consume', -8, 68, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [ai_call_1754703536093_ojqkm3q4l]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-09 01:40:57.811');
INSERT INTO `point_transactions` VALUES (298, 25, 'consume', -8, 60, 'gemini-2.5-flash-preview-04-17', 'multiple_choice', '搜题操作 [mcq_a1f98dcf-8d0d-48a3-b4ce-bf387008bad4]: 使用gemini-2.5-flash-preview-04-17模型处理选择题', NULL, '2025-08-09 01:41:42.984');
INSERT INTO `point_transactions` VALUES (299, 25, 'consume', -3, 57, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754703871838_bcwvsqspm]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 01:44:52.127');
INSERT INTO `point_transactions` VALUES (300, 25, 'consume', -3, 54, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_7b3503c8-b1e7-4301-b1b5-d3554a449db7]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 01:45:12.174');
INSERT INTO `point_transactions` VALUES (301, 14, 'consume', -6, 7002, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754704367878_pdo98wrl2]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 01:53:03.861');
INSERT INTO `point_transactions` VALUES (302, 14, 'consume', -6, 6996, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_8e7e1c5e-e374-4c03-8743-058517319cb9]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 01:53:18.726');
INSERT INTO `point_transactions` VALUES (303, 14, 'consume', -6, 6990, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754704694523_zfocwf5a7]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 01:58:30.831');
INSERT INTO `point_transactions` VALUES (304, 14, 'consume', -6, 6984, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_fcf69afa-4ea4-4714-8689-0413fcd2713e]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 01:59:04.403');
INSERT INTO `point_transactions` VALUES (305, 21, 'consume', -12, 192, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754705620074_hige61lbz]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-09 02:13:58.632');
INSERT INTO `point_transactions` VALUES (306, 21, 'consume', -12, 180, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754705932417_gm6vi3he8]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-09 02:19:53.526');
INSERT INTO `point_transactions` VALUES (307, 14, 'consume', -250, 6734, 'o4-mini-high-all', 'programming', '搜题操作 [ai_call_1754705999600_7ll1oqms4]: 使用o4-mini-high-all模型处理编程题', NULL, '2025-08-09 02:20:16.235');
INSERT INTO `point_transactions` VALUES (308, 14, 'consume', -250, 6484, 'o4-mini-high-all', 'programming', '搜题操作 [ai_call_1754707456974_4ep1d5gjj]: 使用o4-mini-high-all模型处理编程题', NULL, '2025-08-09 02:44:34.020');
INSERT INTO `point_transactions` VALUES (309, 18, 'reward', 200, 288, NULL, NULL, '管理员增加积分', NULL, '2025-08-09 02:51:33.666');
INSERT INTO `point_transactions` VALUES (310, 14, 'consume', -250, 6234, 'o4-mini-high-all', 'programming', '搜题操作 [ai_call_1754708344627_0qj8wal79]: 使用o4-mini-high-all模型处理编程题', NULL, '2025-08-09 03:00:24.385');
INSERT INTO `point_transactions` VALUES (311, 24, 'reward', 200, 276, NULL, NULL, '管理员增加积分', NULL, '2025-08-09 03:01:00.686');
INSERT INTO `point_transactions` VALUES (312, 14, 'consume', -250, 5984, 'o4-mini-high-all', 'programming', '搜题操作 [ai_call_1754708604188_kepfjivw3]: 使用o4-mini-high-all模型处理编程题', NULL, '2025-08-09 03:03:40.226');
INSERT INTO `point_transactions` VALUES (313, 14, 'consume', -250, 5734, 'o4-mini-high-all', 'programming', '搜题操作 [ai_call_1754708835102_ymzzsip1x]: 使用o4-mini-high-all模型处理编程题', NULL, '2025-08-09 03:07:33.742');
INSERT INTO `point_transactions` VALUES (314, 27, 'consume', -8, 92, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754714718766_l5adhdtsl]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-09 04:45:06.725');
INSERT INTO `point_transactions` VALUES (315, 27, 'consume', -12, 80, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754714950696_yaw9xz097]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-09 04:48:54.888');
INSERT INTO `point_transactions` VALUES (316, 27, 'consume', -12, 68, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754715039862_z49ex9jdm]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-09 04:51:24.098');
INSERT INTO `point_transactions` VALUES (317, 27, 'consume', -12, 56, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754715529959_0j8g43pd2]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-09 04:58:37.811');
INSERT INTO `point_transactions` VALUES (318, 21, 'consume', -12, 168, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754719497126_csw5ymozs]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-09 06:05:22.828');
INSERT INTO `point_transactions` VALUES (319, 8, 'consume', -10, 1442, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754719535669_0h3un6i2k]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 06:05:54.208');
INSERT INTO `point_transactions` VALUES (320, 28, 'consume', -8, 92, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754720141873_4sh1k9tgn]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-09 06:16:01.709');
INSERT INTO `point_transactions` VALUES (321, 28, 'consume', -8, 84, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_f595a0f9-bc3b-419e-98fa-02c6a8f8787b]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-09 06:16:17.656');
INSERT INTO `point_transactions` VALUES (322, 8, 'consume', -10, 1432, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754721014712_fh7wvugyc]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 06:30:37.989');
INSERT INTO `point_transactions` VALUES (323, 8, 'consume', -10, 1422, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754721319002_p3ry4d8ig]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 06:35:40.272');
INSERT INTO `point_transactions` VALUES (324, 8, 'consume', -10, 1412, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754721415361_fr8wj1nzo]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 06:37:08.952');
INSERT INTO `point_transactions` VALUES (325, 29, 'reward', 200, 300, NULL, NULL, '管理员增加积分', NULL, '2025-08-09 06:38:23.338');
INSERT INTO `point_transactions` VALUES (326, 29, 'consume', -10, 290, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754721968750_jwk20978t]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 06:46:27.307');
INSERT INTO `point_transactions` VALUES (327, 29, 'consume', -6, 284, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754722552355_sq0owgvnt]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 06:56:27.103');
INSERT INTO `point_transactions` VALUES (328, 29, 'consume', -6, 278, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_9b27cef0-3e06-4123-9cf7-d26b5bb11e40]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 06:57:06.633');
INSERT INTO `point_transactions` VALUES (329, 29, 'consume', -6, 272, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754722759100_d514unu49]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 06:59:37.860');
INSERT INTO `point_transactions` VALUES (330, 29, 'consume', -6, 266, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_646677be-881f-44bc-95fc-2c4bc9c7feea]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 07:01:14.495');
INSERT INTO `point_transactions` VALUES (331, 8, 'consume', -10, 1402, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754723833529_7gwz19tuu]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 07:17:13.173');
INSERT INTO `point_transactions` VALUES (332, 8, 'consume', -10, 1392, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754723892510_f02u6t0nu]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 07:18:32.207');
INSERT INTO `point_transactions` VALUES (333, 29, 'recharge', 250, 516, NULL, NULL, '充值成功 - 订单ORDER17547244549395274', '{\"orderNo\":\"ORDER17547244549395274\",\"packageId\":20,\"basePoints\":100,\"bonusPoints\":150,\"transactionId\":\"4200002772202508096415468255\"}', '2025-08-09 07:27:51.750');
INSERT INTO `point_transactions` VALUES (334, 14, 'consume', -6, 5728, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754726516575_3nsaoaa1i]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:02:04.776');
INSERT INTO `point_transactions` VALUES (335, 14, 'consume', -6, 5722, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_582086d6-4c61-43fd-a4aa-79d85002a6fe]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:02:23.517');
INSERT INTO `point_transactions` VALUES (336, 14, 'consume', -6, 5716, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754726692492_s3w7slwmx]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:05:16.750');
INSERT INTO `point_transactions` VALUES (337, 14, 'consume', -6, 5710, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_78ea36a7-100f-422f-a22a-0c0726355046]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:05:34.658');
INSERT INTO `point_transactions` VALUES (338, 14, 'consume', -6, 5704, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754726905499_fbogn9snt]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:08:46.270');
INSERT INTO `point_transactions` VALUES (339, 14, 'consume', -6, 5698, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_9ff9f7ce-6e8d-4662-94c1-cf8458235168]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:09:05.082');
INSERT INTO `point_transactions` VALUES (340, 14, 'consume', -6, 5692, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754727017834_ww6zw0xr6]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:10:38.182');
INSERT INTO `point_transactions` VALUES (341, 14, 'consume', -6, 5686, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_873e60ff-f866-4092-98b0-d620359358cd]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:10:58.047');
INSERT INTO `point_transactions` VALUES (342, 14, 'consume', -6, 5680, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754727116615_js36fit12]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:12:16.593');
INSERT INTO `point_transactions` VALUES (343, 14, 'consume', -6, 5674, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_fb1756a6-84a5-4bde-ba97-d93a6a22080b]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:12:35.406');
INSERT INTO `point_transactions` VALUES (344, 21, 'consume', -12, 156, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754727461973_vycoxfvpy]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-09 08:18:02.357');
INSERT INTO `point_transactions` VALUES (345, 14, 'consume', -6, 5668, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754727561449_frr3hg0ic]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:19:43.818');
INSERT INTO `point_transactions` VALUES (346, 14, 'consume', -6, 5662, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_843d97a2-0b94-48a5-8de4-ceccc7ddd65a]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:19:59.123');
INSERT INTO `point_transactions` VALUES (347, 14, 'consume', -6, 5656, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754727813657_w0abbo3w7]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:23:53.439');
INSERT INTO `point_transactions` VALUES (348, 14, 'consume', -6, 5650, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_1a4fce97-4249-4ad5-9457-59069fcc279a]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:24:22.274');
INSERT INTO `point_transactions` VALUES (349, 14, 'consume', -6, 5644, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754728017910_z10ddggx9]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:27:17.850');
INSERT INTO `point_transactions` VALUES (350, 14, 'consume', -6, 5638, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_a47122dc-e2fc-4427-994c-50ea832cd494]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:27:25.799');
INSERT INTO `point_transactions` VALUES (351, 14, 'consume', -6, 5632, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754728092357_7yj8gz24b]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:28:19.932');
INSERT INTO `point_transactions` VALUES (352, 14, 'consume', -6, 5626, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_8d8b8c22-147a-48a0-8bee-68c982d0e6fd]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:28:43.353');
INSERT INTO `point_transactions` VALUES (353, 14, 'consume', -6, 5620, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754728288218_gmbyyeydc]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:31:47.540');
INSERT INTO `point_transactions` VALUES (354, 14, 'consume', -6, 5614, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_afce92cb-0d99-4b7c-b07c-0699e25ebd62]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:32:04.785');
INSERT INTO `point_transactions` VALUES (355, 14, 'consume', -6, 5608, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754728500110_v2futnfr4]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:35:21.437');
INSERT INTO `point_transactions` VALUES (356, 14, 'consume', -6, 5602, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_8dd15689-74fa-4274-9ec8-e9862423f07b]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:35:40.569');
INSERT INTO `point_transactions` VALUES (357, 14, 'consume', -6, 5596, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754728595489_xnb3xsok8]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:36:57.075');
INSERT INTO `point_transactions` VALUES (358, 14, 'consume', -6, 5590, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_17baacf8-6669-4dff-9088-26bc7f98674e]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:37:15.390');
INSERT INTO `point_transactions` VALUES (359, 14, 'consume', -6, 5584, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754728754699_g1kgrdmc8]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:39:36.801');
INSERT INTO `point_transactions` VALUES (360, 14, 'consume', -6, 5578, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_fbbd4c2b-b28b-4b48-a32d-07dafec2153b]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:39:55.893');
INSERT INTO `point_transactions` VALUES (361, 14, 'consume', -6, 5572, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754728849865_4gpq9ggyh]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:41:07.551');
INSERT INTO `point_transactions` VALUES (362, 14, 'consume', -6, 5566, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_5c77fe90-c23f-4193-9628-15d555b992a5]: 使用gpt-4o模型处理选择题', NULL, '2025-08-09 08:41:27.007');
INSERT INTO `point_transactions` VALUES (363, 14, 'consume', -250, 5316, 'o4-mini-high-all', 'programming', '搜题操作 [ai_call_1754729032990_srt14u29a]: 使用o4-mini-high-all模型处理编程题', NULL, '2025-08-09 08:44:11.617');
INSERT INTO `point_transactions` VALUES (364, 21, 'consume', -12, 144, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754729035290_1ttfy4sg1]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-09 08:44:16.121');
INSERT INTO `point_transactions` VALUES (365, 35, 'consume', -8, 92, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754731052920_vsvatrci1]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-09 09:17:46.391');
INSERT INTO `point_transactions` VALUES (366, 35, 'consume', -12, 80, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754731266070_psgybtwob]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-09 09:21:23.273');
INSERT INTO `point_transactions` VALUES (367, 33, 'consume', -3, 97, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754735110865_n044ucytg]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 10:25:19.459');
INSERT INTO `point_transactions` VALUES (368, 33, 'consume', -3, 94, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_8c9d2a19-016c-4f43-96b5-3b4f1005b07a]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 10:26:00.574');
INSERT INTO `point_transactions` VALUES (369, 33, 'consume', -3, 91, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754735210978_axmsvee57]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 10:27:22.965');
INSERT INTO `point_transactions` VALUES (370, 33, 'consume', -3, 88, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_666d513f-de2c-47c2-924d-876f2732d534]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 10:27:45.595');
INSERT INTO `point_transactions` VALUES (371, 33, 'consume', -3, 85, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754735294005_vi8kxfq6o]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 10:28:35.205');
INSERT INTO `point_transactions` VALUES (372, 33, 'consume', -3, 82, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_96c9f34f-8ed9-45ad-99c2-e561a0fe6403]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 10:28:57.534');
INSERT INTO `point_transactions` VALUES (373, 33, 'consume', -4, 78, 'gpt-4o-mini', 'programming', '搜题操作 [ai_call_1754735367314_9cvvgkzlo]: 使用gpt-4o-mini模型处理编程题', NULL, '2025-08-09 10:29:44.656');
INSERT INTO `point_transactions` VALUES (374, 33, 'consume', -4, 74, 'gpt-4o-mini', 'programming', '搜题操作 [ai_call_1754735884497_lod7b10r5]: 使用gpt-4o-mini模型处理编程题', NULL, '2025-08-09 10:38:27.508');
INSERT INTO `point_transactions` VALUES (375, 8, 'consume', -10, 1382, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754736905173_fz38737hr]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 10:55:20.623');
INSERT INTO `point_transactions` VALUES (376, 8, 'consume', -10, 1372, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754737313560_0nysvl98y]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 11:01:50.856');
INSERT INTO `point_transactions` VALUES (377, 8, 'consume', -10, 1362, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754737321037_xhj8dl4v7]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 11:02:16.777');
INSERT INTO `point_transactions` VALUES (378, 33, 'consume', -3, 71, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754737398146_7byboiwhw]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:03:40.817');
INSERT INTO `point_transactions` VALUES (379, 33, 'consume', -3, 68, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_c5a8e4d0-603c-4747-9d46-883e1dfb5048]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:04:00.666');
INSERT INTO `point_transactions` VALUES (380, 8, 'consume', -10, 1352, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754737457942_3jyt27i51]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 11:04:36.454');
INSERT INTO `point_transactions` VALUES (381, 33, 'consume', -3, 65, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754737474460_yb9opp0p8]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:04:50.986');
INSERT INTO `point_transactions` VALUES (382, 33, 'consume', -3, 62, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_653e2f3e-b5ac-4b3a-bdab-87a85d890734]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:05:11.281');
INSERT INTO `point_transactions` VALUES (383, 33, 'consume', -3, 59, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754737536179_c64jmkct4]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:05:55.167');
INSERT INTO `point_transactions` VALUES (384, 33, 'consume', -3, 56, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_d70ab070-b79c-44ea-980c-b886e8078939]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:06:18.052');
INSERT INTO `point_transactions` VALUES (385, 33, 'consume', -3, 53, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754737600950_l83k9dz21]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:07:21.998');
INSERT INTO `point_transactions` VALUES (386, 33, 'consume', -3, 50, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_3265ca1b-f01b-4398-b0ce-9615635e0a6f]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:07:41.755');
INSERT INTO `point_transactions` VALUES (387, 8, 'consume', -10, 1342, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754737661216_wziwlc49a]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 11:07:48.376');
INSERT INTO `point_transactions` VALUES (388, 33, 'consume', -3, 47, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754737684598_v8e6qq297]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:08:27.159');
INSERT INTO `point_transactions` VALUES (389, 33, 'consume', -3, 44, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_fd51b391-2103-4bd1-85ad-16318eacdb99]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:08:45.792');
INSERT INTO `point_transactions` VALUES (390, 33, 'consume', -3, 41, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754737746969_jqyjaeilc]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:09:21.453');
INSERT INTO `point_transactions` VALUES (391, 33, 'consume', -3, 38, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_34f192a2-c4b4-4285-a521-e3f82a586524]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:09:43.241');
INSERT INTO `point_transactions` VALUES (392, 33, 'consume', -3, 35, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [ai_call_1754737817953_c0lfvb1sc]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:10:51.294');
INSERT INTO `point_transactions` VALUES (393, 33, 'consume', -3, 32, 'gpt-4o-mini', 'multiple_choice', '搜题操作 [mcq_9a387004-faca-42d7-b40f-0b2cbab4cf39]: 使用gpt-4o-mini模型处理选择题', NULL, '2025-08-09 11:11:17.123');
INSERT INTO `point_transactions` VALUES (394, 33, 'consume', -4, 28, 'gpt-4o-mini', 'programming', '搜题操作 [ai_call_1754737905621_tj9jmcz7h]: 使用gpt-4o-mini模型处理编程题', NULL, '2025-08-09 11:12:22.029');
INSERT INTO `point_transactions` VALUES (395, 33, 'consume', -4, 24, 'gpt-4o-mini', 'programming', '搜题操作 [ai_call_1754738396886_r28a62saa]: 使用gpt-4o-mini模型处理编程题', NULL, '2025-08-09 11:20:14.738');
INSERT INTO `point_transactions` VALUES (396, 33, 'consume', -4, 20, 'gpt-4o-mini', 'programming', '搜题操作 [ai_call_1754738527380_8dj3ozjiw]: 使用gpt-4o-mini模型处理编程题', NULL, '2025-08-09 11:22:35.262');
INSERT INTO `point_transactions` VALUES (397, 33, 'consume', -4, 16, 'gpt-4o-mini', 'programming', '搜题操作 [ai_call_1754738645442_6jftaecl7]: 使用gpt-4o-mini模型处理编程题', NULL, '2025-08-09 11:24:37.180');
INSERT INTO `point_transactions` VALUES (398, 33, 'consume', -4, 12, 'gpt-4o-mini', 'programming', '搜题操作 [ai_call_1754738731952_anitlq0y0]: 使用gpt-4o-mini模型处理编程题', NULL, '2025-08-09 11:26:00.581');
INSERT INTO `point_transactions` VALUES (399, 8, 'consume', -10, 1332, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754739444009_mcp7z29ae]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 11:37:42.406');
INSERT INTO `point_transactions` VALUES (400, 8, 'consume', -10, 1322, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754740137703_9pqhundad]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 11:49:18.625');
INSERT INTO `point_transactions` VALUES (401, 8, 'consume', -10, 1312, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754741256995_b777gpssr]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:07:45.789');
INSERT INTO `point_transactions` VALUES (402, 8, 'consume', -10, 1302, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754741657261_cqtfcuwe2]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:14:34.875');
INSERT INTO `point_transactions` VALUES (403, 8, 'consume', -10, 1292, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754742063049_y1joofjkh]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:21:19.868');
INSERT INTO `point_transactions` VALUES (404, 8, 'consume', -10, 1282, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754742304357_0tlz8dfvi]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:25:26.422');
INSERT INTO `point_transactions` VALUES (405, 33, 'reward', 200, 212, NULL, NULL, '管理员增加积分', NULL, '2025-08-09 12:26:22.943');
INSERT INTO `point_transactions` VALUES (406, 8, 'consume', -10, 1272, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754742532136_4wcxsb4d6]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:29:11.584');
INSERT INTO `point_transactions` VALUES (407, 8, 'consume', -10, 1262, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754742827175_p180a5ye9]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:33:53.227');
INSERT INTO `point_transactions` VALUES (408, 8, 'consume', -10, 1252, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754742963474_yo3niw747]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:37:31.952');
INSERT INTO `point_transactions` VALUES (409, 36, 'consume', -8, 92, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754743097945_p97tgu3ip]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-09 12:38:36.832');
INSERT INTO `point_transactions` VALUES (410, 8, 'consume', -10, 1242, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754743247916_bn0xrt05t]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:41:02.893');
INSERT INTO `point_transactions` VALUES (411, 8, 'consume', -10, 1232, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754743380937_12o0ddcvx]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:45:58.759');
INSERT INTO `point_transactions` VALUES (412, 8, 'consume', -10, 1222, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754743567289_xkbl48xsm]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:48:23.753');
INSERT INTO `point_transactions` VALUES (413, 8, 'consume', -10, 1212, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754743736352_y9ii7xww4]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:49:15.128');
INSERT INTO `point_transactions` VALUES (414, 8, 'consume', -10, 1202, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754743939409_kkzq3v0yx]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:52:34.829');
INSERT INTO `point_transactions` VALUES (415, 8, 'consume', -10, 1192, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754744175687_2fkw6pvgk]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 12:56:34.520');
INSERT INTO `point_transactions` VALUES (416, 8, 'consume', -10, 1182, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754745375559_uu16wu5dm]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 13:16:34.157');
INSERT INTO `point_transactions` VALUES (417, 8, 'consume', -10, 1172, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754745790902_2snanpxbv]: 使用gpt-4o模型处理编程题', NULL, '2025-08-09 13:23:30.105');
INSERT INTO `point_transactions` VALUES (418, 43, 'consume', -8, 92, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754785380126_af0ws4nsj]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 00:23:40.221');
INSERT INTO `point_transactions` VALUES (419, 43, 'consume', -8, 84, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_6300a5cc-1634-4e4e-9865-e7ad7fc02a38]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 00:24:40.424');
INSERT INTO `point_transactions` VALUES (420, 44, 'consume', -8, 92, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754785630775_opjqv5suv]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 00:27:35.448');
INSERT INTO `point_transactions` VALUES (421, 21, 'consume', -12, 132, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754793314212_ip44rbrxh]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-10 02:35:22.573');
INSERT INTO `point_transactions` VALUES (422, 21, 'consume', -12, 120, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754793345805_4brtu9hkg]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-10 02:36:01.578');
INSERT INTO `point_transactions` VALUES (423, 21, 'consume', -12, 108, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754793512617_y5aqqqfe8]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-10 02:38:50.926');
INSERT INTO `point_transactions` VALUES (424, 21, 'consume', -12, 96, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754794631002_fmqhrva4c]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-10 02:57:31.054');
INSERT INTO `point_transactions` VALUES (425, 21, 'consume', -12, 84, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754794822856_3ruo5fclz]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-10 03:00:42.580');
INSERT INTO `point_transactions` VALUES (426, 46, 'reward', 200, 300, NULL, NULL, '管理员增加积分', NULL, '2025-08-10 04:40:26.147');
INSERT INTO `point_transactions` VALUES (427, 41, 'reward', 200, 300, NULL, NULL, '管理员增加积分', NULL, '2025-08-10 05:04:12.987');
INSERT INTO `point_transactions` VALUES (428, 42, 'recharge', 5000, 5100, NULL, NULL, '充值成功 - 订单ORDER17548035824730866', '{\"orderNo\":\"ORDER17548035824730866\",\"packageId\":22,\"basePoints\":1000,\"bonusPoints\":4000,\"transactionId\":\"4200002759202508103929748512\"}', '2025-08-10 05:26:36.708');
INSERT INTO `point_transactions` VALUES (429, 42, 'reward', 700, 5800, NULL, NULL, '管理员增加积分', NULL, '2025-08-10 05:27:21.733');
INSERT INTO `point_transactions` VALUES (430, 21, 'consume', -12, 72, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754807960660_48abnxeyo]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-10 06:39:40.704');
INSERT INTO `point_transactions` VALUES (431, 21, 'consume', -12, 60, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754808962361_cyahipask]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-10 06:56:21.698');
INSERT INTO `point_transactions` VALUES (432, 33, 'consume', -12, 200, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754809804033_nrkbp490w]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-10 07:10:25.187');
INSERT INTO `point_transactions` VALUES (433, 51, 'consume', -12, 88, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754811122913_5a9f2gr7v]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-10 07:32:23.014');
INSERT INTO `point_transactions` VALUES (434, 28, 'consume', -8, 76, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754814547746_98rs63edc]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 08:29:17.760');
INSERT INTO `point_transactions` VALUES (435, 28, 'consume', -8, 68, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_ac8457ca-2ac3-4288-b14e-bbe4f2a59cda]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 08:29:38.742');
INSERT INTO `point_transactions` VALUES (436, 49, 'reward', 200, 300, NULL, NULL, '管理员增加积分', NULL, '2025-08-10 08:38:15.252');
INSERT INTO `point_transactions` VALUES (437, 8, 'consume', -10, 1162, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754815104409_evdc1dya2]: 使用gpt-4o模型处理编程题', NULL, '2025-08-10 08:38:50.490');
INSERT INTO `point_transactions` VALUES (438, 28, 'reward', 200, 268, NULL, NULL, '管理员增加积分', NULL, '2025-08-10 08:39:23.781');
INSERT INTO `point_transactions` VALUES (439, 8, 'consume', -10, 1152, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754816560133_ap1twclbx]: 使用gpt-4o模型处理编程题', NULL, '2025-08-10 09:02:46.021');
INSERT INTO `point_transactions` VALUES (440, 53, 'consume', -6, 94, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754816607812_nyqu5yb6y]: 使用gpt-4o模型处理选择题', NULL, '2025-08-10 09:03:51.433');
INSERT INTO `point_transactions` VALUES (441, 53, 'consume', -6, 88, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_2e415e12-9340-43e0-a3ba-9da8c202cfee]: 使用gpt-4o模型处理选择题', NULL, '2025-08-10 09:04:12.070');
INSERT INTO `point_transactions` VALUES (442, 53, 'consume', -6, 82, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754816846426_aznch52fa]: 使用gpt-4o模型处理选择题', NULL, '2025-08-10 09:07:44.954');
INSERT INTO `point_transactions` VALUES (443, 53, 'consume', -6, 76, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_a86762bb-cdc4-4a50-8e4a-c641ccc8ca95]: 使用gpt-4o模型处理选择题', NULL, '2025-08-10 09:08:05.005');
INSERT INTO `point_transactions` VALUES (444, 53, 'consume', -8, 68, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754817019818_syws3ogi4]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 09:10:43.100');
INSERT INTO `point_transactions` VALUES (445, 53, 'consume', -8, 60, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_f39dafca-06e8-430a-93dd-5b4c6e6c7b1a]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 09:11:02.716');
INSERT INTO `point_transactions` VALUES (446, 8, 'consume', -10, 1142, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754818319658_opsv6p1mh]: 使用gpt-4o模型处理编程题', NULL, '2025-08-10 09:32:09.976');
INSERT INTO `point_transactions` VALUES (447, 8, 'consume', -10, 1132, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754819066968_ocoqk17qs]: 使用gpt-4o模型处理编程题', NULL, '2025-08-10 09:44:29.319');
INSERT INTO `point_transactions` VALUES (448, 8, 'consume', -10, 1122, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754819376428_fheizicvc]: 使用gpt-4o模型处理编程题', NULL, '2025-08-10 09:49:50.425');
INSERT INTO `point_transactions` VALUES (449, 51, 'consume', -12, 76, 'claude-sonnet-4-20250514', 'programming', '搜题操作 [ai_call_1754819366628_khnajga0n]: 使用claude-sonnet-4-20250514模型处理编程题', NULL, '2025-08-10 09:49:56.072');
INSERT INTO `point_transactions` VALUES (450, 8, 'consume', -10, 1112, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754821418756_1w6byxmgz]: 使用gpt-4o模型处理编程题', NULL, '2025-08-10 10:24:14.033');
INSERT INTO `point_transactions` VALUES (451, 8, 'consume', -10, 1102, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754822701822_tvqr3gd7m]: 使用gpt-4o模型处理编程题', NULL, '2025-08-10 10:45:17.453');
INSERT INTO `point_transactions` VALUES (452, 8, 'consume', -10, 1092, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754822812405_rd57juzcl]: 使用gpt-4o模型处理编程题', NULL, '2025-08-10 10:47:05.476');
INSERT INTO `point_transactions` VALUES (453, 21, 'consume', -12, 48, 'gemini-2.5-flash-preview-04-17', 'programming', '搜题操作 [ai_call_1754824050707_7i42m25yp]: 使用gemini-2.5-flash-preview-04-17模型处理编程题', NULL, '2025-08-10 11:08:02.088');
INSERT INTO `point_transactions` VALUES (454, 53, 'reward', 200, 260, NULL, NULL, '管理员增加积分', NULL, '2025-08-10 11:25:38.659');
INSERT INTO `point_transactions` VALUES (455, 55, 'consume', -8, 92, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754825962460_gzdaijfzf]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 11:39:44.002');
INSERT INTO `point_transactions` VALUES (456, 55, 'consume', -8, 84, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_7a6406c5-930e-4438-8371-9e81a633261c]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 11:40:02.059');
INSERT INTO `point_transactions` VALUES (457, 55, 'consume', -8, 76, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754826106976_se4vsdj5r]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 11:42:15.211');
INSERT INTO `point_transactions` VALUES (458, 55, 'consume', -8, 68, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_962ea1c3-183c-43ba-b961-19bca507362f]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 11:42:36.079');
INSERT INTO `point_transactions` VALUES (459, 55, 'consume', -6, 62, 'gpt-4o', 'multiple_choice', '搜题操作 [ai_call_1754826787108_5fuayc5rk]: 使用gpt-4o模型处理选择题', NULL, '2025-08-10 11:53:29.820');
INSERT INTO `point_transactions` VALUES (460, 55, 'consume', -6, 56, 'gpt-4o', 'multiple_choice', '搜题操作 [mcq_9488c0e7-4333-41da-8bb9-78aeb95aa2f1]: 使用gpt-4o模型处理选择题', NULL, '2025-08-10 11:54:00.354');
INSERT INTO `point_transactions` VALUES (461, 8, 'consume', -10, 1082, 'gpt-4o', 'programming', '搜题操作 [ai_call_1754829009366_gtracb8ws]: 使用gpt-4o模型处理编程题', NULL, '2025-08-10 12:30:42.207');
INSERT INTO `point_transactions` VALUES (462, 8, 'consume', -8, 1074, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754829244267_s3f8i4jjx]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 12:34:24.818');
INSERT INTO `point_transactions` VALUES (463, 47, 'consume', -8, 92, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754829415539_7wiljxew8]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 12:37:20.492');
INSERT INTO `point_transactions` VALUES (464, 8, 'consume', -8, 1066, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_2e2863fc-c938-4259-9204-626591b453c8]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 12:39:59.218');
INSERT INTO `point_transactions` VALUES (465, 47, 'consume', -8, 84, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754829826209_40f0ei142]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 12:44:07.505');
INSERT INTO `point_transactions` VALUES (466, 47, 'consume', -8, 76, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_46ab456a-7a21-4275-bf5f-9f2f39f906fa]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 12:44:27.007');
INSERT INTO `point_transactions` VALUES (467, 8, 'consume', -8, 1058, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [ai_call_1754831163709_fguppnvxh]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 13:06:16.530');
INSERT INTO `point_transactions` VALUES (468, 8, 'consume', -8, 1050, 'claude-sonnet-4-20250514', 'multiple_choice', '搜题操作 [mcq_fe4094e5-c09d-4187-a9d1-0dd578c20caa]: 使用claude-sonnet-4-20250514模型处理选择题', NULL, '2025-08-10 13:06:24.403');

-- ----------------------------
-- Table structure for redis_sessions
-- ----------------------------
DROP TABLE IF EXISTS `redis_sessions`;
CREATE TABLE `redis_sessions`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NULL DEFAULT NULL,
  `data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `redis_sessions_session_id_key`(`session_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of redis_sessions
-- ----------------------------

-- ----------------------------
-- Table structure for usage_records
-- ----------------------------
DROP TABLE IF EXISTS `usage_records`;
CREATE TABLE `usage_records`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokens_used` int NULL DEFAULT NULL,
  `success` tinyint(1) NOT NULL DEFAULT 1,
  `error_msg` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `usage_records_user_id_fkey`(`user_id` ASC) USING BTREE,
  CONSTRAINT `usage_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of usage_records
-- ----------------------------

-- ----------------------------
-- Table structure for user_configs
-- ----------------------------
DROP TABLE IF EXISTS `user_configs`;
CREATE TABLE `user_configs`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `programming_model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  `multiple_choice_model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  `ai_model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'claude-sonnet-4-20250514',
  `selected_provider` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'claude',
  `extraction_model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'claude-sonnet-4-20250514',
  `solution_model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'claude-sonnet-4-20250514',
  `debugging_model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'claude-sonnet-4-20250514',
  `language` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'python',
  `theme` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `opacity` double NOT NULL DEFAULT 1,
  `show_copy_button` tinyint(1) NOT NULL DEFAULT 1,
  `shortcuts` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `display` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `processing` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `user_configs_user_id_key`(`user_id` ASC) USING BTREE,
  CONSTRAINT `user_configs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 57 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of user_configs
-- ----------------------------
INSERT INTO `user_configs` VALUES (1, 1, 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20241022', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-07-20 02:36:54.121', '2025-07-20 02:36:54.121');
INSERT INTO `user_configs` VALUES (2, 5, 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20241022', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-07-20 07:20:44.595', '2025-07-20 07:20:44.595');
INSERT INTO `user_configs` VALUES (9, 8, 'gpt-4o', 'claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'Java', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-07-20 08:11:32.394', '2025-07-20 08:11:32.394');
INSERT INTO `user_configs` VALUES (10, 9, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'C++', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-07-20 16:31:45.680', '2025-07-20 16:31:45.680');
INSERT INTO `user_configs` VALUES (11, 10, 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20241022', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-07-20 16:41:38.694', '2025-07-20 16:41:38.694');
INSERT INTO `user_configs` VALUES (12, 11, 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20241022', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-07-20 16:42:59.730', '2025-07-20 16:42:59.730');
INSERT INTO `user_configs` VALUES (13, 12, 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20241022', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-07-24 11:07:02.651', '2025-07-24 11:07:02.651');
INSERT INTO `user_configs` VALUES (14, 13, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-03 15:07:00.299', '2025-08-03 15:07:00.299');
INSERT INTO `user_configs` VALUES (15, 14, 'o4-mini-high-all', 'gpt-4o', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'C++', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-08 02:09:31.183', '2025-08-08 02:09:31.183');
INSERT INTO `user_configs` VALUES (16, 15, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-08 11:04:53.970', '2025-08-08 11:04:53.970');
INSERT INTO `user_configs` VALUES (17, 16, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-08 13:13:19.019', '2025-08-08 13:13:19.019');
INSERT INTO `user_configs` VALUES (18, 17, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-08 14:20:19.610', '2025-08-08 14:20:19.610');
INSERT INTO `user_configs` VALUES (19, 18, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'Java', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-08 14:46:11.609', '2025-08-08 14:46:11.609');
INSERT INTO `user_configs` VALUES (20, 19, 'gpt-4o', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'Python', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-08 15:02:47.522', '2025-08-08 15:02:47.522');
INSERT INTO `user_configs` VALUES (21, 20, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'Python', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-08 15:22:00.218', '2025-08-08 15:22:00.218');
INSERT INTO `user_configs` VALUES (22, 21, 'gemini-2.5-flash-preview-04-17', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'Java', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-08 16:57:42.490', '2025-08-08 16:57:42.490');
INSERT INTO `user_configs` VALUES (23, 22, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-08 17:18:21.161', '2025-08-08 17:18:21.161');
INSERT INTO `user_configs` VALUES (24, 23, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-08 17:45:07.230', '2025-08-08 17:45:07.230');
INSERT INTO `user_configs` VALUES (25, 24, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'Python', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-08 18:17:10.741', '2025-08-08 18:17:10.741');
INSERT INTO `user_configs` VALUES (26, 25, 'gemini-2.5-flash-preview-04-17', 'gpt-4o-mini', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-09 00:58:44.808', '2025-08-09 00:58:44.808');
INSERT INTO `user_configs` VALUES (27, 26, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'Python', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-09 01:21:45.337', '2025-08-09 01:21:45.337');
INSERT INTO `user_configs` VALUES (28, 27, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-09 04:42:15.450', '2025-08-09 04:42:15.450');
INSERT INTO `user_configs` VALUES (29, 28, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'Java', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-09 06:13:58.887', '2025-08-09 06:13:58.887');
INSERT INTO `user_configs` VALUES (30, 29, 'gpt-4o', 'gpt-4o', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'Java', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-09 06:30:20.838', '2025-08-09 06:30:20.838');
INSERT INTO `user_configs` VALUES (31, 30, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-09 06:45:49.732', '2025-08-09 06:45:49.732');
INSERT INTO `user_configs` VALUES (32, 31, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-09 06:51:13.227', '2025-08-09 06:51:13.227');
INSERT INTO `user_configs` VALUES (33, 32, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-09 07:10:12.711', '2025-08-09 07:10:12.711');
INSERT INTO `user_configs` VALUES (34, 33, 'claude-sonnet-4-20250514', 'gpt-4o-mini', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'Java', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-09 08:36:28.610', '2025-08-09 08:36:28.610');
INSERT INTO `user_configs` VALUES (35, 34, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-09 08:39:02.577', '2025-08-09 08:39:02.577');
INSERT INTO `user_configs` VALUES (36, 35, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-09 09:16:55.237', '2025-08-09 09:16:55.237');
INSERT INTO `user_configs` VALUES (37, 36, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-09 12:31:14.030', '2025-08-09 12:31:14.030');
INSERT INTO `user_configs` VALUES (38, 37, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-09 13:00:29.059', '2025-08-09 13:00:29.059');
INSERT INTO `user_configs` VALUES (39, 38, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-09 13:00:29.331', '2025-08-09 13:00:29.331');
INSERT INTO `user_configs` VALUES (40, 39, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-09 14:44:24.156', '2025-08-09 14:44:24.156');
INSERT INTO `user_configs` VALUES (41, 40, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-09 15:28:31.903', '2025-08-09 15:28:31.903');
INSERT INTO `user_configs` VALUES (42, 41, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'C++', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-09 16:16:49.861', '2025-08-09 16:16:49.861');
INSERT INTO `user_configs` VALUES (43, 42, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-09 17:50:52.986', '2025-08-09 17:50:52.986');
INSERT INTO `user_configs` VALUES (44, 43, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-10 00:20:58.250', '2025-08-10 00:20:58.250');
INSERT INTO `user_configs` VALUES (45, 44, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-10 00:25:47.027', '2025-08-10 00:25:47.027');
INSERT INTO `user_configs` VALUES (46, 45, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-10 04:15:55.019', '2025-08-10 04:15:55.019');
INSERT INTO `user_configs` VALUES (47, 46, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-10 04:20:44.327', '2025-08-10 04:20:44.327');
INSERT INTO `user_configs` VALUES (48, 47, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'C++', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-10 06:28:04.176', '2025-08-10 06:28:04.176');
INSERT INTO `user_configs` VALUES (49, 48, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-10 06:38:03.867', '2025-08-10 06:38:03.867');
INSERT INTO `user_configs` VALUES (50, 49, 'claude-sonnet-4-20250514', 'gpt-4o', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-10 06:38:16.174', '2025-08-10 06:38:16.174');
INSERT INTO `user_configs` VALUES (51, 50, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-10 06:54:22.265', '2025-08-10 06:54:22.265');
INSERT INTO `user_configs` VALUES (52, 51, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'C++', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-10 07:00:12.735', '2025-08-10 07:00:12.735');
INSERT INTO `user_configs` VALUES (53, 52, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-10 07:20:40.120', '2025-08-10 07:20:40.120');
INSERT INTO `user_configs` VALUES (54, 53, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'Java', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-10 08:43:11.164', '2025-08-10 08:43:11.164');
INSERT INTO `user_configs` VALUES (55, 54, 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'python', 'system', 1, 1, NULL, NULL, NULL, '2025-08-10 08:54:08.839', '2025-08-10 08:54:08.839');
INSERT INTO `user_configs` VALUES (56, 55, 'claude-sonnet-4-20250514', 'gpt-4o', 'claude-sonnet-4-20250514', 'claude', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514', 'C++', 'system', 1, 1, '{\"takeScreenshot\":\"F1\",\"openQueue\":\"F2\",\"openSettings\":\"F3\"}', '{\"opacity\":1,\"position\":\"top-right\",\"autoHide\":false,\"hideDelay\":3000}', '{\"autoProcess\":true,\"saveScreenshots\":false,\"compressionLevel\":0.8}', '2025-08-10 11:36:52.545', '2025-08-10 11:36:52.545');

-- ----------------------------
-- Table structure for user_sessions
-- ----------------------------
DROP TABLE IF EXISTS `user_sessions`;
CREATE TABLE `user_sessions`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `refresh_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `user_sessions_token_key`(`token` ASC) USING BTREE,
  UNIQUE INDEX `user_sessions_refresh_token_key`(`refresh_token` ASC) USING BTREE,
  INDEX `user_sessions_user_id_fkey`(`user_id` ASC) USING BTREE,
  CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of user_sessions
-- ----------------------------

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('user','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `points` int NOT NULL DEFAULT 100,
  `invite_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `inviter_id` int NULL DEFAULT NULL,
  `invited_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `users_username_key`(`username` ASC) USING BTREE,
  UNIQUE INDEX `users_email_key`(`email` ASC) USING BTREE,
  UNIQUE INDEX `users_invite_code_key`(`invite_code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 56 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (1, 'admin', 'admin@interview-coder.com', '$2a$10$a8hZ6UEMilSk3gFf7VkvHOzX0Zyn9EK9HeITxD6qV3RVIc83ajP7i', 'admin', 1, 2000, NULL, NULL, NULL, '2025-07-20 02:36:54.104', '2025-07-20 16:21:15.602');
INSERT INTO `users` VALUES (5, '123456', '123456@test.com', '$2a$10$8T3RQFnvWQVF48ZPffvOGOI4p.h3meNs39styeFtGIHSp9bLBINKe', 'user', 1, 100, NULL, NULL, NULL, '2025-07-20 07:20:44.595', '2025-07-20 07:20:44.595');
INSERT INTO `users` VALUES (8, 'jianxin', '1751940279@qq.com', '$2a$10$mXEsf.UOwdhq0oD69wlHQeBg7Q3ejQenwTLmhvLOZNMa3oF53iehy', 'admin', 1, 1050, NULL, NULL, NULL, '2025-07-20 08:11:32.394', '2025-08-10 13:06:24.394');
INSERT INTO `users` VALUES (9, 'shuaidi', '1326194964@qq.com', '$2a$10$dmD5AiDKa7DZ/yjZ8.HmXOhWoGEtjyZ1WJlgjLiSw.NhaPEfaCPpK', 'admin', 1, 2470, NULL, NULL, NULL, '2025-07-20 16:31:45.680', '2025-08-07 18:35:37.097');
INSERT INTO `users` VALUES (10, 'qiu_di_lin5', 'qiu_di_lin5@163.com', '$2a$10$G9aQDoKPH20MrLQaXWDeJuhzp1sRQCGC5l0UJ3WEWCoq7p6y6SCS6', 'user', 1, 100, NULL, NULL, NULL, '2025-07-20 16:41:38.694', '2025-07-20 16:41:38.694');
INSERT INTO `users` VALUES (11, 'zixin', 'zixin01.wu@vipshop.com', '$2a$10$X8K6OXEJHcKNE3KnDR2fT.SjBWX1v2FtCeSftlZIagdU5XdH5P4E2', 'user', 1, 100, NULL, NULL, NULL, '2025-07-20 16:42:59.730', '2025-07-20 16:42:59.730');
INSERT INTO `users` VALUES (12, 'qqhl', '2643206988@qq.com', '$2a$10$7bYSLoL4VuHkxyfPt41k1OIIhB977NlLJb.roliLlXpMHrJ7cnQW2', 'user', 1, 110, NULL, NULL, NULL, '2025-07-24 11:07:02.651', '2025-07-28 09:58:52.975');
INSERT INTO `users` VALUES (13, 'jx', '2694954588@qq.com', '$2a$10$rkf1Lvahkmm3ke.kXynWeuIFzN66g6YeWx6MYMtdm.XePIgqtee4.', 'user', 1, 100, NULL, NULL, NULL, '2025-08-03 15:07:00.299', '2025-08-03 15:07:00.299');
INSERT INTO `users` VALUES (14, '17862327715', '17862327715@163.com', '$2a$10$hwbstABOOjkNyuxXdgA5vObE9eLGbfUptFngKWAqkGerZlUDdX4DG', 'user', 1, 5316, NULL, NULL, NULL, '2025-08-08 02:09:31.183', '2025-08-09 08:44:11.612');
INSERT INTO `users` VALUES (15, '86', '863619472@qq.com', '$2a$10$X.8r3vZXSKtuM0NYTxS1EOPlwesfNx30kzYnDofX5L1DrRjzL4f.y', 'user', 1, 100, NULL, NULL, NULL, '2025-08-08 11:04:53.970', '2025-08-08 11:04:53.970');
INSERT INTO `users` VALUES (16, 'xa', '2554070285@qq.com', '$2a$10$DT/f9kOW33LK8c2kbRA.BOZO1HNsVLEkCQreZMXuWY1m8VC/Z1xh6', 'user', 1, 100, NULL, NULL, NULL, '2025-08-08 13:13:19.019', '2025-08-08 13:13:19.019');
INSERT INTO `users` VALUES (17, '450883023', '450883023@qq.com', '$2a$10$QcW2CZxD1b1Qr03DNK4UF.b0C/A/DFcrxtzrXum/GMWLSABQnKpbC', 'user', 1, 100, NULL, NULL, NULL, '2025-08-08 14:20:19.610', '2025-08-08 14:20:19.610');
INSERT INTO `users` VALUES (18, '2319890353', '2319890353@qq.com', '$2a$10$ONR21CxE8NgpKxsexfQSF.Pqj9VaQYuViSkHQbgNShbpnHkQRzMl2', 'user', 1, 288, NULL, NULL, NULL, '2025-08-08 14:46:11.609', '2025-08-09 02:51:33.664');
INSERT INTO `users` VALUES (19, 'inaomIIsFarell', '1344594208@qq.com', '$2a$10$8vBP.ILkGyiUwdXZO8WXDOhbBwJANpHjcgrnCIx51Lo80R7WzxLUm', 'user', 1, 266, NULL, NULL, NULL, '2025-08-08 15:02:47.522', '2025-08-08 15:19:31.208');
INSERT INTO `users` VALUES (20, '1273949318', '1273949318@qq.com', '$2a$10$s.GAyZhQ9ManQlUOFw5.2.YfM43uf6j7FnUt5AYKEXt4dQuCKfSt.', 'user', 1, 88, NULL, NULL, NULL, '2025-08-08 15:22:00.218', '2025-08-08 15:23:37.439');
INSERT INTO `users` VALUES (21, '15229216182', '15229216182@163.com', '$2a$10$NWjMeC0Wvh3Pqbqk7DtF9e85fyq9tIcrVZvxXAuYTdXTirZJd22HC', 'user', 1, 48, NULL, NULL, NULL, '2025-08-08 16:57:42.490', '2025-08-10 11:08:02.076');
INSERT INTO `users` VALUES (22, 'ssff0320@163.com', 'ssff0320@163.com', '$2a$10$hZCRXczQ1DCc1P7ZEBuYp.or4myZ7xhwDgzB9HmoMYjM7Aq5kmW7C', 'user', 1, 100, NULL, NULL, NULL, '2025-08-08 17:18:21.161', '2025-08-08 17:18:21.161');
INSERT INTO `users` VALUES (23, '1191019302', '1191019302@qq.com', '$2a$10$gwDuOg6fZyLuwPjuUMr0YOvvOMEZUtbrNPSlf7d.acPVMC3cBuEYi', 'user', 1, 100, NULL, NULL, NULL, '2025-08-08 17:45:07.230', '2025-08-08 17:45:07.230');
INSERT INTO `users` VALUES (24, 'youyuanyi', '954990765@qq.com', '$2a$10$H/lfC7c1T/HyCvSbLfEjYer2tys/WFMycQhT6IbWFOMZZzYEVhzVS', 'user', 1, 276, NULL, NULL, NULL, '2025-08-08 18:17:10.741', '2025-08-09 03:01:00.685');
INSERT INTO `users` VALUES (25, 'pengq0208@163.com', 'pengq0208@163.com', '$2a$10$3uxltZLWSCS5dWfpgXhJtex6UWK8Lo3xj0qv9UBLGtnPUemHvcHj2', 'user', 1, 54, NULL, NULL, NULL, '2025-08-09 00:58:44.808', '2025-08-09 01:45:12.165');
INSERT INTO `users` VALUES (26, 'xzl', '1834310312@qq.com', '$2a$10$BuABgn20SdKS4AG06rS3seoXdNmymqjxseXFH5W2y4YSpayLGoqLO', 'user', 1, 100, NULL, NULL, NULL, '2025-08-09 01:21:45.337', '2025-08-09 01:21:45.337');
INSERT INTO `users` VALUES (27, '111', '1402626541@qq.com', '$2a$10$QTwEEn3ucmxTEVH4jmuKl.H5Rg08mk7gp6HPBD8d.OkxZP4AaZGta', 'user', 1, 56, NULL, NULL, NULL, '2025-08-09 04:42:15.450', '2025-08-09 04:58:37.790');
INSERT INTO `users` VALUES (28, 'phoenix', '1316691009@qq.com', '$2a$10$/4kULodJE.2gd0rYUnHwhelRXmp4oasliekrZeIA0Z3Nj4dULF5Aa', 'user', 1, 268, NULL, NULL, NULL, '2025-08-09 06:13:58.887', '2025-08-10 08:39:23.762');
INSERT INTO `users` VALUES (29, 'birenyin@163.com', 'birenyin@163.com', '$2a$10$CvOKPwNFEA2lnvG0GVDroOGlRR5bbtgg8VJHbdXjBmPz6iOg66XQe', 'user', 1, 516, NULL, NULL, NULL, '2025-08-09 06:30:20.838', '2025-08-09 07:27:51.712');
INSERT INTO `users` VALUES (30, '2726153489', '2726153489@qq.com', '$2a$10$jSTegfEKv5fQKcs1Es7gPuONsByJbP3Ex92xBXZWPFuYeAFKKYRC6', 'user', 1, 100, NULL, NULL, NULL, '2025-08-09 06:45:49.732', '2025-08-09 06:45:49.732');
INSERT INTO `users` VALUES (31, 'QING', '2879795668@qq.com', '$2a$10$YsPyArDtrSknAHYJKGyj1.J8ztxwIdCSPXAJnuyfuV1J.9w0Qve..', 'user', 1, 100, NULL, NULL, NULL, '2025-08-09 06:51:13.227', '2025-08-09 06:51:13.227');
INSERT INTO `users` VALUES (32, '2509493896', '2509493896@qq.com', '$2a$10$M1zgI6MwgvD2PoCP8XGN7OnZ2O6ifjY704uuEyAp6WywWrc8xmbxy', 'user', 1, 100, NULL, NULL, NULL, '2025-08-09 07:10:12.711', '2025-08-09 07:10:12.711');
INSERT INTO `users` VALUES (33, '2414570075@qq.com', '2414570075@qq.com', '$2a$10$Bf9Q2CHEJgLX0T1XELjy7eILPE04WAhDKdZV0hRp16Y7HO/dSyGbO', 'user', 1, 200, NULL, NULL, NULL, '2025-08-09 08:36:28.610', '2025-08-10 07:10:25.180');
INSERT INTO `users` VALUES (34, '2680723684@qq.com', '2680723684@qq.com', '$2a$10$iYLBfVbWqgZEGmTSoopyEuSTTinw46KhLeWqNU2fB.Aub6I1766cS', 'user', 1, 100, NULL, NULL, NULL, '2025-08-09 08:39:02.577', '2025-08-09 08:39:02.577');
INSERT INTO `users` VALUES (35, 'kailang', '2895594596@qq.com', '$2a$10$94nN7dBVSUnZjekvKKO/5O3VxyeRM/jSSyvMlNjeLCz0i6ksEokGe', 'user', 1, 80, NULL, NULL, NULL, '2025-08-09 09:16:55.237', '2025-08-09 09:21:23.268');
INSERT INTO `users` VALUES (36, '3183944476', '3183944476@qq.com', '$2a$10$thAq6/.khNmceQSboEiXheQHqa0TStoIYq/hrsrgy6PmwMoYA/cjO', 'user', 1, 92, NULL, NULL, NULL, '2025-08-09 12:31:14.030', '2025-08-09 12:38:36.807');
INSERT INTO `users` VALUES (37, 'Sep.', '858187143@qq.com', '$2a$10$mt11oHsqtl0w80pJ7uI5e.KinFPm/rD62blhAMFWfYb7/SW7oUTzS', 'user', 1, 100, NULL, NULL, NULL, '2025-08-09 13:00:29.059', '2025-08-09 13:00:29.059');
INSERT INTO `users` VALUES (38, '1876185406', '1876185406@qq.com', '$2a$10$Bi4YNTcnUNcZyMH6NESrjew6W4GUPPvN.ebtRE7c6cLguxnRB8WMi', 'user', 1, 100, NULL, NULL, NULL, '2025-08-09 13:00:29.331', '2025-08-09 13:00:29.331');
INSERT INTO `users` VALUES (39, '812622644@qq.com', '812622644@qq.com', '$2a$10$L0M930IvD0WiP2Ete.BjdugkZJ6By.baVJHuyKETUDw7nlxJzN1WC', 'user', 1, 100, NULL, NULL, NULL, '2025-08-09 14:44:24.156', '2025-08-09 14:44:24.156');
INSERT INTO `users` VALUES (40, 'zedshen1001', 'zedshen1001@163.com', '$2a$10$9RwENX5SOwZIAL5f4MrWq.jbP1XH03T4pSkHL39.e88rwHzSLwutS', 'user', 1, 100, NULL, NULL, NULL, '2025-08-09 15:28:31.903', '2025-08-09 15:28:31.903');
INSERT INTO `users` VALUES (41, '就选c', '2410807673@qq.com', '$2a$10$h7apxx7yuUxtGeGlTEa0punhr6STV9XGcgiGSty3IthcPIW3tjQnW', 'user', 1, 300, NULL, NULL, NULL, '2025-08-09 16:16:49.861', '2025-08-10 05:04:12.985');
INSERT INTO `users` VALUES (42, 'rhx0125cug', 'rhx0125cug@163.com', '$2a$10$phwbLMhK7qx3aO0SuGpUcO/LEiU/9WAX8yQQZyxYLWmeAy2PFPm9u', 'user', 1, 5800, NULL, NULL, NULL, '2025-08-09 17:50:52.986', '2025-08-10 05:27:21.731');
INSERT INTO `users` VALUES (43, '3495956325', '3495956325@qq.com', '$2a$10$GJwnHcGeS5jrNEz0tPdHH.dS2gibYWle7u4EHJKalbRLcgoHpEdWO', 'user', 1, 84, NULL, NULL, NULL, '2025-08-10 00:20:58.250', '2025-08-10 00:24:40.419');
INSERT INTO `users` VALUES (44, 'silencyuan', 'silencyuan@outlook.com', '$2a$10$6TSUWmGMigQC8LJ8LQCrsOpJWgYUnil86RW4KNPsen4PjJpIfIih2', 'user', 1, 92, NULL, NULL, NULL, '2025-08-10 00:25:47.027', '2025-08-10 00:27:35.442');
INSERT INTO `users` VALUES (45, 'pjs', '3244049519@qq.com', '$2a$10$a1Edf/XDIrmJvGUF9ngMEONKPunZPdGvhRwa7SUC9ngzyyf7.gG5O', 'user', 1, 100, NULL, NULL, NULL, '2025-08-10 04:15:55.019', '2025-08-10 04:15:55.019');
INSERT INTO `users` VALUES (46, 'zhouhaoren', '984149846@qq.com', '$2a$10$4NeWuMAz6DeB.I47g3v1nuEt3f0Js2ttH98I2qioM3Jilr2iBQ4Ie', 'user', 1, 300, NULL, NULL, NULL, '2025-08-10 04:20:44.327', '2025-08-10 04:40:26.146');
INSERT INTO `users` VALUES (47, '3498000497', '3498000497@qq.COM', '$2a$10$2IzkE1vNGUzJYwOPiS7D1uPX.wmXEoZX3gyNXyzuYA5OSAhT/zm8y', 'user', 1, 76, NULL, NULL, NULL, '2025-08-10 06:28:04.176', '2025-08-10 12:44:27.001');
INSERT INTO `users` VALUES (48, 'yetimhr', 'yetimhr@163.com', '$2a$10$VrlZDhOFF.e79MS71g4TzekC50FqRLYABNaWiaCp9.sCEp38/5X3.', 'user', 1, 100, NULL, NULL, NULL, '2025-08-10 06:38:03.867', '2025-08-10 06:38:03.867');
INSERT INTO `users` VALUES (49, 'test123', 'web.fans@foxmail.com', '$2a$10$s60vEsv5yLDWX0RBuGH.veRNylFqEfiDOwoeqMEECBaQHCS0XOLhy', 'user', 1, 300, NULL, NULL, NULL, '2025-08-10 06:38:16.174', '2025-08-10 08:38:15.250');
INSERT INTO `users` VALUES (50, 'liuyapeng2004', 'liuyapeng2004@126.com', '$2a$10$sKWhmRSJO0GJ1JatogZ.tetdq87ygiJMzeqBXdImSLhmBqccuueii', 'user', 1, 100, NULL, NULL, NULL, '2025-08-10 06:54:22.265', '2025-08-10 06:54:22.265');
INSERT INTO `users` VALUES (51, 'chenjunjia60@gmail.com', 'chenjunjia60@gmail.com', '$2a$10$jPJA2HIUaBB/7UE1en3pduVhbFxcZbtR4/xxQH0PAxcvR/apn9zpK', 'user', 1, 76, NULL, NULL, NULL, '2025-08-10 07:00:12.735', '2025-08-10 09:49:56.065');
INSERT INTO `users` VALUES (52, '1780258140@qq.com', '1780258140@qq.com', '$2a$10$DP.r2CFUQjtgV6ktN4rp3eKiVmbuwbqHJjbKQ.rdFXxHwzGYccedq', 'user', 1, 100, NULL, NULL, NULL, '2025-08-10 07:20:40.120', '2025-08-10 07:20:40.120');
INSERT INTO `users` VALUES (53, 'ssss', '503613626@qq.com', '$2a$10$FMQzG2hX7GNTJSfMy2Oko.9lHuxkLzM.iAqkVKn9rDYi6.q6YHLze', 'user', 1, 260, NULL, NULL, NULL, '2025-08-10 08:43:11.164', '2025-08-10 11:25:38.657');
INSERT INTO `users` VALUES (54, 'laying2000@outlook.com', 'laying2000@outlook.com', '$2a$10$Rfe9OVCaQ88VJJoeNx1si.2nYUHoPsbixP3C8aBl0PxGMkFWbb9wK', 'user', 1, 100, NULL, NULL, NULL, '2025-08-10 08:54:08.839', '2025-08-10 08:54:08.839');
INSERT INTO `users` VALUES (55, 'zyh', '2570629834@qq.com', '$2a$10$oMMaKxYsVrH2/xbBYZbjted86QmtZzmLAQjsU2agBTBelglAiozDm', 'user', 1, 56, NULL, NULL, NULL, '2025-08-10 11:36:52.545', '2025-08-10 11:54:00.348');

SET FOREIGN_KEY_CHECKS = 1;
