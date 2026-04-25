ALTER TABLE `projects` ADD `pinned` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `sortOrder` int DEFAULT 0 NOT NULL;