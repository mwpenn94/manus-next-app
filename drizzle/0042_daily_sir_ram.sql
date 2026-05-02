CREATE TABLE `improvement_initiatives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`status` enum('proposed','in_progress','completed','on_hold') NOT NULL DEFAULT 'proposed',
	`impactScore` int NOT NULL DEFAULT 50,
	`owner` varchar(128),
	`linkedMetricIds` json,
	`startDate` timestamp,
	`targetDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `improvement_initiatives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `optimization_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cycleNumber` int NOT NULL,
	`phase` enum('assess','optimize','validate') NOT NULL DEFAULT 'assess',
	`status` enum('active','completed') NOT NULL DEFAULT 'active',
	`findings` json,
	`improvements` json,
	`validationResults` json,
	`startDate` timestamp NOT NULL DEFAULT (now()),
	`completedDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `optimization_cycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personalization_learning_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('preference_learned','pattern_detected','adaptation_applied','feedback_received') NOT NULL,
	`description` text NOT NULL,
	`confidence` int NOT NULL DEFAULT 50,
	`preferenceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `personalization_learning_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personalization_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`label` varchar(256) NOT NULL,
	`value` int NOT NULL DEFAULT 50,
	`confidence` int NOT NULL DEFAULT 50,
	`source` enum('explicit','inferred','default') NOT NULL DEFAULT 'default',
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `personalization_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personalization_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`condition` text NOT NULL,
	`action` text NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`impact` varchar(16) NOT NULL DEFAULT 'medium',
	`triggeredCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `personalization_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `process_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`currentValue` int NOT NULL DEFAULT 0,
	`previousValue` int NOT NULL DEFAULT 0,
	`targetValue` int NOT NULL DEFAULT 100,
	`unit` varchar(32) NOT NULL DEFAULT '%',
	`category` varchar(64) NOT NULL DEFAULT 'performance',
	`history` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `process_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `improvement_initiatives_user_idx` ON `improvement_initiatives` (`userId`);--> statement-breakpoint
CREATE INDEX `improvement_initiatives_status_idx` ON `improvement_initiatives` (`status`);--> statement-breakpoint
CREATE INDEX `optimization_cycles_user_idx` ON `optimization_cycles` (`userId`);--> statement-breakpoint
CREATE INDEX `personalization_learning_user_idx` ON `personalization_learning_log` (`userId`);--> statement-breakpoint
CREATE INDEX `personalization_prefs_user_category_idx` ON `personalization_preferences` (`userId`,`category`);--> statement-breakpoint
CREATE INDEX `personalization_rules_user_idx` ON `personalization_rules` (`userId`);--> statement-breakpoint
CREATE INDEX `process_metrics_user_idx` ON `process_metrics` (`userId`);