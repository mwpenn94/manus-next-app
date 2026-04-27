CREATE TABLE IF NOT EXISTS `automation_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`mode` varchar(50) NOT NULL DEFAULT 'schedule',
	`triggerType` varchar(50) NOT NULL DEFAULT 'cron',
	`cronExpression` varchar(100),
	`intervalSeconds` int,
	`workflowDefinition` json,
	`status` enum('active','paused','completed','failed') NOT NULL DEFAULT 'active',
	`lastRunAt` bigint,
	`nextRunAt` bigint,
	`runCount` int NOT NULL DEFAULT 0,
	`lastRunResult` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `automation_schedules_userId_idx` ON `automation_schedules` (`userId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `automation_schedules_status_idx` ON `automation_schedules` (`status`);