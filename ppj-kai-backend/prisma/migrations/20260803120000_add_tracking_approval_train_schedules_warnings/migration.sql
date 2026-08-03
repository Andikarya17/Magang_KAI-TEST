-- AlterTable
ALTER TABLE `tracking`
  ADD COLUMN `approval_status` VARCHAR(20) NOT NULL DEFAULT 'not_approved',
  ADD COLUMN `safety_status` VARCHAR(20) NOT NULL DEFAULT 'aman',
  ADD COLUMN `approved_at` DATETIME(3) NULL,
  ADD COLUMN `approved_by` INTEGER NULL;

-- CreateTable
CREATE TABLE `train_schedules` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `train_code` VARCHAR(30) NOT NULL,
  `train_name` VARCHAR(100) NOT NULL,
  `origin` VARCHAR(150) NOT NULL,
  `destination` VARCHAR(150) NOT NULL,
  `departure_time` VARCHAR(5) NOT NULL,
  `arrival_time` VARCHAR(5) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_by` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `train_schedules_train_code_key`(`train_code`),
  INDEX `train_schedules_created_by_idx`(`created_by`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warning_alerts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `created_by` INTEGER NOT NULL,
  `latitude` DOUBLE NOT NULL,
  `longitude` DOUBLE NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `warning_alerts_created_at_idx`(`created_at`),
  INDEX `warning_alerts_expires_at_idx`(`expires_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tracking` ADD CONSTRAINT `tracking_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `train_schedules` ADD CONSTRAINT `train_schedules_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `warning_alerts` ADD CONSTRAINT `warning_alerts_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
