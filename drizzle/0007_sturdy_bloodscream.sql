CREATE TABLE `scheduled_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(500) NOT NULL,
	`prompt` text NOT NULL,
	`scheduleType` enum('cron','interval') NOT NULL,
	`cronExpression` varchar(128),
	`intervalSeconds` int,
	`repeat` int NOT NULL DEFAULT 1,
	`enabled` int NOT NULL DEFAULT 1,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`runCount` int NOT NULL DEFAULT 0,
	`lastStatus` enum('success','error','running'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`payload` text NOT NULL,
	`offsetMs` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_events_id` PRIMARY KEY(`id`)
);
