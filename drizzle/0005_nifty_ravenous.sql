ALTER TABLE `users` DROP INDEX `users_phone_unique`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `spin_history` DROP COLUMN `isShared`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `phone`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `deviceId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `deviceBoundAt`;