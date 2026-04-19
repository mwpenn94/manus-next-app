ALTER TABLE `connectors` ADD `authMethod` enum('oauth','api_key','webhook') DEFAULT 'api_key';--> statement-breakpoint
ALTER TABLE `connectors` ADD `accessToken` text;--> statement-breakpoint
ALTER TABLE `connectors` ADD `refreshToken` text;--> statement-breakpoint
ALTER TABLE `connectors` ADD `tokenExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `connectors` ADD `oauthScopes` text;