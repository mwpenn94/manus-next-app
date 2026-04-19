CREATE TABLE `connectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`connectorId` varchar(128) NOT NULL,
	`name` varchar(256) NOT NULL,
	`config` json,
	`status` enum('connected','disconnected','error') DEFAULT 'disconnected',
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `connectors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meeting_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` int,
	`title` varchar(512),
	`audioUrl` text,
	`transcript` text,
	`summary` text,
	`actionItems` json,
	`duration` int,
	`status` enum('recording','transcribing','summarizing','ready','error') DEFAULT 'recording',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meeting_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`skillId` varchar(128) NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`category` varchar(64),
	`version` varchar(32) DEFAULT '1.0.0',
	`config` json,
	`enabled` boolean DEFAULT true,
	`installedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `slide_decks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`prompt` text,
	`template` varchar(64) DEFAULT 'blank',
	`slides` json,
	`exportUrl` text,
	`status` enum('generating','ready','error') DEFAULT 'generating',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `slide_decks_id` PRIMARY KEY(`id`)
);
