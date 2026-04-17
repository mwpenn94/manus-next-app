CREATE TABLE `workspace_artifacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`artifactType` enum('browser_screenshot','browser_url','code','terminal') NOT NULL,
	`label` varchar(500),
	`content` text,
	`url` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_artifacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `systemPrompt` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `archived` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `favorite` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `systemPrompt` text;