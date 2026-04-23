CREATE TABLE `strategy_telemetry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskExternalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`stuckCount` int NOT NULL,
	`strategyLabel` varchar(64) NOT NULL,
	`triggerPattern` varchar(128),
	`outcome` enum('resolved','escalated','forced_final','pending') NOT NULL DEFAULT 'pending',
	`turnsBefore` int,
	`turnsAfter` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `strategy_telemetry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `strategy_telemetry_task_idx` ON `strategy_telemetry` (`taskExternalId`);--> statement-breakpoint
CREATE INDEX `strategy_telemetry_user_idx` ON `strategy_telemetry` (`userId`);