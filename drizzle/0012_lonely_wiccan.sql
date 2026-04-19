CREATE TABLE `app_builds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`mobileProjectId` int NOT NULL,
	`platform` enum('ios','android','web_pwa') NOT NULL,
	`buildMethod` enum('pwa_manifest','capacitor_local','github_actions','expo_eas','manual_xcode','manual_android_studio') NOT NULL,
	`status` enum('queued','building','success','failed','cancelled') NOT NULL DEFAULT 'queued',
	`artifactUrl` text,
	`buildLog` text,
	`workflowUrl` text,
	`storeMetadata` json,
	`version` varchar(32),
	`buildNumber` int DEFAULT 1,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `app_builds_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_builds_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `connected_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`deviceType` enum('desktop','android','ios','browser_only') NOT NULL,
	`connectionMethod` enum('electron_app','cloudflare_vnc','cdp_browser','adb_wireless','wda_rest','shortcuts_webhook') NOT NULL,
	`tunnelUrl` text,
	`pairingCode` varchar(16),
	`paired` int NOT NULL DEFAULT 0,
	`status` enum('online','offline','pairing','error') NOT NULL DEFAULT 'offline',
	`osInfo` varchar(128),
	`capabilities` json,
	`lastConnected` timestamp,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `connected_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `connected_devices_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `device_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`deviceId` int NOT NULL,
	`status` enum('active','paused','ended','error') NOT NULL DEFAULT 'active',
	`commandCount` int NOT NULL DEFAULT 0,
	`screenshotCount` int NOT NULL DEFAULT 0,
	`lastScreenshotUrl` text,
	`metadata` json,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `device_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_sessions_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `mobile_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`framework` enum('pwa','capacitor','expo') NOT NULL,
	`platforms` json NOT NULL,
	`bundleId` varchar(256),
	`displayName` varchar(256),
	`version` varchar(32) DEFAULT '1.0.0',
	`pwaManifest` json,
	`capacitorConfig` json,
	`expoConfig` json,
	`iconUrl` text,
	`splashUrl` text,
	`status` enum('draft','configured','building','ready') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mobile_projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `mobile_projects_externalId_unique` UNIQUE(`externalId`)
);
