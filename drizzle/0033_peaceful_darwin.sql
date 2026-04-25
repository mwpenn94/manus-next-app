CREATE TABLE `aegis_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promptHash` varchar(64) NOT NULL,
	`prompt` text NOT NULL,
	`response` text NOT NULL,
	`taskType` varchar(64),
	`hitCount` int NOT NULL DEFAULT 0,
	`costSavedPerHit` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastHitAt` timestamp,
	CONSTRAINT `aegis_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `aegis_cache_promptHash_unique` UNIQUE(`promptHash`)
);
--> statement-breakpoint
CREATE TABLE `aegis_fragments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int,
	`fragmentType` varchar(64) NOT NULL,
	`content` text NOT NULL,
	`contentHash` varchar(64) NOT NULL,
	`taskTypes` json,
	`qualityScore` int,
	`useCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aegis_fragments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aegis_lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int,
	`lessonType` varchar(64) NOT NULL,
	`taskType` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`impact` varchar(16) NOT NULL DEFAULT 'medium',
	`applied` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aegis_lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aegis_patterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patternType` enum('prompt','decomposition','quality','anti_pattern','cost','caching') NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text NOT NULL,
	`content` text,
	`taskTypes` json,
	`effectiveness` int NOT NULL DEFAULT 50,
	`applyCount` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aegis_patterns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aegis_quality_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`completeness` int NOT NULL,
	`accuracy` int NOT NULL,
	`relevance` int NOT NULL,
	`clarity` int NOT NULL,
	`efficiency` int NOT NULL,
	`overallScore` int NOT NULL,
	`validationPassed` int NOT NULL DEFAULT 1,
	`validationErrors` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aegis_quality_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aegis_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskExternalId` varchar(64),
	`taskType` varchar(64) NOT NULL,
	`complexity` varchar(32),
	`cacheHit` int NOT NULL DEFAULT 0,
	`costCredits` int NOT NULL DEFAULT 0,
	`latencyMs` int NOT NULL DEFAULT 0,
	`inputTokens` int DEFAULT 0,
	`outputTokens` int DEFAULT 0,
	`provider` varchar(64),
	`model` varchar(128),
	`status` enum('pending','completed','failed','cached') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aegis_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `atlas_goal_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goalId` int NOT NULL,
	`planId` int,
	`description` text NOT NULL,
	`taskType` varchar(64),
	`executionOrder` int NOT NULL DEFAULT 0,
	`dependsOn` json,
	`status` enum('pending','running','completed','failed','skipped') NOT NULL DEFAULT 'pending',
	`output` text,
	`costCredits` int DEFAULT 0,
	`qualityScore` int,
	`provider` varchar(64),
	`aegisSessionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `atlas_goal_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `atlas_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`taskExternalId` varchar(64),
	`description` text NOT NULL,
	`strategy` varchar(64),
	`status` enum('pending','planning','executing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`totalCost` int NOT NULL DEFAULT 0,
	`avgQuality` int,
	`maxSteps` int DEFAULT 20,
	`maxCostCredits` int DEFAULT 1000,
	`maxDurationMs` bigint DEFAULT 300000,
	`reflection` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `atlas_goals_id` PRIMARY KEY(`id`),
	CONSTRAINT `atlas_goals_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `atlas_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goalId` int NOT NULL,
	`dag` json NOT NULL,
	`status` enum('draft','active','completed','failed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `atlas_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sovereign_providers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`providerType` varchar(64) NOT NULL,
	`baseUrl` text,
	`model` varchar(128) NOT NULL,
	`costPer1kInput` int NOT NULL DEFAULT 10,
	`costPer1kOutput` int NOT NULL DEFAULT 30,
	`maxContextTokens` int DEFAULT 128000,
	`capabilities` json,
	`isActive` int NOT NULL DEFAULT 1,
	`circuitState` enum('closed','open','half_open') NOT NULL DEFAULT 'closed',
	`consecutiveFailures` int NOT NULL DEFAULT 0,
	`circuitOpenedAt` timestamp,
	`successRate` int NOT NULL DEFAULT 100,
	`avgLatencyMs` int DEFAULT 1000,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sovereign_providers_id` PRIMARY KEY(`id`),
	CONSTRAINT `sovereign_providers_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `sovereign_routing_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`aegisSessionId` int,
	`taskType` varchar(64) NOT NULL,
	`strategy` enum('cheapest_viable','balanced','quality_maximized') NOT NULL DEFAULT 'balanced',
	`chosenProvider` varchar(128) NOT NULL,
	`chosenScore` int,
	`candidates` json,
	`success` int NOT NULL DEFAULT 1,
	`fallbackUsed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sovereign_routing_decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sovereign_usage_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`aegisSessionId` int,
	`inputTokens` int NOT NULL DEFAULT 0,
	`outputTokens` int NOT NULL DEFAULT 0,
	`costMillicredits` int NOT NULL DEFAULT 0,
	`latencyMs` int NOT NULL DEFAULT 0,
	`success` int NOT NULL DEFAULT 1,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sovereign_usage_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `aegis_cache_hash_idx` ON `aegis_cache` (`promptHash`);--> statement-breakpoint
CREATE INDEX `aegis_sessions_user_idx` ON `aegis_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `aegis_sessions_task_idx` ON `aegis_sessions` (`taskExternalId`);--> statement-breakpoint
CREATE INDEX `atlas_goal_tasks_goal_idx` ON `atlas_goal_tasks` (`goalId`);--> statement-breakpoint
CREATE INDEX `atlas_goals_user_idx` ON `atlas_goals` (`userId`);--> statement-breakpoint
CREATE INDEX `atlas_goals_task_idx` ON `atlas_goals` (`taskExternalId`);--> statement-breakpoint
CREATE INDEX `sovereign_usage_provider_idx` ON `sovereign_usage_logs` (`providerId`);