CREATE TABLE `app_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('general','feature_request','bug_report','praise') NOT NULL DEFAULT 'general',
	`title` varchar(500) NOT NULL,
	`content` text,
	`pageContext` varchar(500),
	`userAgent` text,
	`status` enum('new','acknowledged','in_progress','resolved','wont_fix') NOT NULL DEFAULT 'new',
	`adminResponse` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `app_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `app_feedback_userId_idx` ON `app_feedback` (`userId`);--> statement-breakpoint
CREATE INDEX `app_feedback_status_idx` ON `app_feedback` (`status`);