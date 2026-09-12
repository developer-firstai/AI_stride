CREATE TABLE `awards` (
	`id` text PRIMARY KEY NOT NULL,
	`prize_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`rank` integer NOT NULL,
	`score` integer NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`claim` text,
	`confirmed_by` text NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text,
	`received_at` text,
	FOREIGN KEY (`prize_id`) REFERENCES `prizes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_awards_prize` ON `awards` (`prize_id`);--> statement-breakpoint
CREATE INDEX `idx_awards_user` ON `awards` (`user_id`);--> statement-breakpoint
CREATE TABLE `entries` (
	`user_id` text NOT NULL,
	`month` text NOT NULL,
	`metric` text DEFAULT 'walking' NOT NULL,
	`role` text NOT NULL,
	`age_band` text NOT NULL,
	`gender` text NOT NULL,
	`prefecture` text NOT NULL,
	`region` text NOT NULL,
	`x_id` text NOT NULL,
	`x_username` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `month`, `metric`),
	FOREIGN KEY (`user_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_entries_month_metric` ON `entries` (`month`,`metric`);--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`verifier` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prizes` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`metric` text DEFAULT 'walking' NOT NULL,
	`title` text NOT NULL,
	`provider` text NOT NULL,
	`description` text NOT NULL,
	`delivery` text NOT NULL,
	`filters` text NOT NULL,
	`top_n` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`finalized_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_prizes_month_metric` ON `prizes` (`month`,`metric`);--> statement-breakpoint
CREATE TABLE `x_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`x_id` text NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`linked_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `x_accounts_x_id_unique` ON `x_accounts` (`x_id`);