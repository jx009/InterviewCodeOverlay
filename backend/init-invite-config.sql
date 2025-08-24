-- 初始化邀请配置数据
INSERT INTO invite_configs (config_key, config_value, description, is_active) VALUES
('REGISTER_REWARD', 30.00, '用户注册奖励积分', true),
('RECHARGE_COMMISSION_RATE', 10.00, '充值积分佣金比例(%)', true),
('MONEY_COMMISSION_RATE', 20.00, '流量手现金佣金比例(%)', true)
ON DUPLICATE KEY UPDATE
config_value = VALUES(config_value),
description = VALUES(description),
is_active = VALUES(is_active),
updated_at = NOW();