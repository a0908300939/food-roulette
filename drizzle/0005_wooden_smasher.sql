CREATE TABLE `custom_wheel_styles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('canvas','image') NOT NULL DEFAULT 'canvas',
	`style` varchar(100) NOT NULL,
	`imageUrl` text,
	`config` text,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_wheel_styles_id` PRIMARY KEY(`id`)
);
