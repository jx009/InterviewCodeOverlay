-- 插入测试套餐记录
INSERT INTO `interview_coder`.`payment_packages` (
    `id`,
    `name`, 
    `description`, 
    `amount`, 
    `points`, 
    `bonus_points`, 
    `is_active`, 
    `sort_order`, 
    `icon`, 
    `tags`, 
    `is_recommended`,
    `created_at`,
    `updated_at`
) VALUES (
    999,
    '测试套餐',
    '仅供测试使用，1分钱体验充值功能',
    0.01,
    1000,
    0,
    true,
    0,
    '🧪',
    JSON_ARRAY('测试专用'),
    false,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `amount` = VALUES(`amount`),
    `points` = VALUES(`points`),
    `bonus_points` = VALUES(`bonus_points`),
    `updated_at` = NOW();