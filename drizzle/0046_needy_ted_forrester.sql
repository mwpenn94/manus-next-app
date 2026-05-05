ALTER TABLE `user_preferences` ADD `previewTier` varchar(32) DEFAULT 'auto';--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `vercelProjectId` varchar(128);--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `vercelTeamSlug` varchar(128);--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `codespaceScopeGranted` boolean DEFAULT false NOT NULL;