ALTER TABLE `warning_alerts`
  ADD COLUMN `start_point_name` VARCHAR(200) NULL,
  ADD COLUMN `end_point_name` VARCHAR(200) NULL,
  ADD COLUMN `recipient_one_tracking_id` INTEGER NULL,
  ADD COLUMN `recipient_two_tracking_id` INTEGER NULL;
