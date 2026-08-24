DROP INDEX `idx_tags_user_normalized_name`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tags_user_scope_name` ON `tags` (`user_id`,`type`,`parent_id`,`normalized_name`);--> statement-breakpoint
ALTER TABLE `learning_cards` ADD `personal_note` text;--> statement-breakpoint
ALTER TABLE `learning_diaries` ADD `entry_type` text DEFAULT 'feeling' NOT NULL;