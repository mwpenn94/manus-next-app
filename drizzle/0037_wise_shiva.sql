CREATE TABLE `connector_health` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`connectorId` varchar(128) NOT NULL,
	`autoRefreshEnabled` boolean NOT NULL DEFAULT false,
	`lastRefreshAt` timestamp,
	`lastSyncAt` timestamp,
	`nextRefreshAt` timestamp,
	`refreshFailCount` int NOT NULL DEFAULT 0,
	`lastRefreshError` text,
	`healthStatus` enum('healthy','expiring_soon','expired','refresh_failed','no_token') NOT NULL DEFAULT 'no_token',
	`authMethodCategory` varchar(32),
	`supportsAutoRefresh` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `connector_health_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `connector_health_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`connectorId` varchar(128) NOT NULL,
	`eventType` enum('refresh_success','refresh_failed','auto_refresh_enabled','auto_refresh_disabled','manual_refresh','token_expired','connected','disconnected') NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `connector_health_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `connector_health_user_connector_idx` ON `connector_health` (`userId`,`connectorId`);--> statement-breakpoint
CREATE INDEX `health_logs_user_connector_idx` ON `connector_health_logs` (`userId`,`connectorId`);