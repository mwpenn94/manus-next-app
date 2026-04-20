CREATE TABLE `task_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskExternalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`feedback` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `task_ratings_taskExternalId_unique` UNIQUE(`taskExternalId`)
);
