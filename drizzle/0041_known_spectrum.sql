CREATE TABLE `message_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskExternalId` varchar(64) NOT NULL,
	`messageIndex` int NOT NULL,
	`userId` int NOT NULL,
	`feedback` enum('up','down') NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `message_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `message_feedback_task_msg_idx` ON `message_feedback` (`taskExternalId`,`messageIndex`);--> statement-breakpoint
CREATE INDEX `message_feedback_user_idx` ON `message_feedback` (`userId`);