ALTER TABLE `model_configs` ADD `validation_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `model_configs` ADD `validation_error` text;--> statement-breakpoint
ALTER TABLE `model_configs` ADD `last_validated_at` integer;