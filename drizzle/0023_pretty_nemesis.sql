CREATE TABLE `task_branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childTaskId` int NOT NULL,
	`parentTaskId` int NOT NULL,
	`branchPointMessageId` int NOT NULL,
	`label` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`prompt` text NOT NULL,
	`icon` varchar(64) DEFAULT 'Sparkles',
	`category` varchar(64),
	`usageCount` int NOT NULL DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_templates_id` PRIMARY KEY(`id`)
);
