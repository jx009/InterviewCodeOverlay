-- CreateEnum
CREATE TABLE `invite_statuses` (
  `value` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`value`)
);
INSERT INTO `invite_statuses` (`value`) VALUES ('pending'), ('registered'), ('activated');

-- CreateEnum  
CREATE TABLE `commission_statuses` (
  `value` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`value`)
);
INSERT INTO `commission_statuses` (`value`) VALUES ('pending'), ('paid'), ('cancelled');

-- CreateEnum
CREATE TABLE `reward_types` (
  `value` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`value`)
);
INSERT INTO `reward_types` (`value`) VALUES ('register'), ('first_recharge'), ('commission');

-- CreateEnum
CREATE TABLE `reward_statuses` (
  `value` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`value`)
);
INSERT INTO `reward_statuses` (`value`) VALUES ('pending'), ('granted'), ('cancelled');

-- AlterTable
ALTER TABLE `users` ADD COLUMN `inviter_id` INTEGER NULL,
    ADD COLUMN `invite_code` VARCHAR(32) NULL,
    ADD COLUMN `invited_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `invite_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inviter_id` INTEGER NOT NULL,
    `invitee_id` INTEGER NOT NULL,
    `invite_code` VARCHAR(32) NOT NULL,
    `status` ENUM('pending', 'registered', 'activated') NOT NULL DEFAULT 'pending',
    `first_recharge_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `commission_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `commission_status` ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `invite_records_inviter_id_idx`(`inviter_id`),
    INDEX `invite_records_invitee_id_idx`(`invitee_id`),
    INDEX `invite_records_invite_code_idx`(`invite_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invite_rewards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inviter_id` INTEGER NOT NULL,
    `invitee_id` INTEGER NOT NULL,
    `reward_type` ENUM('register', 'first_recharge', 'commission') NOT NULL,
    `reward_amount` INTEGER NOT NULL,
    `reward_percentage` DECIMAL(5,2) NULL,
    `source_amount` DECIMAL(10,2) NULL,
    `description` TEXT NULL,
    `status` ENUM('pending', 'granted', 'cancelled') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `invite_rewards_inviter_id_idx`(`inviter_id`),
    INDEX `invite_rewards_invitee_id_idx`(`invitee_id`),
    INDEX `invite_rewards_reward_type_idx`(`reward_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_invite_code_key` ON `users`(`invite_code`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_inviter_id_fkey` FOREIGN KEY (`inviter_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invite_records` ADD CONSTRAINT `invite_records_inviter_id_fkey` FOREIGN KEY (`inviter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invite_records` ADD CONSTRAINT `invite_records_invitee_id_fkey` FOREIGN KEY (`invitee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invite_rewards` ADD CONSTRAINT `invite_rewards_inviter_id_fkey` FOREIGN KEY (`inviter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invite_rewards` ADD CONSTRAINT `invite_rewards_invitee_id_fkey` FOREIGN KEY (`invitee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE; 