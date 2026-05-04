ALTER TABLE `user_preferences` ADD `recursiveOptimizationEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `recursiveOptimizationDepth` int DEFAULT 3;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `recursiveOptimizationTemperature` varchar(32) DEFAULT 'balanced';