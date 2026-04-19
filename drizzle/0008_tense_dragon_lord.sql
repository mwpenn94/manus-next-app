CREATE TABLE `project_knowledge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('instruction','file','note') NOT NULL DEFAULT 'note',
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`fileUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_knowledge_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(500) NOT NULL,
	`description` text,
	`systemPrompt` text,
	`icon` varchar(128),
	`archived` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `projectId` int;