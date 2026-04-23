ALTER TABLE `memory_entries` ADD `lastAccessedAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `memory_entries` ADD `archived` int DEFAULT 0 NOT NULL;