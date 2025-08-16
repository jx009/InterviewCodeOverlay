-- 创建 LLM 配置表
CREATE TABLE IF NOT EXISTS `llm_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(50) NOT NULL COMMENT '配置键名',
  `config_value` text NOT NULL COMMENT '配置值',
  `description` varchar(255) DEFAULT NULL COMMENT '配置描述',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='LLM配置表';

-- 插入默认配置（可以通过修改这些值来切换不同API厂商）
INSERT INTO `llm_config` (`config_key`, `config_value`, `description`) VALUES
('base_url', 'https://ismaque.org/v1', 'LLM API基础URL'),
('api_key', 'sk-xYuBFrEaKatCu3dqlRsoUx5RiUOuPsk1oDPi0WJEEiK1wloP', 'LLM API密钥'),
('max_retries', '2', '最大重试次数'),
('timeout', '30000', '请求超时时间(毫秒)'),
('provider', 'ismaque', '提供商名称')
ON DUPLICATE KEY UPDATE 
`config_value` = VALUES(`config_value`),
`updated_at` = CURRENT_TIMESTAMP;