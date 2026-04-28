CREATE TABLE `data_pipeline_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pipelineId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('running','completed','failed','cancelled') NOT NULL DEFAULT 'running',
	`recordsProcessed` int DEFAULT 0,
	`recordsFailed` int DEFAULT 0,
	`durationMs` int,
	`errorMessage` text,
	`metadata` json,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `data_pipeline_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_pipelines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`pipelineType` varchar(50) NOT NULL DEFAULT 'etl',
	`sourceConfig` json,
	`transformSteps` json,
	`destinationConfig` json,
	`schedule` varchar(100),
	`accessTier` varchar(50) NOT NULL DEFAULT 'internal',
	`qualityScore` int,
	`status` enum('draft','active','paused','error','archived') NOT NULL DEFAULT 'draft',
	`lastRunAt` timestamp,
	`runCount` int DEFAULT 0,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_pipelines_id` PRIMARY KEY(`id`),
	CONSTRAINT `data_pipelines_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `memory_embeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memoryEntryId` int NOT NULL,
	`userId` int NOT NULL,
	`embeddedText` text NOT NULL,
	`embedding` json NOT NULL,
	`model` varchar(100) NOT NULL DEFAULT 'text-embedding-3-small',
	`dimensions` int NOT NULL DEFAULT 1536,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memory_embeddings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_execution_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('running','completed','failed','cancelled') NOT NULL DEFAULT 'running',
	`output` text,
	`errorMessage` text,
	`durationMs` int,
	`triggerType` varchar(50) NOT NULL DEFAULT 'scheduled',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `schedule_execution_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `data_pipeline_runs_pipeline_idx` ON `data_pipeline_runs` (`pipelineId`);--> statement-breakpoint
CREATE INDEX `data_pipelines_user_idx` ON `data_pipelines` (`userId`);--> statement-breakpoint
CREATE INDEX `memory_embeddings_memory_idx` ON `memory_embeddings` (`memoryEntryId`);--> statement-breakpoint
CREATE INDEX `memory_embeddings_user_idx` ON `memory_embeddings` (`userId`);--> statement-breakpoint
CREATE INDEX `schedule_execution_history_schedule_idx` ON `schedule_execution_history` (`scheduleId`);--> statement-breakpoint
CREATE INDEX `schedule_execution_history_user_idx` ON `schedule_execution_history` (`userId`);