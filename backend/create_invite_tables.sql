-- 添加邀请系统相关字段到 users 表
ALTER TABLE users 
ADD COLUMN invite_code VARCHAR(20) UNIQUE NULL COMMENT '邀请码',
ADD COLUMN inviter_id INT NULL COMMENT '邀请人ID',
ADD COLUMN invited_at DATETIME NULL COMMENT '被邀请时间';

-- 创建邀请记录表
CREATE TABLE invite_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inviter_id INT NOT NULL COMMENT '邀请人ID',
    invitee_id INT NOT NULL COMMENT '被邀请人ID',
    invite_code VARCHAR(20) NOT NULL COMMENT '邀请码',
    status VARCHAR(20) DEFAULT 'REGISTERED' COMMENT '状态：REGISTERED, ACTIVATED',
    first_recharge_amount DECIMAL(10,2) DEFAULT 0 COMMENT '首次充值金额',
    commission_amount DECIMAL(10,2) DEFAULT 0 COMMENT '佣金金额',
    commission_status VARCHAR(20) DEFAULT 'PENDING' COMMENT '佣金状态',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_invitee (invitee_id),
    INDEX idx_inviter (inviter_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请记录表';

-- 创建邀请奖励记录表
CREATE TABLE invite_rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inviter_id INT NOT NULL COMMENT '邀请人ID',
    invitee_id INT NOT NULL COMMENT '被邀请人ID',
    reward_type VARCHAR(20) NOT NULL COMMENT '奖励类型：REGISTER, FIRST_RECHARGE, COMMISSION',
    reward_amount INT NOT NULL COMMENT '奖励积分数量',
    description TEXT NULL COMMENT '奖励描述',
    status VARCHAR(20) DEFAULT 'GRANTED' COMMENT '状态：PENDING, GRANTED, FAILED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_inviter (inviter_id),
    INDEX idx_reward_type (reward_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请奖励记录表'; 