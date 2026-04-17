CREATE TABLE `task_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskExternalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(512) NOT NULL,
	`fileKey` varchar(1024) NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(128),
	`size` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_files_id` PRIMARY KEY(`id`)
);
