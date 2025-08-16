-- CreateTable
ALTER TABLE `point_transactions` ADD COLUMN `end_time` DATETIME(3) NULL AFTER `created_at`;

-- CreateIndex
CREATE INDEX `point_transactions_end_time_idx` ON `point_transactions`(`end_time`);