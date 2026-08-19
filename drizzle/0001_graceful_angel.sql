CREATE TABLE `model_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_label` text NOT NULL,
	`model` text NOT NULL,
	`base_url` text NOT NULL,
	`encrypted_api_key` text NOT NULL,
	`key_last4` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_model_configs_user` ON `model_configs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_model_configs_user_default` ON `model_configs` (`user_id`,`is_default`);