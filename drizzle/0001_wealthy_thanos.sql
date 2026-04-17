CREATE TABLE `bridge_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bridgeUrl` text,
	`apiKey` text,
	`enabled` int NOT NULL DEFAULT 0,
	`lastConnected` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bridge_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `bridge_configs_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `task_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`actions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`status` enum('idle','running','completed','error') NOT NULL DEFAULT 'idle',
	`workspaceUrl` text,
	`currentStep` varchar(500),
	`totalSteps` int,
	`completedSteps` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `tasks_externalId_unique` UNIQUE(`externalId`)
);
