CREATE INDEX `notifications_userId_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `taskMessages_taskId_idx` ON `task_messages` (`taskId`);--> statement-breakpoint
CREATE INDEX `tasks_userId_idx` ON `tasks` (`userId`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_projectId_idx` ON `tasks` (`projectId`);