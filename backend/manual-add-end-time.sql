-- 手动为 point_transactions 表添加 end_time 字段
-- 如果字段已存在，这个命令会失败，但不会影响表结构

ALTER TABLE `point_transactions` ADD COLUMN `end_time` DATETIME(3) NULL AFTER `created_at`;

-- 为新字段创建索引以优化查询性能
CREATE INDEX `point_transactions_end_time_idx` ON `point_transactions`(`end_time`);