ALTER TABLE `webapp_projects` ADD `sslCertArn` varchar(512);--> statement-breakpoint
ALTER TABLE `webapp_projects` ADD `sslStatus` enum('none','pending_validation','issued','failed','expired','revoked') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `webapp_projects` ADD `sslValidationRecords` json;