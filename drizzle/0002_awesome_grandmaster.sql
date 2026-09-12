CREATE TABLE `activity_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`activity_date` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`place_name` text,
	`prefecture` text,
	`steps` integer NOT NULL,
	`created_at` text NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_activity_posts_created` ON `activity_posts` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_posts_user_date` ON `activity_posts` (`user_id`,`activity_date`);--> statement-breakpoint
CREATE TABLE `community_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`host` text NOT NULL,
	`description` text NOT NULL,
	`prefecture` text NOT NULL,
	`city` text NOT NULL,
	`starts_at` text NOT NULL,
	`capacity` integer NOT NULL,
	`link` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_community_sessions_status_start` ON `community_sessions` (`status`,`starts_at`);--> statement-breakpoint
CREATE TABLE `post_reactions` (
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`post_id`, `user_id`),
	FOREIGN KEY (`post_id`) REFERENCES `activity_posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_post_reactions_user` ON `post_reactions` (`user_id`);--> statement-breakpoint
CREATE TABLE `session_interests` (
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`session_id`, `user_id`),
	FOREIGN KEY (`session_id`) REFERENCES `community_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_session_interests_user` ON `session_interests` (`user_id`);