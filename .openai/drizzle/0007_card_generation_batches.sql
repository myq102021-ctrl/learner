CREATE TABLE `card_generation_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`generation_key` text NOT NULL,
	`status` text NOT NULL,
	`response_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_card_generation_user_key` ON `card_generation_batches` (`user_id`,`generation_key`);
--> statement-breakpoint
CREATE INDEX `idx_card_generation_created` ON `card_generation_batches` (`created_at`);
