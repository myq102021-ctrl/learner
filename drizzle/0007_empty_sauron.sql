ALTER TABLE `tags` ADD `type` text DEFAULT 'attribute' NOT NULL;--> statement-breakpoint
ALTER TABLE `tags` ADD `parent_id` text;--> statement-breakpoint
ALTER TABLE `tags` ADD `description` text;--> statement-breakpoint
ALTER TABLE `tags` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_tags_user_type_parent` ON `tags` (`user_id`,`type`,`parent_id`,`sort_order`);
