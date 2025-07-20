-- AlterTable
ALTER TABLE `user_configs` MODIFY `extraction_model` VARCHAR(100) NULL DEFAULT 'claude-sonnet-4-20250514',
    MODIFY `solution_model` VARCHAR(100) NULL DEFAULT 'claude-sonnet-4-20250514',
    MODIFY `debugging_model` VARCHAR(100) NULL DEFAULT 'claude-sonnet-4-20250514';

-- CreateTable
CREATE TABLE `payment_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_no` VARCHAR(64) NOT NULL,
    `out_trade_no` VARCHAR(64) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `points` INTEGER NOT NULL,
    `bonus_points` INTEGER NOT NULL DEFAULT 0,
    `payment_method` ENUM('wechat_pay', 'alipay') NOT NULL,
    `payment_status` ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired') NOT NULL DEFAULT 'pending',
    `transaction_id` VARCHAR(64) NULL,
    `payment_time` DATETIME(3) NULL,
    `notify_time` DATETIME(3) NULL,
    `expire_time` DATETIME(3) NOT NULL,
    `package_id` INTEGER NULL,
    `metadata` TEXT NULL,
    `fail_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_orders_order_no_key`(`order_no`),
    UNIQUE INDEX `payment_orders_out_trade_no_key`(`out_trade_no`),
    INDEX `payment_orders_user_id_idx`(`user_id`),
    INDEX `payment_orders_order_no_idx`(`order_no`),
    INDEX `payment_orders_payment_status_idx`(`payment_status`),
    INDEX `payment_orders_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `points` INTEGER NOT NULL,
    `bonus_points` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `icon` VARCHAR(255) NULL,
    `tags` TEXT NULL,
    `is_recommended` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payment_packages_is_active_idx`(`is_active`),
    INDEX `payment_packages_sort_order_idx`(`sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_notify_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_no` VARCHAR(64) NOT NULL,
    `payment_method` ENUM('wechat_pay', 'alipay') NOT NULL,
    `notify_type` VARCHAR(50) NOT NULL,
    `request_body` TEXT NOT NULL,
    `request_headers` TEXT NULL,
    `response_status` INTEGER NOT NULL DEFAULT 200,
    `process_status` ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
    `error_message` TEXT NULL,
    `process_time` DATETIME(3) NULL,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_notify_logs_order_no_idx`(`order_no`),
    INDEX `payment_notify_logs_process_status_idx`(`process_status`),
    INDEX `payment_notify_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_orders` ADD CONSTRAINT `payment_orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_orders` ADD CONSTRAINT `payment_orders_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `payment_packages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
