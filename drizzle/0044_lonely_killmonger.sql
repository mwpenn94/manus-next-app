CREATE TABLE `orchestration_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`taskExternalId` varchar(64),
	`goal` text NOT NULL,
	`context` text,
	`status` enum('planning','executing','completed','failed','cancelled') NOT NULL DEFAULT 'planning',
	`agentCount` int NOT NULL DEFAULT 0,
	`taskCount` int NOT NULL DEFAULT 0,
	`completedCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`avgQuality` int NOT NULL DEFAULT 0,
	`plan` json,
	`taskResults` json,
	`finalResult` text,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orchestration_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `orchestration_runs_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE INDEX `orchestration_runs_user_idx` ON `orchestration_runs` (`userId`);--> statement-breakpoint
CREATE INDEX `orchestration_runs_task_idx` ON `orchestration_runs` (`taskExternalId`);--> statement-breakpoint
CREATE INDEX `orchestration_runs_status_idx` ON `orchestration_runs` (`status`);