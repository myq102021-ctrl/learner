DROP INDEX `idx_tags_user_name`;--> statement-breakpoint
ALTER TABLE `tags` ADD `normalized_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tags_user_normalized_name` ON `tags` (`user_id`,`normalized_name`);