-- AlterTable
ALTER TABLE `users` ADD COLUMN `points` INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE `model_point_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `model_name` VARCHAR(100) NOT NULL,
    `question_type` ENUM('multiple_choice', 'programming') NOT NULL,
    `cost` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `model_point_configs_model_name_question_type_key`(`model_name`, `question_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `point_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `transaction_type` ENUM('consume', 'recharge', 'refund', 'reward') NOT NULL,
    `amount` INTEGER NOT NULL,
    `balance_after` INTEGER NOT NULL,
    `model_name` VARCHAR(100) NULL,
    `question_type` ENUM('multiple_choice', 'programming') NULL,
    `description` TEXT NULL,
    `metadata` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `point_transactions` ADD CONSTRAINT `point_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
