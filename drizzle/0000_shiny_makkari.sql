CREATE TABLE `merchant_restaurants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`merchantId` int NOT NULL,
	`restaurantId` int NOT NULL,
	`boundAt` timestamp NOT NULL DEFAULT (now()),
	`boundBy` int NOT NULL,
	CONSTRAINT `merchant_restaurants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactPhone` varchar(20),
	`contactEmail` varchar(320),
	`status` enum('active','suspended','inactive') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `merchants_id` PRIMARY KEY(`id`),
	CONSTRAINT `merchants_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`photoUrls` text,
	`isApproved` boolean NOT NULL DEFAULT false,
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restaurant_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_statistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`totalSpins` int NOT NULL DEFAULT 0,
	`breakfastSpins` int NOT NULL DEFAULT 0,
	`lunchSpins` int NOT NULL DEFAULT 0,
	`afternoonTeaSpins` int NOT NULL DEFAULT 0,
	`dinnerSpins` int NOT NULL DEFAULT 0,
	`lateNightSpins` int NOT NULL DEFAULT 0,
	`couponsIssued` int NOT NULL DEFAULT 0,
	`couponsRedeemed` int NOT NULL DEFAULT 0,
	`redemptionRate` int NOT NULL DEFAULT 0,
	`uniqueUsers` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restaurant_statistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_restaurants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`restaurantId` int NOT NULL,
	`role` enum('owner','manager') NOT NULL DEFAULT 'owner',
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`assignedBy` int NOT NULL,
	CONSTRAINT `user_restaurants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','merchant','admin') NOT NULL DEFAULT 'user';