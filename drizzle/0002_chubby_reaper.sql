CREATE TABLE `check_in_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`checkInDate` varchar(10) NOT NULL,
	`consecutiveDays` int NOT NULL DEFAULT 1,
	`rewardClaimed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `check_in_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`imageUrl` text,
	`couponId` int,
	`status` enum('draft','scheduled','sent') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spin_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`mealPeriod` enum('breakfast','lunch','afternoon_tea','dinner','late_night') NOT NULL,
	`usedCount` int NOT NULL DEFAULT 0,
	`dailyCouponCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spin_limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `user_notification_reads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationId` int NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_notification_reads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `coupons` MODIFY COLUMN `type` enum('discount','gift','cashback','check_in_reward') NOT NULL DEFAULT 'discount';--> statement-breakpoint
ALTER TABLE `coupons` ADD `imageUrl` text;--> statement-breakpoint
ALTER TABLE `coupons` ADD `isCheckInReward` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `photoUrl` text;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `providesCheckInReward` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `spin_history` ADD `isExpired` boolean DEFAULT false NOT NULL;