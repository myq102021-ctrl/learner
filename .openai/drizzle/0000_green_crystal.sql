CREATE TABLE `directories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_directories_user_parent` ON `directories` (`user_id`,`parent_id`);--> statement-breakpoint
CREATE TABLE `learning_card_tags` (
	`learning_card_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`learning_card_id`, `tag_id`),
	FOREIGN KEY (`learning_card_id`) REFERENCES `learning_cards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `learning_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`card_type` text NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`explanation` text,
	`directory_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`directory_id`) REFERENCES `directories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_cards_user_status_created` ON `learning_cards` (`user_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `memory_states` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`learning_card_id` text NOT NULL,
	`status` text NOT NULL,
	`review_count` integer DEFAULT 0 NOT NULL,
	`lapse_count` integer DEFAULT 0 NOT NULL,
	`current_interval_days` integer DEFAULT 0 NOT NULL,
	`ease_factor` integer DEFAULT 250 NOT NULL,
	`last_rating` text,
	`last_review_at` integer,
	`next_review_at` integer NOT NULL,
	`scheduler_type` text DEFAULT 'ebbinghaus' NOT NULL,
	`scheduler_state` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learning_card_id`) REFERENCES `learning_cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memory_user_card` ON `memory_states` (`user_id`,`learning_card_id`);--> statement-breakpoint
CREATE INDEX `idx_memory_user_due` ON `memory_states` (`user_id`,`next_review_at`);--> statement-breakpoint
CREATE TABLE `parse_items` (
	`id` text PRIMARY KEY NOT NULL,
	`parse_task_id` text NOT NULL,
	`item_type` text NOT NULL,
	`order_index` integer NOT NULL,
	`status` text NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`raw_output` text,
	`validated_output` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parse_task_id`) REFERENCES `parse_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_parse_items_task_order` ON `parse_items` (`parse_task_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `parse_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_asset_id` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`total_items` integer DEFAULT 0 NOT NULL,
	`completed_items` integer DEFAULT 0 NOT NULL,
	`failed_items` integer DEFAULT 0 NOT NULL,
	`pipeline_version` text NOT NULL,
	`error_code` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_asset_id`) REFERENCES `source_assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_parse_tasks_user_status` ON `parse_tasks` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `question_solutions` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`answer` text NOT NULL,
	`solution` text NOT NULL,
	`version` integer NOT NULL,
	`is_current` integer NOT NULL,
	`generated_by` text NOT NULL,
	`review_status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_solutions_question_version` ON `question_solutions` (`question_id`,`version`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_asset_id` text NOT NULL,
	`parse_item_id` text NOT NULL,
	`question_number` text,
	`stem` text NOT NULL,
	`question_type` text NOT NULL,
	`image_region` text,
	`difficulty` integer,
	`review_status` text NOT NULL,
	`user_edited` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_asset_id`) REFERENCES `source_assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parse_item_id`) REFERENCES `parse_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `review_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`learning_card_id` text NOT NULL,
	`reviewed_at` integer NOT NULL,
	`rating` text NOT NULL,
	`previous_status` text NOT NULL,
	`next_status` text NOT NULL,
	`previous_interval_days` integer NOT NULL,
	`next_interval_days` integer NOT NULL,
	`previous_due_at` integer,
	`next_due_at` integer NOT NULL,
	`scheduler_type` text NOT NULL,
	`scheduler_version` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learning_card_id`) REFERENCES `learning_cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_user_reviewed` ON `review_events` (`user_id`,`reviewed_at`);--> statement-breakpoint
CREATE TABLE `source_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`checksum` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_assets_user_created` ON `source_assets` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tags_user_name` ON `tags` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`timezone` text DEFAULT 'Asia/Shanghai' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);