CREATE TABLE `page_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`path` varchar(512) NOT NULL DEFAULT '/',
	`referrer` text,
	`userAgent` varchar(512),
	`visitorHash` varchar(64),
	`country` varchar(8),
	`screenWidth` int,
	`viewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_views_id` PRIMARY KEY(`id`)
);
