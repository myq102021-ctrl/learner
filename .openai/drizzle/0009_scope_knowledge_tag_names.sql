DROP INDEX `idx_tags_user_normalized_name`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tags_user_scope_name` ON `tags` (`user_id`,`type`,coalesce(`parent_id`,'__root__'),`normalized_name`);
