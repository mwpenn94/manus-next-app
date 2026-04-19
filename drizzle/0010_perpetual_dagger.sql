CREATE TABLE `designs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`canvasState` json,
	`thumbnailUrl` text,
	`exportUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `designs_id` PRIMARY KEY(`id`),
	CONSTRAINT `designs_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`taskExternalId` varchar(64) NOT NULL,
	`createdBy` int NOT NULL,
	`activeParticipants` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`ownerId` int NOT NULL,
	`inviteCode` varchar(32) NOT NULL,
	`plan` enum('free','pro','enterprise') NOT NULL DEFAULT 'free',
	`creditBalance` int NOT NULL DEFAULT 1000,
	`maxSeats` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_externalId_unique` UNIQUE(`externalId`),
	CONSTRAINT `teams_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `webapp_builds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`prompt` text NOT NULL,
	`generatedHtml` text,
	`sourceCode` text,
	`publishedUrl` text,
	`publishedKey` text,
	`status` enum('draft','generating','ready','published','error') NOT NULL DEFAULT 'draft',
	`title` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webapp_builds_id` PRIMARY KEY(`id`),
	CONSTRAINT `webapp_builds_externalId_unique` UNIQUE(`externalId`)
);
