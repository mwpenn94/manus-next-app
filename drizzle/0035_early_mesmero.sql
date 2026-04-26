ALTER TABLE `tasks` ADD `priority` int DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `timeoutSeconds` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `retryCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `maxRetries` int;