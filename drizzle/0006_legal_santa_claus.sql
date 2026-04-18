CREATE TABLE `memory_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`key` varchar(500) NOT NULL,
	`value` text NOT NULL,
	`source` enum('auto','user') NOT NULL DEFAULT 'auto',
	`taskExternalId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memory_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('task_completed','task_error','share_viewed','system') NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text,
	`taskExternalId` varchar(64),
	`read` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskExternalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`shareToken` varchar(64) NOT NULL,
	`passwordHash` text,
	`expiresAt` timestamp,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `task_shares_shareToken_unique` UNIQUE(`shareToken`)
);
--> statement-breakpoint
ALTER TABLE `workspace_artifacts` MODIFY COLUMN `artifactType` enum('browser_screenshot','browser_url','code','terminal','generated_image','document') NOT NULL;