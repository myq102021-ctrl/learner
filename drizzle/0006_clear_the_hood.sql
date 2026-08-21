CREATE TABLE `learning_diaries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entry_date` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_diaries_user_date` ON `learning_diaries` (`user_id`,`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_diaries_user_created` ON `learning_diaries` (`user_id`,`created_at`);